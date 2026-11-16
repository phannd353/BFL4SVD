import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TrainingRoundStatus,
  TrainingJobStatus,
} from '@prisma-generated';
import { PrismaService } from '@/infrastructure/database';
import { RecordTrainingRoundDto, StartTrainingRoundDto } from './dto';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class TrainingRoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
  ) {}

  async getTrainingJobRounds(jobId: string) {
    await this.assertJobExists(jobId);
    const rounds = await this.prisma.trainingJobRound.findMany({
      where: { jobId },
      orderBy: { roundNumber: 'asc' },
      include: {
        modelUpdates: { orderBy: { createdAt: 'asc' } },
      },
    });
    return this.attachGasUsed(rounds);
  }

  async getTrainingJobMetrics(jobId: string) {
    await this.assertJobExists(jobId);
    const rounds = await this.prisma.trainingJobRound.findMany({
      where: { jobId },
      select: {
        id: true,
        roundNumber: true,
        metrics: true,
        aggregatedModelHash: true,
        chainTxHash: true,
        chainSyncStatus: true,
        createdAt: true,
      },
      orderBy: { roundNumber: 'asc' },
    });
    return (await this.attachGasUsed(rounds))
      .filter((round) => round.metrics !== null)
      .map(({ id: _id, ...round }) => round);
  }

  private async attachGasUsed<T extends { id: string }>(rounds: T[]) {
    if (rounds.length === 0) return [];
    const gasUsage = await this.prisma.blockchainTransaction.groupBy({
      by: ['roundId'],
      where: {
        roundId: { in: rounds.map((round) => round.id) },
        gasUsed: { not: null },
      },
      _sum: { gasUsed: true },
    });
    const gasByRoundId = new Map(
      gasUsage.map((usage) => [
        usage.roundId,
        usage._sum.gasUsed?.toString() ?? null,
      ]),
    );
    return rounds.map((round) => ({
      ...round,
      gasUsed: gasByRoundId.get(round.id) ?? null,
    }));
  }

  async startTrainingRound(jobId: string, input: StartTrainingRoundDto) {
    const round = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "training_job" WHERE "id" = ${jobId} FOR UPDATE`,
      );
      const job = await transaction.trainingJob.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          status: true,
          currentRound: true,
          plannedRounds: true,
          initialModelHash: true,
          chainJobId: true,
          chainTxHash: true,
          chainSyncStatus: true,
        },
      });
      if (!job) {
        throw new NotFoundException('Training job not found');
      }
      if (job.status !== TrainingJobStatus.RUNNING) {
        throw new ConflictException(
          'Training rounds can only be started for a running job',
        );
      }
      if (job.chainJobId === null || job.chainSyncStatus !== 'CONFIRMED') {
        throw new ConflictException(
          'Training job has not been synchronized with the blockchain',
        );
      }
      if (input.roundNumber !== job.currentRound + 1) {
        throw new ConflictException(
          `Expected round ${job.currentRound + 1}, received ${input.roundNumber}`,
        );
      }
      if (job.plannedRounds !== null && input.roundNumber > job.plannedRounds) {
        throw new ConflictException(
          'The planned number of training rounds has already been reached',
        );
      }

      const previousRound =
        input.roundNumber === 1
          ? null
          : await transaction.trainingJobRound.findUnique({
              where: {
                jobId_roundNumber: {
                  jobId,
                  roundNumber: input.roundNumber - 1,
                },
              },
              select: {
                status: true,
                aggregatedModelHash: true,
                chainTxHash: true,
                chainSyncStatus: true,
              },
            });
      const expectedPrevModelHash =
        input.roundNumber === 1
          ? job.initialModelHash
          : previousRound?.aggregatedModelHash;
      if (
        (input.roundNumber > 1 &&
          (previousRound?.status !== TrainingRoundStatus.COMPLETED ||
            previousRound.chainSyncStatus !== 'CONFIRMED' ||
            !previousRound.chainTxHash)) ||
        input.prevModelHash !== expectedPrevModelHash
      ) {
        throw new ConflictException(
          'Previous model hash does not match the completed round',
        );
      }

      const existing = await transaction.trainingJobRound.findUnique({
        where: {
          jobId_roundNumber: {
            jobId,
            roundNumber: input.roundNumber,
          },
        },
        include: { modelUpdates: true },
      });
      if (existing) {
        if (
          existing.status === TrainingRoundStatus.RUNNING &&
          existing.prevModelHash === input.prevModelHash
        ) {
          return existing;
        }
        throw new ConflictException('Training round already exists');
      }

      return transaction.trainingJobRound.create({
        data: {
          jobId,
          roundNumber: input.roundNumber,
          prevModelHash: input.prevModelHash,
          status: TrainingRoundStatus.RUNNING,
          chainTxHash:
            input.roundNumber === 1
              ? job.chainTxHash
              : previousRound?.chainTxHash,
          chainSyncStatus: 'CONFIRMED',
        },
        include: { modelUpdates: true },
      });
    });
    return (await this.attachGasUsed([round]))[0];
  }

  /**
   * Reports on the job's active round.
   *
   * The aggregate model only exists once the round ends, so its fields are
   * optional. With the aggregate the round is completed; without it only
   * `metrics` are stored and the round stays RUNNING.
   */
  async recordTrainingRound(jobId: string, input: RecordTrainingRoundDto) {
    const metrics =
      input.metrics === undefined
        ? undefined
        : this.toJsonObject(input.metrics);
    const aggregate = this.parseAggregate(input);
    if (!aggregate && metrics === undefined) {
      throw new BadRequestException(
        'Provide the aggregated model, round metrics, or both',
      );
    }

    let chainJobId: bigint | null = null;
    const round = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "training_job" WHERE "id" = ${jobId} FOR UPDATE`,
      );
      const job = await transaction.trainingJob.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          status: true,
          currentRound: true,
          plannedRounds: true,
          chainJobId: true,
        },
      });
      if (!job) {
        throw new NotFoundException('Training job not found');
      }
      chainJobId = job.chainJobId;
      if (input.roundNumber <= job.currentRound) {
        const completedRound = await transaction.trainingJobRound.findUnique({
          where: {
            jobId_roundNumber: { jobId, roundNumber: input.roundNumber },
          },
          include: { modelUpdates: true },
        });
        if (
          aggregate &&
          completedRound?.status === TrainingRoundStatus.COMPLETED &&
          completedRound.aggregatedModelHash === aggregate.hash
        ) {
          return completedRound;
        }
        throw new ConflictException(
          `Expected round ${job.currentRound + 1}, received ${input.roundNumber}`,
        );
      }
      if (job.status !== TrainingJobStatus.RUNNING) {
        throw new ConflictException(
          'Training rounds can only be recorded for a running job',
        );
      }
      if (input.roundNumber !== job.currentRound + 1) {
        throw new ConflictException(
          `Expected round ${job.currentRound + 1}, received ${input.roundNumber}`,
        );
      }
      if (job.plannedRounds !== null && input.roundNumber > job.plannedRounds) {
        throw new ConflictException(
          'The planned number of training rounds has already been reached',
        );
      }

      const round = await transaction.trainingJobRound.findUnique({
        where: { jobId_roundNumber: { jobId, roundNumber: input.roundNumber } },
        select: { id: true, status: true },
      });
      if (!round) {
        throw new ConflictException(
          aggregate
            ? 'The round must receive at least one model update before completion'
            : 'Training round has not been started',
        );
      }
      if (round.status !== TrainingRoundStatus.RUNNING) {
        throw new ConflictException('Training round is not running');
      }

      if (!aggregate) {
        // Metrics-only report: the aggregate is not known yet, so the round and
        // the job keep their state.
        const reported = await transaction.trainingJobRound.updateMany({
          where: { id: round.id, status: TrainingRoundStatus.RUNNING },
          data: { metrics },
        });
        if (reported.count !== 1) {
          throw new ConflictException('Training round changed concurrently');
        }
        return transaction.trainingJobRound.findUniqueOrThrow({
          where: { id: round.id },
          include: { modelUpdates: true },
        });
      }

      const updateCount = await transaction.modelUpdate.count({
        where: { trainingRoundId: round.id },
      });
      if (updateCount === 0) {
        throw new ConflictException(
          'A training round cannot be completed without model updates',
        );
      }

      await transaction.model.upsert({
        where: { hash: aggregate.hash },
        create: {
          hash: aggregate.hash,
          size: aggregate.size,
          filePath: aggregate.filePath,
        },
        update: {
          size: aggregate.size,
          filePath: aggregate.filePath,
        },
      });

      const roundUpdated = await transaction.trainingJobRound.updateMany({
        where: {
          id: round.id,
          status: TrainingRoundStatus.RUNNING,
        },
        data: {
          status: TrainingRoundStatus.COMPLETED,
          completedAt: new Date(),
          aggregatedModelHash: aggregate.hash,
          ...(metrics !== undefined ? { metrics } : {}),
        },
      });
      if (roundUpdated.count !== 1) {
        throw new ConflictException('Training round changed concurrently');
      }

      const isComplete =
        job.plannedRounds !== null && input.roundNumber === job.plannedRounds;
      const updated = await transaction.trainingJob.updateMany({
        where: {
          id: jobId,
          status: TrainingJobStatus.RUNNING,
          currentRound: job.currentRound,
        },
        data: {
          currentRound: input.roundNumber,
          ...(isComplete
            ? {
                finalModelHash: aggregate.hash,
                status: TrainingJobStatus.COMPLETED,
              }
            : {}),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'Training job changed while recording round',
        );
      }
      await transaction.trainingJobLog.create({
        data: {
          jobId,
          message: isComplete
            ? `Training round ${input.roundNumber} completed; training job completed`
            : `Training round ${input.roundNumber} completed`,
        },
      });
      return transaction.trainingJobRound.findUniqueOrThrow({
        where: { id: round.id },
        include: { modelUpdates: true },
      });
    });

    if (!aggregate) return (await this.attachGasUsed([round]))[0];
    if (chainJobId === null) {
      await Promise.all([
        this.prisma.trainingJob.update({
          where: { id: jobId },
          data: { chainSyncStatus: 'FAILED' },
        }),
        this.prisma.trainingJobRound.update({
          where: { id: round.id },
          data: { chainSyncStatus: 'FAILED' },
        }),
        this.prisma.model.update({
          where: { hash: aggregate.hash },
          data: { chainSyncStatus: 'FAILED' },
        }),
      ]);
      throw new ConflictException(
        'Training job has not been synchronized with the blockchain',
      );
    }

    try {
      const txHash = await this.blockchain.completeTrainingRound(
        chainJobId,
        input.roundNumber,
        aggregate.hash,
        async (submittedHash) => {
          await Promise.all([
            this.prisma.trainingJob.update({
              where: { id: jobId },
              data: {
                chainTxHash: submittedHash,
                chainSyncStatus: 'SUBMITTED',
              },
            }),
            this.prisma.trainingJobRound.update({
              where: { id: round.id },
              data: {
                chainTxHash: submittedHash,
                chainSyncStatus: 'SUBMITTED',
              },
            }),
            this.prisma.model.update({
              where: { hash: aggregate.hash },
              data: {
                chainTxHash: submittedHash,
                chainSyncStatus: 'SUBMITTED',
              },
            }),
            this.prisma.blockchainTransaction.upsert({
              where: { txHash: submittedHash },
              create: {
                txHash: submittedHash,
                jobId,
                roundId: round.id,
              },
              update: {},
            }),
          ]);
        },
        async (txHash, gasUsed) => {
          await this.prisma.blockchainTransaction.update({
            where: { txHash },
            data: { gasUsed },
          });
        },
      );
      await Promise.all([
        this.prisma.trainingJob.update({
          where: { id: jobId },
          data: {
            ...(txHash !== null ? { chainTxHash: txHash } : {}),
            chainSyncStatus: 'CONFIRMED',
          },
        }),
        this.prisma.trainingJobRound.update({
          where: { id: round.id },
          data: {
            ...(txHash !== null ? { chainTxHash: txHash } : {}),
            chainSyncStatus: 'CONFIRMED',
          },
        }),
        this.prisma.model.update({
          where: { hash: aggregate.hash },
          data: {
            ...(txHash !== null ? { chainTxHash: txHash } : {}),
            chainSyncStatus: 'CONFIRMED',
          },
        }),
      ]);
    } catch (error) {
      await Promise.all([
        this.prisma.trainingJob.update({
          where: { id: jobId },
          data: { chainSyncStatus: 'FAILED' },
        }),
        this.prisma.trainingJobRound.update({
          where: { id: round.id },
          data: { chainSyncStatus: 'FAILED' },
        }),
        this.prisma.model.update({
          where: { hash: aggregate.hash },
          data: { chainSyncStatus: 'FAILED' },
        }),
      ]);
      throw error;
    }
    const completedRound = await this.prisma.trainingJobRound.findUniqueOrThrow(
      {
        where: { id: round.id },
        include: { modelUpdates: true },
      },
    );
    return (await this.attachGasUsed([completedRound]))[0];
  }

  /** The aggregate is all-or-nothing: hash, size and file path go together. */
  private parseAggregate(input: RecordTrainingRoundDto) {
    const {
      aggregatedModelHash: hash,
      aggregatedModelSize: size,
      aggregatedModelFilePath: filePath,
    } = input;
    if (hash == null && size == null && filePath == null) return null;
    if (hash == null || size == null || filePath == null) {
      throw new BadRequestException(
        'aggregatedModelHash, aggregatedModelSize and aggregatedModelFilePath must be provided together',
      );
    }
    return { hash, size, filePath };
  }

  private async assertJobExists(jobId: string) {
    const job = await this.prisma.trainingJob.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) {
      throw new NotFoundException('Training job not found');
    }
  }

  private toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
    if (
      value === null ||
      Array.isArray(value) ||
      typeof value !== 'object' ||
      Object.getPrototypeOf(value) !== Object.prototype
    ) {
      throw new BadRequestException('Metrics must be a JSON object');
    }

    const isJsonValue = (item: unknown): boolean => {
      if (
        item === null ||
        typeof item === 'string' ||
        typeof item === 'boolean'
      ) {
        return true;
      }
      if (typeof item === 'number') {
        return Number.isFinite(item);
      }
      if (Array.isArray(item)) {
        return item.every(isJsonValue);
      }
      if (typeof item === 'object') {
        return (
          Object.getPrototypeOf(item) === Object.prototype &&
          Object.values(item).every(isJsonValue)
        );
      }
      return false;
    };

    if (!isJsonValue(value)) {
      throw new BadRequestException('Metrics must contain only JSON values');
    }
    return value as Prisma.InputJsonObject;
  }
}
