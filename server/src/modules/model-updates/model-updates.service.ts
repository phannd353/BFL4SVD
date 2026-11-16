import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TrainingJobParticipantStatus,
  TrainingJobStatus,
  TrainingRoundStatus,
} from '@prisma-generated';
import { PrismaService } from '@/infrastructure/database';
import { BlockchainService } from '../blockchain/blockchain.service';
import {
  CreateModelUpdateDto,
  UpdateModelUpdateDto,
} from './dto/model-update.dto';

@Injectable()
export class ModelUpdatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
  ) {}

  async create(
    input: CreateModelUpdateDto,
    userId: string,
    walletAddress?: string,
  ) {
    if (!walletAddress) {
      throw new ForbiddenException(
        'Link a verified wallet before submitting model updates',
      );
    }
    const roundNumber = Number(input.roundNumber);
    if (!Number.isSafeInteger(roundNumber)) {
      throw new BadRequestException('Round number is outside the safe range');
    }
    const metrics =
      input.metrics === undefined
        ? undefined
        : this.toJsonObject(input.metrics);
    let chainFailed = false;
    let chainFailure: unknown;

    try {
      const result = await this.prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw(
          Prisma.sql`SELECT "id" FROM "training_job" WHERE "id" = ${input.trainingJobId} FOR UPDATE`,
        );
        const job = await transaction.trainingJob.findUnique({
          where: { id: input.trainingJobId },
          select: {
            id: true,
            status: true,
            currentRound: true,
            plannedRounds: true,
            initialModelHash: true,
            chainJobId: true,
          },
        });
        if (!job) {
          throw new NotFoundException('Training job not found');
        }
        if (job.status !== TrainingJobStatus.RUNNING) {
          throw new ConflictException(
            'Model updates can only be submitted to a running training job',
          );
        }
        const participant = await transaction.trainingJobParticipant.findUnique(
          {
            where: {
              jobId_userId: {
                jobId: input.trainingJobId,
                userId,
              },
            },
            select: { status: true },
          },
        );
        if (participant?.status !== TrainingJobParticipantStatus.JOINED) {
          throw new ForbiddenException(
            'Join the training job before submitting model updates',
          );
        }
        if (roundNumber !== job.currentRound + 1) {
          throw new ConflictException(
            `Expected round ${job.currentRound + 1}, received ${roundNumber}`,
          );
        }
        if (job.plannedRounds !== null && roundNumber > job.plannedRounds) {
          throw new ConflictException(
            'The planned number of training rounds has already been reached',
          );
        }

        let expectedPrevModelHash = job.initialModelHash;
        if (roundNumber > 1) {
          const previousRound = await transaction.trainingJobRound.findUnique({
            where: {
              jobId_roundNumber: {
                jobId: input.trainingJobId,
                roundNumber: roundNumber - 1,
              },
            },
            select: { status: true, aggregatedModelHash: true },
          });
          if (
            previousRound?.status !== TrainingRoundStatus.COMPLETED ||
            !previousRound.aggregatedModelHash
          ) {
            throw new ConflictException(
              'The previous training round has not completed',
            );
          }
          expectedPrevModelHash = previousRound.aggregatedModelHash;
        }

        const round = await transaction.trainingJobRound.findUnique({
          where: {
            jobId_roundNumber: {
              jobId: input.trainingJobId,
              roundNumber,
            },
          },
          select: { id: true, status: true, prevModelHash: true },
        });
        if (round && round.status !== TrainingRoundStatus.RUNNING) {
          throw new ConflictException(
            'Model updates cannot be added to a completed round',
          );
        }
        if (round && round.prevModelHash !== expectedPrevModelHash) {
          throw new ConflictException(
            'Training round previous model does not match the completed lineage',
          );
        }
        const activeRound =
          round ??
          (await transaction.trainingJobRound.create({
            data: {
              jobId: input.trainingJobId,
              roundNumber,
              prevModelHash: expectedPrevModelHash,
              status: TrainingRoundStatus.RUNNING,
            },
            select: { id: true, status: true, prevModelHash: true },
          }));

        const {
          trainingJobId: _jobId,
          roundNumber: _round,
          timestamp,
          metrics: _metrics,
          ...fields
        } = input;
        if (job.chainJobId === null) {
          throw new ConflictException(
            'Training job has not been synchronized with the blockchain',
          );
        }
        const clientAddress = walletAddress.toLowerCase();
        const modelUpdateData = {
          ...fields,
          prevModelHash: activeRound.prevModelHash,
          ...(metrics !== undefined ? { metrics } : {}),
          clientAddress,
          timestamp: timestamp ? new Date(timestamp) : undefined,
          trainingRoundId: activeRound.id,
        };
        const existing = await transaction.modelUpdate.findUnique({
          where: {
            trainingRoundId_clientAddress: {
              trainingRoundId: activeRound.id,
              clientAddress,
            },
          },
        });
        if (
          existing &&
          (existing.modelHash !== modelUpdateData.modelHash ||
            existing.score !== modelUpdateData.score ||
            existing.epoch !== modelUpdateData.epoch ||
            existing.learningRate !== modelUpdateData.learningRate ||
            existing.batchSize !== modelUpdateData.batchSize ||
            existing.prevModelHash !== modelUpdateData.prevModelHash ||
            existing.accuracy !== modelUpdateData.accuracy)
        ) {
          throw new ConflictException(
            'A different model update already exists for this client and round',
          );
        }
        if (existing?.chainSyncStatus === 'CONFIRMED') {
          return existing;
        }

        const update =
          existing ??
          (await transaction.modelUpdate.create({
            data: {
              ...modelUpdateData,
              chainSyncStatus: 'PENDING',
            },
          }));
        try {
          const chainUpdate = await this.blockchain.recordModelUpdate(
            clientAddress,
            job.chainJobId,
            roundNumber,
            {
              modelHash: update.modelHash,
              score: update.score,
              epoch: update.epoch,
              learningRate: update.learningRate,
              batchSize: update.batchSize,
              prevModelHash: update.prevModelHash,
              accuracy: update.accuracy,
            },
            async (txHash) => {
              await Promise.all([
                transaction.modelUpdate.update({
                  where: { id: update.id },
                  data: {
                    chainTxHash: txHash,
                    chainSyncStatus: 'SUBMITTED',
                  },
                }),
                transaction.blockchainTransaction.upsert({
                  where: { txHash },
                  create: {
                    txHash,
                    jobId: job.id,
                    roundId: activeRound.id,
                  },
                  update: {},
                }),
              ]);
            },
            async (txHash, gasUsed) => {
              await transaction.blockchainTransaction.update({
                where: { txHash },
                data: { gasUsed },
              });
            },
          );
          return transaction.modelUpdate.update({
            where: { id: update.id },
            data: {
              chainUpdateId: chainUpdate.updateId.toString(),
              ...(chainUpdate.txHash !== null
                ? { chainTxHash: chainUpdate.txHash }
                : {}),
              chainSyncStatus: 'CONFIRMED',
            },
          });
        } catch (error) {
          await transaction.modelUpdate.update({
            where: { id: update.id },
            data: { chainSyncStatus: 'FAILED' },
          });
          chainFailed = true;
          chainFailure = error;
          return update;
        }
      });
      if (chainFailed) throw chainFailure;
      return result;
    } catch (error) {
      this.throwForConstraintError(error);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.modelUpdate.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async findOne(id: string) {
    const update = await this.prisma.modelUpdate.findUnique({ where: { id } });
    if (!update) {
      throw new NotFoundException('Model update not found');
    }
    return update;
  }

  /** Lets a participant change only its own pending update in its own job. */
  async update(
    id: string,
    input: UpdateModelUpdateDto,
    owner: { jobId: string; walletAddress: string },
  ) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    const clientAddress = owner.walletAddress.toLowerCase();
    const existing = await this.assertPending(id);
    if (
      existing.trainingRound.jobId !== owner.jobId ||
      existing.clientAddress !== clientAddress
    ) {
      throw new ForbiddenException('You can only change your own model update');
    }

    const { timestamp, metrics, ...fields } = input;
    try {
      const result = await this.prisma.modelUpdate.updateMany({
        where: {
          id,
          clientAddress,
          chainUpdateId: null,
          trainingRound: { is: { status: TrainingRoundStatus.RUNNING } },
        },
        data: {
          ...fields,
          ...(metrics !== undefined
            ? { metrics: this.toJsonObject(metrics) }
            : {}),
          ...(timestamp !== undefined
            ? { timestamp: new Date(timestamp) }
            : {}),
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Model update was finalized or changed concurrently',
        );
      }
    } catch (error) {
      this.throwForConstraintError(error);
      throw error;
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.assertPending(id);
    const result = await this.prisma.modelUpdate.deleteMany({
      where: {
        id,
        chainUpdateId: null,
        trainingRound: { is: { status: TrainingRoundStatus.RUNNING } },
      },
    });
    if (result.count !== 1) {
      throw new ConflictException(
        'Model update was finalized or changed concurrently',
      );
    }
  }

  private async assertPending(id: string) {
    const update = await this.prisma.modelUpdate.findUnique({
      where: { id },
      select: {
        id: true,
        clientAddress: true,
        chainUpdateId: true,
        trainingRound: { select: { status: true, jobId: true } },
      },
    });
    if (!update) {
      throw new NotFoundException('Model update not found');
    }
    if (update.chainUpdateId !== null) {
      throw new ConflictException(
        'Finalized model updates cannot be changed or deleted',
      );
    }
    if (update.trainingRound.status !== TrainingRoundStatus.RUNNING) {
      throw new ConflictException(
        'Model updates in a completed round cannot be changed or deleted',
      );
    }
    return update;
  }

  private throwForConstraintError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }
    if (error.code === 'P2002') {
      throw new ConflictException(
        'A model update already exists for this client and round or chain update ID',
      );
    }
    if (error.code === 'P2003') {
      throw new NotFoundException(
        'Referenced model, training job, or round not found',
      );
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Training job or round not found');
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
