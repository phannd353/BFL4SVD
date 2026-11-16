import { Injectable, Logger } from '@nestjs/common';
import { TrainingJobsService } from './training-jobs.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/infrastructure/database';
import { TrainingJobStatus, TrainingJob } from '@prisma-generated';
import { spawn } from 'node:child_process';
import { ConfigService } from '@/common';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class TrainingJobWorker {
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly blockchain: BlockchainService,
    private readonly trainingJobs: TrainingJobsService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processScheduledTrainingJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      await this.processScheduledJobs();
    } catch (error) {
      this.logger.error(
        'Failed to process scheduled training jobs',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isProcessing = false;
    }
  }

  async processScheduledJobs() {
    const now = new Date();
    const dueToPublish = await this.prisma.trainingJob.findMany({
      where: {
        status: TrainingJobStatus.DRAFT,
        publishedAt: null,
        publishAt: { lte: now },
      },
      select: { id: true },
    });

    for (const job of dueToPublish) {
      try {
        const published = await this.prisma.trainingJob.updateMany({
          where: {
            id: job.id,
            status: TrainingJobStatus.DRAFT,
            publishedAt: null,
            publishAt: { lte: now },
          },
          data: { status: TrainingJobStatus.WAITING, publishedAt: now },
        });
        if (published.count === 1) {
          await this.prisma.trainingJobLog.create({
            data: { jobId: job.id, message: 'Training job published' },
          });
        }
      } catch (error) {
        await this.markScheduledJobFailed(
          job.id,
          TrainingJobStatus.DRAFT,
          'Scheduled publication failed',
          error,
        );
      }
    }

    const dueToStart = await this.prisma.trainingJob.findMany({
      where: {
        status: TrainingJobStatus.WAITING,
        publishedAt: { not: null },
        startAt: { lte: now },
      },
    });

    for (const job of dueToStart) {
      try {
        const started = await this.prisma.trainingJob.updateMany({
          where: {
            id: job.id,
            status: TrainingJobStatus.WAITING,
            publishedAt: { not: null },
            startAt: { lte: now },
          },
          data: { status: TrainingJobStatus.RUNNING, startedAt: now },
        });

        if (started.count !== 1) continue;

        try {
          if (job.chainJobId === null) {
            throw new Error(
              'Training job has not been synchronized to the chain',
            );
          }
          const txHash = await this.blockchain.syncTrainingJobStatus(
            job.chainJobId,
            TrainingJobStatus.RUNNING,
            async (submittedHash) => {
              await this.prisma.trainingJob
                .update({
                  where: { id: job.id },
                  data: {
                    chainTxHash: submittedHash,
                    chainSyncStatus: 'SUBMITTED',
                  },
                })
                .then(() =>
                  this.trainingJobs.recordBlockchainTransactionSubmission(
                    job.id,
                    submittedHash,
                  ),
                );
            },
            (txHash, gasUsed) =>
              this.trainingJobs
                .recordBlockchainTransactionGasUsed(txHash, gasUsed)
                .then(() => undefined),
          );
          await this.prisma.trainingJob.update({
            where: { id: job.id },
            data: {
              ...(txHash !== null ? { chainTxHash: txHash } : {}),
              chainSyncStatus: 'CONFIRMED',
            },
          });
        } catch (error) {
          await this.prisma.trainingJob.update({
            where: { id: job.id },
            data: { chainSyncStatus: 'FAILED' },
          });
          throw error;
        }
        await this.startFlowerRun(job);
      } catch (error) {
        await this.markScheduledJobFailed(
          job.id,
          TrainingJobStatus.RUNNING,
          'Flower training process failed',
          error,
        );
        continue;
      }

      try {
        await this.prisma.trainingJobLog.create({
          data: {
            jobId: job.id,
            message: 'Flower training process launched automatically',
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to log Flower process launch for training job ${job.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    const jobsToReconcile = await this.prisma.trainingJob.findMany({
      where: {
        chainSyncStatus: { in: ['PENDING', 'SUBMITTED', 'FAILED'] },
        status: {
          notIn: [TrainingJobStatus.COMPLETED, TrainingJobStatus.FAILED],
        },
      },
      select: { id: true },
    });
    for (const job of jobsToReconcile) {
      try {
        await this.trainingJobs.reconcileChain(job.id);
      } catch (error) {
        this.logger.error(
          `Failed to reconcile blockchain state for training job ${job.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    try {
      await this.trainingJobs.reconcilePendingBlockchainTransactionGas();
    } catch (error) {
      this.logger.error(
        'Failed to reconcile blockchain transaction gas usage',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private startFlowerRun(job: TrainingJob) {
    const args = [
      'run',
      this.config.get('flwrAppPath'),
      this.config.get('flwrSuperlinkEnv'),
      '--run-config',
      this.buildRunConfig(job),
    ];

    return new Promise<void>((resolve, reject) => {
      let launched = false;
      let failureHandled = false;
      const handleFailure = (error: Error) => {
        if (!launched) {
          reject(error);
          return;
        }
        if (failureHandled) return;
        failureHandled = true;
        void this.markScheduledJobFailed(
          job.id,
          TrainingJobStatus.RUNNING,
          'Flower training process failed',
          error,
        ).catch((failureError: unknown) => {
          this.logger.error(
            `Failed to mark training job ${job.id} as failed`,
            failureError instanceof Error
              ? failureError.stack
              : String(failureError),
          );
        });
      };

      this.logger.debug(
        `Launching Flower process for training job ${job.id} with args: ${args.join(' ')}`,
      );
      const child = spawn(this.config.get('flwrBinPath'), args, {
        env: process.env,
        stdio: 'ignore',
      });
      child.once('spawn', () => {
        launched = true;
        resolve();
      });
      child.once('error', handleFailure);
      child.once('close', (code, signal) => {
        if (code !== 0) {
          handleFailure(
            new Error(
              `Flower process exited with code ${code ?? `signal ${signal}`}`,
            ),
          );
        }
      });
    });
  }

  private async markScheduledJobFailed(
    id: string,
    from:
      | typeof TrainingJobStatus.DRAFT
      | typeof TrainingJobStatus.WAITING
      | typeof TrainingJobStatus.RUNNING,
    reason: string,
    error: unknown,
  ) {
    if (from === TrainingJobStatus.RUNNING) {
      const job = await this.prisma.trainingJob.findUnique({
        where: { id },
        select: { status: true, chainJobId: true },
      });
      if (job?.status === TrainingJobStatus.RUNNING && job.chainJobId != null) {
        try {
          const txHash = await this.blockchain.syncTrainingJobStatus(
            job.chainJobId,
            TrainingJobStatus.STOPPED,
            async (submittedHash) => {
              await Promise.all([
                this.prisma.trainingJob.update({
                  where: { id },
                  data: {
                    chainTxHash: submittedHash,
                    chainSyncStatus: 'SUBMITTED',
                  },
                }),
                this.trainingJobs.recordBlockchainTransactionSubmission(
                  id,
                  submittedHash,
                ),
              ]);
            },
            (txHash, gasUsed) =>
              this.trainingJobs
                .recordBlockchainTransactionGasUsed(txHash, gasUsed)
                .then(() => undefined),
          );
          await this.prisma.trainingJob.update({
            where: { id },
            data: {
              ...(txHash !== null ? { chainTxHash: txHash } : {}),
              chainSyncStatus: 'CONFIRMED',
            },
          });
        } catch (syncError) {
          await this.prisma.trainingJob.update({
            where: { id },
            data: { chainSyncStatus: 'FAILED' },
          });
          this.logger.error(
            `Failed to stop on-chain training job ${id} after run failure`,
            syncError instanceof Error ? syncError.stack : String(syncError),
          );
        }
      }
    }

    Logger.error(
      `Scheduled training job ${id} failed: ${reason}`,
      error instanceof Error ? error.stack : String(error),
      TrainingJobsService.name,
    );
    const failed = await this.prisma.trainingJob.updateMany({
      where: { id, status: from },
      data: { status: 'FAILED', failureReason: reason },
    });
    if (failed.count === 1) {
      await this.prisma.trainingJobLog.create({
        data: { jobId: id, message: reason },
      });
    }
  }

  private buildRunConfig(job: TrainingJob) {
    // Build the run configuration for Flower based on the job details
    return [
      `batch-size=${job.batchSize}`,
      `rounds=${job.plannedRounds}`,
      `learning-rate=${job.learningRate}`,
      `local-epochs=${job.epochs}`,
      `training-job-id="${job.id}"`,
      `initial-model-hash="${job.initialModelHash}"`,
      `api-endpoint="${this.config.get('serverUrl')}"`,
    ].join(' ');
  }
}
