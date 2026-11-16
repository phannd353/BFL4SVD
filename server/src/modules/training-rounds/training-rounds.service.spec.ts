import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@/infrastructure/database';
import { RecordTrainingRoundDto } from './dto';
import { TrainingRoundsService } from './training-rounds.service';

describe('TrainingRoundsService', { tags: ['unit', 'training-rounds'] }, () => {
  const mocks = {
    trainingJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    trainingJobLog: { create: vi.fn() },
    trainingJobRound: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    blockchainTransaction: {
      groupBy: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    model: { upsert: vi.fn(), update: vi.fn() },
    modelUpdate: { count: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  const prisma = mocks as unknown as PrismaService;
  const blockchain = { completeTrainingRound: vi.fn() };
  let service: TrainingRoundsService;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.$queryRaw.mockResolvedValue([]);
    mocks.trainingJobLog.create.mockResolvedValue({});
    mocks.blockchainTransaction.groupBy.mockResolvedValue([]);
    mocks.trainingJob.update.mockResolvedValue({});
    mocks.trainingJobRound.findUnique.mockResolvedValue({
      id: 'round-1',
      status: 'RUNNING',
    });
    mocks.trainingJobRound.updateMany.mockResolvedValue({ count: 1 });
    mocks.trainingJobRound.update.mockResolvedValue({});
    mocks.trainingJobRound.findUniqueOrThrow.mockResolvedValue({
      id: 'round-1',
      jobId: 'job-1',
      roundNumber: 1,
    });
    mocks.modelUpdate.count.mockResolvedValue(1);
    mocks.model.upsert.mockResolvedValue({});
    mocks.model.update.mockResolvedValue({});
    blockchain.completeTrainingRound.mockImplementation(
      async (
        _jobId: bigint,
        _roundNumber: number,
        _hash: string,
        onSubmitted: (txHash: string) => Promise<void>,
        onMined: (txHash: string, gasUsed: bigint) => Promise<void>,
      ) => {
        await onSubmitted('0xround');
        await onMined('0xround', 80n);
        return '0xround';
      },
    );
    mocks.trainingJob.updateMany.mockResolvedValue({ count: 1 });
    mocks.$transaction.mockImplementation(
      async (callback: (transaction: unknown) => unknown) => callback(prisma),
    );
    service = new TrainingRoundsService(prisma, blockchain as never);
  });

  it('records the next round and completes the job at its planned limit', async () => {
    mocks.trainingJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
      currentRound: 0,
      plannedRounds: 1,
      chainJobId: 1n,
    });

    await expect(
      service.recordTrainingRound('job-1', {
        roundNumber: 1,
        aggregatedModelHash: 'sha256:round-1',
        aggregatedModelSize: 1024,
        aggregatedModelFilePath: '/models/round-1.pkl',
        metrics: { accuracy: 0.95 },
      }),
    ).resolves.toMatchObject({ roundNumber: 1 });

    expect(mocks.trainingJobRound.updateMany).toHaveBeenCalledWith({
      where: { id: 'round-1', status: 'RUNNING' },
      data: {
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        aggregatedModelHash: 'sha256:round-1',
        metrics: { accuracy: 0.95 },
      },
    });
    expect(mocks.model.upsert).toHaveBeenCalledWith({
      where: { hash: 'sha256:round-1' },
      create: {
        hash: 'sha256:round-1',
        size: 1024,
        filePath: '/models/round-1.pkl',
      },
      update: {
        size: 1024,
        filePath: '/models/round-1.pkl',
      },
    });
    expect(mocks.trainingJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: 'RUNNING', currentRound: 0 },
      data: {
        currentRound: 1,
        finalModelHash: 'sha256:round-1',
        status: 'COMPLETED',
      },
    });
    expect(mocks.trainingJobLog.create).toHaveBeenCalledWith({
      data: {
        jobId: 'job-1',
        message: 'Training round 1 completed; training job completed',
      },
    });
    expect(blockchain.completeTrainingRound).toHaveBeenCalledWith(
      1n,
      1,
      'sha256:round-1',
      expect.any(Function),
      expect.any(Function),
    );
    expect(mocks.trainingJobRound.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'round-1' },
      data: { chainTxHash: '0xround', chainSyncStatus: 'SUBMITTED' },
    });
    expect(mocks.trainingJobRound.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'round-1' },
      data: { chainTxHash: '0xround', chainSyncStatus: 'CONFIRMED' },
    });
    expect(mocks.blockchainTransaction.upsert).toHaveBeenCalledWith({
      where: { txHash: '0xround' },
      create: {
        txHash: '0xround',
        jobId: 'job-1',
        roundId: 'round-1',
      },
      update: {},
    });
    expect(mocks.blockchainTransaction.update).toHaveBeenCalledWith({
      where: { txHash: '0xround' },
      data: { gasUsed: 80n },
    });
  });

  it('stores the aggregate hash for every completed round without finalizing early', async () => {
    mocks.trainingJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
      currentRound: 0,
      plannedRounds: 3,
      chainJobId: 1n,
    });

    await service.recordTrainingRound('job-1', {
      roundNumber: 1,
      aggregatedModelHash: 'sha256:round-1',
      aggregatedModelSize: 1024,
      aggregatedModelFilePath: '/models/round-1.pkl',
    });

    expect(mocks.trainingJobRound.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          aggregatedModelHash: 'sha256:round-1',
        }),
      }),
    );
    expect(mocks.trainingJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: 'RUNNING', currentRound: 0 },
      data: { currentRound: 1 },
    });
  });

  it('creates the next round using the preceding aggregate hash', async () => {
    mocks.trainingJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
      currentRound: 1,
      plannedRounds: 3,
      initialModelHash: 'sha256:initial',
      chainJobId: 1n,
      chainTxHash: '0xjob',
      chainSyncStatus: 'CONFIRMED',
    });
    mocks.trainingJobRound.findUnique
      .mockResolvedValueOnce({
        status: 'COMPLETED',
        aggregatedModelHash: 'sha256:round-1',
        chainTxHash: '0xround-1',
        chainSyncStatus: 'CONFIRMED',
      })
      .mockResolvedValueOnce(null);
    mocks.trainingJobRound.create.mockResolvedValue({
      id: 'round-2',
      jobId: 'job-1',
      roundNumber: 2,
      prevModelHash: 'sha256:round-1',
      status: 'RUNNING',
      chainTxHash: '0xround-1',
      chainSyncStatus: 'CONFIRMED',
      modelUpdates: [],
    });

    await expect(
      service.startTrainingRound('job-1', {
        roundNumber: 2,
        prevModelHash: 'sha256:round-1',
      }),
    ).resolves.toMatchObject({
      roundNumber: 2,
      prevModelHash: 'sha256:round-1',
      status: 'RUNNING',
    });
    expect(mocks.trainingJobRound.create).toHaveBeenCalledWith({
      data: {
        jobId: 'job-1',
        roundNumber: 2,
        prevModelHash: 'sha256:round-1',
        status: 'RUNNING',
        chainTxHash: '0xround-1',
        chainSyncStatus: 'CONFIRMED',
      },
      include: { modelUpdates: true },
    });
  });

  it('returns an existing active round when the start request is retried', async () => {
    mocks.trainingJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
      currentRound: 0,
      plannedRounds: 2,
      initialModelHash: 'sha256:initial',
      chainJobId: 1n,
      chainTxHash: '0xjob',
      chainSyncStatus: 'CONFIRMED',
    });
    const round = {
      id: 'round-1',
      roundNumber: 1,
      prevModelHash: 'sha256:initial',
      status: 'RUNNING',
      modelUpdates: [],
    };
    mocks.trainingJobRound.findUnique.mockResolvedValue(round);

    await expect(
      service.startTrainingRound('job-1', {
        roundNumber: 1,
        prevModelHash: 'sha256:initial',
      }),
    ).resolves.toMatchObject({ ...round, gasUsed: null });
    expect(mocks.trainingJobRound.create).not.toHaveBeenCalled();
  });

  it('rejects out-of-order rounds without recording them', async () => {
    mocks.trainingJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
      currentRound: 2,
      plannedRounds: 5,
    });

    await expect(
      service.recordTrainingRound('job-1', {
        roundNumber: 1,
        aggregatedModelHash: 'sha256:round-1',
        aggregatedModelSize: 1024,
        aggregatedModelFilePath: '/models/round-1.pkl',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mocks.trainingJobRound.findUnique).toHaveBeenCalled();
  });

  describe('reports without an aggregate model', () => {
    beforeEach(() => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'RUNNING',
        currentRound: 0,
        plannedRounds: 1,
      });
    });

    it('stores metrics but keeps the round and job running', async () => {
      await expect(
        service.recordTrainingRound('job-1', {
          roundNumber: 1,
          metrics: { accuracy: 0.8 },
        }),
      ).resolves.toMatchObject({ roundNumber: 1 });

      expect(mocks.trainingJobRound.updateMany).toHaveBeenCalledWith({
        where: { id: 'round-1', status: 'RUNNING' },
        data: { metrics: { accuracy: 0.8 } },
      });
      // Even on the planned final round: no model, status, or counter changes.
      expect(mocks.model.upsert).not.toHaveBeenCalled();
      expect(mocks.trainingJob.updateMany).not.toHaveBeenCalled();
      expect(mocks.trainingJobLog.create).not.toHaveBeenCalled();
    });

    it('does not require model updates yet', async () => {
      mocks.modelUpdate.count.mockResolvedValue(0);

      await expect(
        service.recordTrainingRound('job-1', {
          roundNumber: 1,
          metrics: { accuracy: 0.8 },
        }),
      ).resolves.toBeDefined();
    });

    it('rejects a report for a round that was never started', async () => {
      mocks.trainingJobRound.findUnique.mockResolvedValue(null);

      await expect(
        service.recordTrainingRound('job-1', {
          roundNumber: 1,
          metrics: { accuracy: 0.8 },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a report for a round that is already completed', async () => {
      mocks.trainingJobRound.findUnique.mockResolvedValue({
        id: 'round-1',
        status: 'COMPLETED',
      });

      await expect(
        service.recordTrainingRound('job-1', {
          roundNumber: 1,
          metrics: { accuracy: 0.8 },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mocks.trainingJobRound.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an empty report', async () => {
      await expect(
        service.recordTrainingRound('job-1', { roundNumber: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.$transaction).not.toHaveBeenCalled();
    });

    it.each([
      ['hash only', { aggregatedModelHash: 'sha256:a' }],
      [
        'hash and size',
        { aggregatedModelHash: 'sha256:a', aggregatedModelSize: 1 },
      ],
      [
        'size and path',
        { aggregatedModelSize: 1, aggregatedModelFilePath: '/m/a.pkl' },
      ],
      ['path only', { aggregatedModelFilePath: '/m/a.pkl' }],
    ])(
      'rejects a partial aggregate (%s) even with metrics',
      async (_name, fields) => {
        await expect(
          service.recordTrainingRound('job-1', {
            roundNumber: 1,
            metrics: { accuracy: 0.8 },
            ...fields,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mocks.$transaction).not.toHaveBeenCalled();
      },
    );
  });

  describe('RecordTrainingRoundDto', () => {
    const check = async (body: object) =>
      validate(plainToInstance(RecordTrainingRoundDto, body), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

    it('accepts reports with or without the aggregate fields', async () => {
      await expect(
        check({ roundNumber: 1, metrics: { a: 1 } }),
      ).resolves.toEqual([]);
      await expect(
        check({
          roundNumber: 1,
          aggregatedModelHash: 'sha256:a',
          aggregatedModelSize: 10,
          aggregatedModelFilePath: '/m/a.pkl',
        }),
      ).resolves.toEqual([]);
    });

    it('still validates aggregate fields that are present', async () => {
      expect(
        await check({ roundNumber: 1, aggregatedModelHash: '' }),
      ).not.toEqual([]);
      expect(
        await check({ roundNumber: 1, aggregatedModelSize: 0 }),
      ).not.toEqual([]);
      expect(await check({ roundNumber: 0, metrics: {} })).not.toEqual([]);
    });
  });

  it('lists rounds and metrics in round order', async () => {
    mocks.trainingJob.findUnique.mockResolvedValue({ id: 'job-1' });
    mocks.blockchainTransaction.groupBy
      .mockResolvedValueOnce([
        { roundId: 'round-1', _sum: { gasUsed: 95000n } },
      ])
      .mockResolvedValueOnce([
        { roundId: 'round-1', _sum: { gasUsed: 95000n } },
      ]);
    mocks.trainingJobRound.findMany
      .mockResolvedValueOnce([{ id: 'round-1', roundNumber: 1 }])
      .mockResolvedValueOnce([
        { id: 'round-1', roundNumber: 1, metrics: { accuracy: 0.8 } },
        { id: 'round-2', roundNumber: 2, metrics: null },
      ]);

    await expect(service.getTrainingJobRounds('job-1')).resolves.toEqual([
      { id: 'round-1', roundNumber: 1, gasUsed: '95000' },
    ]);
    await expect(service.getTrainingJobMetrics('job-1')).resolves.toEqual([
      { roundNumber: 1, metrics: { accuracy: 0.8 }, gasUsed: '95000' },
    ]);
  });
});
