import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@/infrastructure/database';
import { CreateModelUpdateDto } from './dto/create-model-update.dto';
import { ModelUpdatesService } from './model-updates.service';

const WALLET = '0x00000000000000000000000000000000000000Aa';
const owner = { jobId: 'job-1', walletAddress: WALLET };

describe('ModelUpdatesService', { tags: ['unit', 'models'] }, () => {
  const mocks = {
    trainingJob: { findUnique: vi.fn() },
    trainingJobParticipant: { findUnique: vi.fn() },
    trainingJobRound: { create: vi.fn(), findUnique: vi.fn() },
    modelUpdate: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    blockchainTransaction: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  const prisma = mocks as unknown as PrismaService;
  const blockchain = { recordModelUpdate: vi.fn() };
  let service: ModelUpdatesService;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.trainingJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
      currentRound: 0,
      plannedRounds: 3,
      initialModelHash: 'sha256:initial',
      chainJobId: 1n,
    });
    mocks.trainingJobParticipant.findUnique.mockResolvedValue({
      status: 'JOINED',
    });
    mocks.trainingJobRound.findUnique.mockResolvedValue(null);
    mocks.trainingJobRound.create.mockResolvedValue({
      id: 'round-1',
      status: 'RUNNING',
      prevModelHash: 'sha256:initial',
    });
    mocks.modelUpdate.update.mockResolvedValue({
      id: 'update-1',
      modelHash: 'sha256:model',
    });
    mocks.$queryRaw.mockResolvedValue([]);
    mocks.$transaction.mockImplementation(
      async (callback: (transaction: unknown) => unknown) => callback(prisma),
    );
    blockchain.recordModelUpdate.mockImplementation(
      async (...args: unknown[]) => {
        const onSubmitted = args[4] as (txHash: string) => Promise<void>;
        const onMined = args[5] as (
          txHash: string,
          gasUsed: bigint,
        ) => Promise<void>;
        await onSubmitted('0xupdate');
        await onMined('0xupdate', 60n);
        return { updateId: 2n, txHash: '0xupdate' };
      },
    );
    service = new ModelUpdatesService(prisma, blockchain as never);
  });

  it('creates model updates with numeric values stored as strings', async () => {
    const created = { id: 'update-1', modelHash: 'sha256:model' };
    mocks.modelUpdate.create.mockResolvedValue(created);

    await expect(
      service.create(
        {
          score: '95',
          modelHash: 'sha256:model',
          epoch: '5',
          learningRate: '1000',
          batchSize: '32',
          prevModelHash: 'client-computed-hash',
          accuracy: '97',
          metrics: { train_logloss: 0.12, train_accuracy: 0.95 },
          trainingJobId: 'job-1',
          roundNumber: '1',
          timestamp: '2026-11-03T08:30:00.000Z',
        },
        'user-1',
        '0x0000000000000000000000000000000000000001',
      ),
    ).resolves.toMatchObject(created);

    expect(mocks.trainingJobRound.create).toHaveBeenCalledWith({
      data: {
        jobId: 'job-1',
        prevModelHash: 'sha256:initial',
        roundNumber: 1,
        status: 'RUNNING',
      },
      select: { id: true, status: true, prevModelHash: true },
    });
    expect(mocks.modelUpdate.create).toHaveBeenCalledWith({
      data: {
        clientAddress: '0x0000000000000000000000000000000000000001',
        score: '95',
        modelHash: 'sha256:model',
        epoch: '5',
        learningRate: '1000',
        batchSize: '32',
        prevModelHash: 'sha256:initial',
        accuracy: '97',
        metrics: { train_logloss: 0.12, train_accuracy: 0.95 },
        timestamp: new Date('2026-11-03T08:30:00.000Z'),
        trainingRoundId: 'round-1',
        chainSyncStatus: 'PENDING',
      },
    });
    expect(mocks.modelUpdate.update).toHaveBeenLastCalledWith({
      where: { id: 'update-1' },
      data: {
        chainUpdateId: '2',
        chainTxHash: '0xupdate',
        chainSyncStatus: 'CONFIRMED',
      },
    });
    expect(mocks.blockchainTransaction.upsert).toHaveBeenCalledWith({
      where: { txHash: '0xupdate' },
      create: {
        txHash: '0xupdate',
        jobId: 'job-1',
        roundId: 'round-1',
      },
      update: {},
    });
    expect(mocks.blockchainTransaction.update).toHaveBeenCalledWith({
      where: { txHash: '0xupdate' },
      data: { gasUsed: 60n },
    });
  });

  it('retries failed on-chain model updates without creating a duplicate row', async () => {
    const input = {
      score: '95',
      modelHash: 'sha256:model',
      epoch: '5',
      learningRate: '1000',
      batchSize: '32',
      prevModelHash: 'sha256:initial',
      accuracy: '97',
      trainingJobId: 'job-1',
      roundNumber: '1',
    };
    const failedUpdate = {
      id: 'update-1',
      score: '95',
      modelHash: 'sha256:model',
      epoch: '5',
      learningRate: '1000',
      batchSize: '32',
      prevModelHash: 'sha256:initial',
      accuracy: '97',
      clientAddress: '0x0000000000000000000000000000000000000001',
      trainingRoundId: 'round-1',
      chainSyncStatus: 'FAILED',
    };
    mocks.modelUpdate.create.mockResolvedValue(failedUpdate);
    mocks.modelUpdate.update.mockImplementation(
      ({ where, data }: { where: { id: string }; data: object }) =>
        Promise.resolve({ id: where.id, ...data }),
    );
    blockchain.recordModelUpdate.mockRejectedValueOnce(
      new Error('transaction reverted'),
    );
    await expect(
      service.create(input, 'user-1', failedUpdate.clientAddress),
    ).rejects.toThrow('transaction reverted');
    expect(mocks.modelUpdate.update).toHaveBeenLastCalledWith({
      where: { id: 'update-1' },
      data: { chainSyncStatus: 'FAILED' },
    });

    mocks.modelUpdate.findUnique.mockResolvedValue(failedUpdate);
    blockchain.recordModelUpdate.mockResolvedValue({
      updateId: 2n,
      txHash: '0xretried',
    });
    await expect(
      service.create(input, 'user-1', failedUpdate.clientAddress),
    ).resolves.toMatchObject({
      id: 'update-1',
      chainUpdateId: '2',
      chainTxHash: '0xretried',
      chainSyncStatus: 'CONFIRMED',
    });
    expect(mocks.modelUpdate.create).toHaveBeenCalledOnce();
  });

  describe('CreateModelUpdateDto', () => {
    const check = (metrics: unknown) =>
      validate(
        plainToInstance(CreateModelUpdateDto, {
          score: '95',
          modelHash: 'sha256:model',
          epoch: '5',
          learningRate: '1000',
          batchSize: '32',
          accuracy: '97',
          trainingJobId: 'job-1',
          roundNumber: '1',
          metrics,
        }),
        { whitelist: true, forbidNonWhitelisted: true },
      );

    it('accepts a metrics object and rejects arrays', async () => {
      await expect(check({ train_accuracy: 0.95 })).resolves.toEqual([]);
      await expect(check([{ train_accuracy: 0.95 }])).resolves.not.toEqual([]);
    });
  });

  it('uses the database lineage instead of a client-computed previous hash', async () => {
    mocks.modelUpdate.create.mockResolvedValue({});

    await service.create(
      {
        score: '95',
        modelHash: 'sha256:model',
        epoch: '5',
        learningRate: '1000',
        batchSize: '32',
        prevModelHash: 'unregistered-client-hash',
        accuracy: '97',
        trainingJobId: 'job-1',
        roundNumber: '1',
      },
      'user-1',
      '0x0000000000000000000000000000000000000001',
    );

    expect(mocks.modelUpdate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ prevModelHash: 'sha256:initial' }),
      }),
    );
  });

  it('uses the completed prior round hash for later-round updates', async () => {
    mocks.trainingJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
      currentRound: 1,
      plannedRounds: 3,
      initialModelHash: 'sha256:initial',
    });
    mocks.trainingJobRound.findUnique
      .mockResolvedValueOnce({
        status: 'COMPLETED',
        aggregatedModelHash: 'sha256:round-1',
      })
      .mockResolvedValueOnce({
        id: 'round-2',
        status: 'RUNNING',
        prevModelHash: 'sha256:round-1',
      });
    mocks.modelUpdate.create.mockResolvedValue({});

    await service.create(
      {
        score: '95',
        modelHash: 'sha256:model',
        epoch: '5',
        learningRate: '1000',
        batchSize: '32',
        accuracy: '97',
        trainingJobId: 'job-1',
        roundNumber: '2',
      },
      'user-1',
      '0x0000000000000000000000000000000000000001',
    );

    expect(mocks.modelUpdate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ prevModelHash: 'sha256:round-1' }),
      }),
    );
  });

  it('rejects non-JSON model metrics', async () => {
    await expect(
      service.create(
        {
          score: '95',
          modelHash: 'sha256:model',
          epoch: '5',
          learningRate: '1000',
          batchSize: '32',
          prevModelHash: '4',
          accuracy: '97',
          metrics: { loss: Number.NaN },
          trainingJobId: 'job-1',
          roundNumber: '1',
        },
        'user-1',
        '0x0000000000000000000000000000000000000001',
      ),
    ).rejects.toThrow('Metrics must contain only JSON values');
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it('lists persisted updates in creation order', async () => {
    mocks.modelUpdate.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(mocks.modelUpdate.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  });

  it('returns not found for missing update IDs', async () => {
    mocks.modelUpdate.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates and deletes only unfinalized records', async () => {
    mocks.modelUpdate.findUnique
      .mockResolvedValueOnce({
        id: 'update-1',
        clientAddress: WALLET.toLowerCase(),
        chainUpdateId: null,
        trainingRound: { status: 'RUNNING', jobId: 'job-1' },
      })
      .mockResolvedValueOnce({ id: 'update-1', modelHash: 'new-hash' })
      .mockResolvedValueOnce({
        id: 'update-1',
        clientAddress: WALLET.toLowerCase(),
        chainUpdateId: null,
        trainingRound: { status: 'RUNNING', jobId: 'job-1' },
      });
    mocks.modelUpdate.updateMany.mockResolvedValue({ count: 1 });
    mocks.modelUpdate.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      service.update(
        'update-1',
        { modelHash: 'new-hash', metrics: { train_accuracy: 0.96 } },
        owner,
      ),
    ).resolves.toEqual({ id: 'update-1', modelHash: 'new-hash' });
    expect(mocks.modelUpdate.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'update-1',
        clientAddress: WALLET.toLowerCase(),
        chainUpdateId: null,
        trainingRound: { is: { status: 'RUNNING' } },
      },
      data: {
        modelHash: 'new-hash',
        metrics: { train_accuracy: 0.96 },
      },
    });

    await expect(service.remove('update-1')).resolves.toBeUndefined();
    expect(mocks.modelUpdate.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'update-1',
        chainUpdateId: null,
        trainingRound: { is: { status: 'RUNNING' } },
      },
    });
  });

  it('rejects changes to updates already finalized on chain', async () => {
    mocks.modelUpdate.findUnique.mockResolvedValue({
      id: 'update-1',
      clientAddress: WALLET.toLowerCase(),
      chainUpdateId: '42',
      trainingRound: { status: 'RUNNING', jobId: 'job-1' },
    });

    await expect(
      service.update('update-1', { modelHash: 'changed' }, owner),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(service.remove('update-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mocks.modelUpdate.updateMany).not.toHaveBeenCalled();
    expect(mocks.modelUpdate.deleteMany).not.toHaveBeenCalled();
  });

  it.each([
    [
      'another participant',
      {
        clientAddress: '0x0000000000000000000000000000000000000bad',
        jobId: 'job-1',
      },
    ],
    ['another job', { clientAddress: WALLET.toLowerCase(), jobId: 'job-2' }],
  ])('rejects changing an update that belongs to %s', async (_name, row) => {
    mocks.modelUpdate.findUnique.mockResolvedValue({
      id: 'update-1',
      clientAddress: row.clientAddress,
      chainUpdateId: null,
      trainingRound: { status: 'RUNNING', jobId: row.jobId },
    });

    await expect(
      service.update('update-1', { modelHash: 'changed' }, owner),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.modelUpdate.updateMany).not.toHaveBeenCalled();
  });
});
