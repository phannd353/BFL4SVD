import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  TrainingJobStatus,
  TrainingJobParticipantStatus,
  TrainingRoundStatus,
} from '@prisma-generated';
import { PrismaService } from '@/infrastructure/database';
import { CreateTrainingJobDto, UpdateTrainingJobDto } from './dto';
import { ConfigService } from '@/common';
import { AuthService } from '../auth/auth.service';
import { FL_JOIN_DEFAULTS, FL_JOINABLE_JOB_STATUSES } from './constants';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class TrainingJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly blockchain: BlockchainService,
  ) {}

  async createTrainingJob(userId: string, input: CreateTrainingJobDto) {
    const publishAt = new Date(input.publishAt);
    const startAt = new Date(input.startAt);
    this.assertValidSchedule(publishAt, startAt);

    const job = await this.prisma.trainingJob.create({
      data: {
        ...input,
        publishAt,
        startAt,
        createdById: userId,
        logs: {
          create: {
            message: `Training job created; scheduled to publish at ${publishAt.toISOString()} and start at ${startAt.toISOString()}`,
          },
        },
      },
    });
    return this.syncTrainingJob(job);
  }

  async updateTrainingJob(id: string, input: UpdateTrainingJobDto) {
    const job = await this.getTrainingJobById(id);
    if (job.status !== TrainingJobStatus.DRAFT || job.publishedAt) {
      throw new ConflictException(
        'Published training job configuration cannot be changed',
      );
    }

    const publishAt = input.publishAt
      ? new Date(input.publishAt)
      : job.publishAt;
    const startAt = input.startAt ? new Date(input.startAt) : job.startAt;
    if (!startAt) {
      throw new BadRequestException('A start time is required');
    }
    this.assertValidSchedule(publishAt, startAt);

    const {
      publishAt: _publishAt,
      startAt: _startAt,
      ...configuration
    } = input;
    const updated = await this.prisma.trainingJob.updateMany({
      where: {
        id,
        status: TrainingJobStatus.DRAFT,
        publishedAt: null,
        publishAt: { gt: new Date() },
      },
      data: { ...configuration, publishAt, startAt },
    });
    if (updated.count !== 1) {
      throw new ConflictException(
        'Training job has been published or changed concurrently',
      );
    }
    await this.prisma.trainingJobLog.create({
      data: { jobId: id, message: 'Training job configuration updated' },
    });
    const updatedJob = await this.prisma.trainingJob.findUniqueOrThrow({
      where: { id },
    });
    return this.syncTrainingJob(updatedJob);
  }

  async finalizeTrainingJobById(id: string, finalModelHash: string) {
    const job = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "training_job" WHERE "id" = ${id} FOR UPDATE`,
      );
      const job = await transaction.trainingJob.findUnique({
        where: { id },
        select: { id: true, status: true, finalModelHash: true },
      });
      if (!job) {
        throw new NotFoundException('Training job not found');
      }
      if (
        job.status === TrainingJobStatus.COMPLETED &&
        job.finalModelHash === finalModelHash
      ) {
        return transaction.trainingJob.findUniqueOrThrow({ where: { id } });
      }
      if (job.status !== TrainingJobStatus.RUNNING) {
        throw new ConflictException(
          'Only a running training job can be finalized',
        );
      }

      const model = await transaction.model.findUnique({
        where: { hash: finalModelHash },
        select: { hash: true },
      });
      if (!model) {
        throw new NotFoundException('Final model not found');
      }

      const updated = await transaction.trainingJob.updateMany({
        where: { id, status: TrainingJobStatus.RUNNING },
        data: {
          finalModelHash,
          status: TrainingJobStatus.COMPLETED,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Training job changed concurrently');
      }
      await transaction.trainingJobLog.create({
        data: {
          jobId: id,
          message: `Training job completed with final model ${finalModelHash}`,
        },
      });
      return transaction.trainingJob.findUniqueOrThrow({ where: { id } });
    });
    return (await this.attachGasUsed([job]))[0];
  }

  async deleteTrainingJob(id: string) {
    const job = await this.getTrainingJobById(id);
    if (job.chainJobId != null) {
      await this.syncChainAction(job, TrainingJobStatus.CANCELLED);
    }
    const deleted = await this.prisma.trainingJob.deleteMany({
      where: {
        id,
        status: TrainingJobStatus.DRAFT,
        publishedAt: null,
        publishAt: { gt: new Date() },
      },
    });
    if (deleted.count !== 1) {
      const job = await this.getTrainingJobById(id);
      if (job.status !== TrainingJobStatus.DRAFT || job.publishedAt) {
        throw new ConflictException(
          'Published training jobs cannot be deleted',
        );
      }
      throw new ConflictException(
        'Training job is due to be published and cannot be deleted',
      );
    }
  }

  async getAllTrainingJobs(includeDrafts = true) {
    const jobs = await this.prisma.trainingJob.findMany({
      where: includeDrafts
        ? undefined
        : { status: { not: TrainingJobStatus.DRAFT } },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachGasUsed(jobs);
  }

  async getTrainingJobById(id: string, includeDrafts = true) {
    const job = await this.prisma.trainingJob.findUnique({
      where: { id },
    });
    if (!job || (!includeDrafts && job.status === TrainingJobStatus.DRAFT)) {
      throw new NotFoundException('Training job not found');
    }
    return (await this.attachGasUsed([job]))[0];
  }

  private async attachGasUsed<T extends { id: string }>(jobs: T[]) {
    if (jobs.length === 0) return [];
    const gasUsage = await this.prisma.blockchainTransaction.groupBy({
      by: ['jobId'],
      where: {
        jobId: { in: jobs.map((job) => job.id) },
        gasUsed: { not: null },
      },
      _sum: { gasUsed: true },
    });
    const gasByJobId = new Map(
      gasUsage.map((usage) => [
        usage.jobId,
        usage._sum.gasUsed?.toString() ?? null,
      ]),
    );
    return jobs.map((job) => ({
      ...job,
      gasUsed: gasByJobId.get(job.id) ?? null,
    }));
  }

  async reconcileChain(id: string) {
    let job = await this.getTrainingJobById(id);
    if (
      job.status === TrainingJobStatus.FAILED ||
      job.status === TrainingJobStatus.COMPLETED
    ) {
      return job;
    }

    if (
      job.chainJobId == null ||
      job.status === TrainingJobStatus.DRAFT ||
      job.status === TrainingJobStatus.WAITING
    ) {
      job = await this.syncTrainingJob(job);
    }

    if (
      job.status === TrainingJobStatus.RUNNING ||
      job.status === TrainingJobStatus.STOPPED ||
      job.status === TrainingJobStatus.CANCELLED
    ) {
      return this.syncChainAction(job, job.status);
    }
    return job;
  }

  recordBlockchainTransactionSubmission(
    jobId: string,
    txHash: string,
    roundId?: string,
  ) {
    return this.prisma.blockchainTransaction.upsert({
      where: { txHash },
      create: { txHash, jobId, ...(roundId ? { roundId } : {}) },
      update: {},
    });
  }

  recordBlockchainTransactionGasUsed(txHash: string, gasUsed: bigint) {
    return this.prisma.blockchainTransaction.update({
      where: { txHash },
      data: { gasUsed },
    });
  }

  async reconcilePendingBlockchainTransactionGas() {
    const transactions = await this.prisma.blockchainTransaction.findMany({
      where: { gasUsed: null },
      select: { txHash: true },
    });
    for (const transaction of transactions) {
      const gasUsed = await this.blockchain.getTransactionGasUsed(
        transaction.txHash,
      );
      if (gasUsed !== null) {
        await this.recordBlockchainTransactionGasUsed(
          transaction.txHash,
          gasUsed,
        );
      }
    }
  }

  async getTrainingJobStatus(id: string) {
    const job = await this.getTrainingJobById(id);
    return {
      id: job.id,
      status: job.status,
      currentRound: job.currentRound,
      plannedRounds: job.plannedRounds,
      updatedAt: job.updatedAt,
    };
  }

  async getTrainingJobLogs(id: string) {
    await this.assertJobExists(id);
    return this.prisma.trainingJobLog.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async startTrainingJob(id: string) {
    const job = await this.getTrainingJobById(id);
    if (!job.publishedAt || (job.startAt && job.startAt > new Date())) {
      throw new ConflictException(
        'Training job cannot start before its scheduled start time',
      );
    }
    const startedJob = await this.changeStatus(
      id,
      [TrainingJobStatus.WAITING, TrainingJobStatus.STOPPED],
      TrainingJobStatus.RUNNING,
    );
    return this.syncChainAction(startedJob, TrainingJobStatus.RUNNING);
  }

  async cancelTrainingJob(id: string) {
    const job = await this.prisma.$transaction(async (transaction) => {
      const job = await transaction.trainingJob.findUnique({
        where: { id },
        select: { id: true, status: true, startAt: true, startedAt: true },
      });
      if (!job) {
        throw new NotFoundException('Training job not found');
      }
      if (
        job.status !== TrainingJobStatus.WAITING ||
        job.startedAt ||
        !job.startAt ||
        job.startAt <= new Date()
      ) {
        throw new ConflictException(
          'Only a waiting training job can be cancelled before its start time',
        );
      }

      const cancelled = await transaction.trainingJob.updateMany({
        where: {
          id,
          status: TrainingJobStatus.WAITING,
          startedAt: null,
          startAt: { gt: new Date() },
        },
        data: { status: TrainingJobStatus.CANCELLED },
      });
      if (cancelled.count !== 1) {
        throw new ConflictException('Training job status changed concurrently');
      }
      await transaction.trainingJobLog.create({
        data: {
          jobId: id,
          message: 'Training job cancelled by an administrator',
        },
      });
      return transaction.trainingJob.findUniqueOrThrow({ where: { id } });
    });
    return this.syncChainAction(job, TrainingJobStatus.CANCELLED);
  }

  async stopTrainingJob(id: string, reason: string) {
    const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
    if (!normalizedReason) {
      throw new BadRequestException('A stopping reason is required');
    }
    const job = await this.changeStatus(
      id,
      [TrainingJobStatus.RUNNING],
      TrainingJobStatus.STOPPED,
      normalizedReason,
    );
    return this.syncChainAction(job, TrainingJobStatus.STOPPED);
  }

  async getParticipantsByTrainingJobId(id: string) {
    await this.assertJobExists(id);
    const participants = await this.prisma.trainingJobParticipant.findMany({
      where: { jobId: id, status: TrainingJobParticipantStatus.JOINED },
      orderBy: { joinedAt: 'asc' },
      select: {
        joinedAt: true,
        user: {
          select: { id: true, name: true, image: true, walletAddress: true },
        },
      },
    });
    return participants;
  }

  async joinTrainingJob(id: string, userId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "training_job" WHERE "id" = ${id} FOR UPDATE`,
      );
      const job = await transaction.trainingJob.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          publishedAt: true,
          startAt: true,
          startedAt: true,
        },
      });
      if (!job) {
        throw new NotFoundException('Training job not found');
      }
      const now = new Date();
      if (
        job.status !== TrainingJobStatus.WAITING ||
        !job.publishedAt ||
        job.publishedAt > now ||
        (job.startAt !== null && job.startAt <= now) ||
        job.startedAt
      ) {
        throw new ConflictException(
          'This training job is not accepting participants',
        );
      }

      const membership = await transaction.trainingJobParticipant.findUnique({
        where: { jobId_userId: { jobId: id, userId } },
        select: { status: true },
      });
      if (membership?.status === TrainingJobParticipantStatus.JOINED) {
        throw new ConflictException('User has already joined this job');
      }

      await transaction.trainingJobParticipant.upsert({
        where: { jobId_userId: { jobId: id, userId } },
        create: { jobId: id, userId },
        update: {
          status: TrainingJobParticipantStatus.JOINED,
          joinedAt: new Date(),
          leftAt: null,
        },
      });
      await transaction.trainingJobLog.create({
        data: { jobId: id, message: `User ${userId} joined the job` },
      });

      return { jobId: id, userId, status: TrainingJobParticipantStatus.JOINED };
    });
  }

  async leaveTrainingJob(id: string, userId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "training_job" WHERE "id" = ${id} FOR UPDATE`,
      );
      const job = await transaction.trainingJob.findUnique({
        where: { id },
        select: { id: true, status: true, startedAt: true, startAt: true },
      });
      if (!job) {
        throw new NotFoundException('Training job not found');
      }
      if (
        job.status !== TrainingJobStatus.WAITING ||
        job.startedAt ||
        (job.startAt !== null && job.startAt <= new Date())
      ) {
        throw new ConflictException(
          'Participants can only leave a waiting job before it starts',
        );
      }

      const result = await transaction.trainingJobParticipant.updateMany({
        where: {
          jobId: id,
          userId,
          status: TrainingJobParticipantStatus.JOINED,
        },
        data: { status: TrainingJobParticipantStatus.LEFT, leftAt: new Date() },
      });
      if (result.count === 0) {
        throw new ConflictException('User is not participating in this job');
      }

      await transaction.trainingJobLog.create({
        data: { jobId: id, message: `User ${userId} left the job` },
      });
      return { jobId: id, userId, status: TrainingJobParticipantStatus.LEFT };
    });
  }

  /**
   * Issues the participant's FL credential and the connection settings the web
   * UI needs to assemble the SuperNode/SuperExec `docker run` commands.
   *
   * The dataset directory and SuperNode port are chosen by the participant in
   * the browser, so no local path is ever sent to or stored by the API. A fresh
   * token is issued on every call and must never be logged.
   */
  async getJoinConfig(id: string, userId: string) {
    const participant = await this.prisma.trainingJobParticipant.findUnique({
      where: { jobId_userId: { jobId: id, userId } },
      select: { status: true },
    });
    if (
      !participant ||
      participant.status !== TrainingJobParticipantStatus.JOINED
    ) {
      throw new ConflictException('User is not participating in this job');
    }

    const job = await this.getTrainingJobById(id);
    if (
      !(FL_JOINABLE_JOB_STATUSES as readonly TrainingJobStatus[]).includes(
        job.status,
      )
    ) {
      throw new ConflictException(
        'Training job is not accepting Flower clients',
      );
    }

    const { token, expiresAt } = await this.authService.issueTrainingAuthToken(
      userId,
      id,
    );

    return {
      jobId: id,
      authToken: token,
      expiresAt,
      superlinkAddress: this.config.get('flwrSuperlinkEndpoint'),
      supernodeImage: this.config.get('flwrSupernodeImage'),
      superexecImage: this.config.get('flwrSuperexecImage'),
      defaultSupernodePort: FL_JOIN_DEFAULTS.supernodePort,
      datasetContainerPath: FL_JOIN_DEFAULTS.datasetContainerPath,
    };
  }

  private async changeStatus(
    id: string,
    from: (
      | typeof TrainingJobStatus.DRAFT
      | typeof TrainingJobStatus.WAITING
      | typeof TrainingJobStatus.STOPPED
      | typeof TrainingJobStatus.RUNNING
    )[],
    to: typeof TrainingJobStatus.RUNNING | typeof TrainingJobStatus.STOPPED,
    stoppingReason?: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const job = await transaction.trainingJob.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          startedAt: true,
          currentRound: true,
        },
      });
      if (!job) {
        throw new NotFoundException('Training job not found');
      }

      if (!new Set<string>(from).has(job.status)) {
        throw new ConflictException(
          `Cannot change training job from ${job.status} to ${to}`,
        );
      }

      const updated = await transaction.trainingJob.updateMany({
        where: { id, status: { in: from } },
        data: {
          status: to,
          ...(to === TrainingJobStatus.RUNNING && !job.startedAt
            ? { startedAt: new Date() }
            : {}),
          ...(stoppingReason ? { stoppingReason } : {}),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Training job status changed concurrently');
      }

      if (to === TrainingJobStatus.STOPPED) {
        await transaction.trainingJobRound.updateMany({
          where: {
            jobId: id,
            roundNumber: job.currentRound + 1,
            status: TrainingRoundStatus.RUNNING,
          },
          data: { status: TrainingRoundStatus.STOPPED },
        });
      } else if (
        to === TrainingJobStatus.RUNNING &&
        job.status === TrainingJobStatus.STOPPED
      ) {
        await transaction.trainingJobRound.updateMany({
          where: {
            jobId: id,
            roundNumber: job.currentRound + 1,
            status: TrainingRoundStatus.STOPPED,
          },
          data: { status: TrainingRoundStatus.RUNNING },
        });
      }

      await transaction.trainingJobLog.create({
        data: {
          jobId: id,
          message: stoppingReason
            ? `Training job stopped: ${stoppingReason}`
            : `Training job ${to.toLowerCase()}`,
        },
      });
      return transaction.trainingJob.findUniqueOrThrow({ where: { id } });
    });
  }

  private async syncTrainingJob(job: {
    id: string;
    name: string;
    initialModelHash: string;
    plannedRounds: number;
    chainJobId: bigint | null;
  }) {
    try {
      let chainJobId = job.chainJobId;
      let txHash: string | null;
      const onSubmitted = async (submittedHash: string) => {
        await Promise.all([
          this.prisma.trainingJob.update({
            where: { id: job.id },
            data: {
              chainTxHash: submittedHash,
              chainSyncStatus: 'SUBMITTED',
            },
          }),
          this.recordBlockchainTransactionSubmission(job.id, submittedHash),
          this.prisma.model.update({
            where: { hash: job.initialModelHash },
            data: {
              chainTxHash: submittedHash,
              chainSyncStatus: 'SUBMITTED',
            },
          }),
        ]);
      };
      const onMined = (txHash: string, gasUsed: bigint) =>
        this.recordBlockchainTransactionGasUsed(txHash, gasUsed).then(
          () => undefined,
        );
      if (chainJobId == null) {
        const created = await this.blockchain.createTrainingJob(
          job.id,
          job.name,
          job.initialModelHash,
          job.plannedRounds,
          onSubmitted,
          onMined,
        );
        chainJobId = created.jobId;
        txHash = created.txHash;
      } else {
        txHash = await this.blockchain.updateTrainingJob(
          chainJobId,
          job.name,
          job.initialModelHash,
          job.plannedRounds,
          onSubmitted,
          onMined,
        );
      }

      const syncedJob = await this.prisma.trainingJob.update({
        where: { id: job.id },
        data: {
          chainJobId,
          ...(txHash !== null ? { chainTxHash: txHash } : {}),
          chainSyncStatus: 'CONFIRMED',
        },
      });
      await this.prisma.model.update({
        where: { hash: job.initialModelHash },
        data: {
          ...(txHash !== null ? { chainTxHash: txHash } : {}),
          chainSyncStatus: 'CONFIRMED',
        },
      });
      return (await this.attachGasUsed([syncedJob]))[0];
    } catch (error) {
      await this.prisma.trainingJob.update({
        where: { id: job.id },
        data: { chainSyncStatus: 'FAILED' },
      });
      await this.prisma.model.update({
        where: { hash: job.initialModelHash },
        data: { chainSyncStatus: 'FAILED' },
      });
      throw error;
    }
  }

  private async syncChainAction(
    job: { id: string; chainJobId: bigint | null },
    status:
      | typeof TrainingJobStatus.RUNNING
      | typeof TrainingJobStatus.STOPPED
      | typeof TrainingJobStatus.CANCELLED,
  ) {
    if (job.chainJobId == null) {
      throw new ConflictException(
        'Training job has not been synchronized with the blockchain',
      );
    }

    try {
      const onSubmitted = async (txHash: string) => {
        await Promise.all([
          this.prisma.trainingJob.update({
            where: { id: job.id },
            data: { chainTxHash: txHash, chainSyncStatus: 'SUBMITTED' },
          }),
          this.recordBlockchainTransactionSubmission(job.id, txHash),
        ]);
      };
      const onMined = (txHash: string, gasUsed: bigint) =>
        this.recordBlockchainTransactionGasUsed(txHash, gasUsed).then(
          () => undefined,
        );
      const txHash = await this.blockchain.syncTrainingJobStatus(
        job.chainJobId,
        status,
        onSubmitted,
        onMined,
      );
      const syncedJob = await this.prisma.trainingJob.update({
        where: { id: job.id },
        data: {
          ...(txHash !== null ? { chainTxHash: txHash } : {}),
          chainSyncStatus: 'CONFIRMED',
        },
      });
      return (await this.attachGasUsed([syncedJob]))[0];
    } catch (error) {
      await this.prisma.trainingJob.update({
        where: { id: job.id },
        data: { chainSyncStatus: 'FAILED' },
      });
      throw error;
    }
  }

  private assertValidSchedule(publishAt: Date, startAt: Date) {
    if (Number.isNaN(publishAt.getTime()) || Number.isNaN(startAt.getTime())) {
      throw new BadRequestException(
        'Publication and start times must be valid',
      );
    }
    if (publishAt < new Date()) {
      throw new BadRequestException('Publication time must be in the future');
    }
    if (startAt <= publishAt) {
      throw new BadRequestException(
        'Start time must be after the publication time',
      );
    }
  }

  private async assertJobExists(
    id: string,
    transaction: Prisma.TransactionClient = this.prisma,
  ) {
    const job = await transaction.trainingJob.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!job) {
      throw new NotFoundException('Training job not found');
    }
  }
}
