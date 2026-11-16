import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@/infrastructure/database';
import { ModelService } from './model.service';

describe('ModelService', { tags: ['unit', 'models'] }, () => {
  const prisma = {
    model: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    modelUpdate: {
      findMany: vi.fn(),
    },
  } as unknown as PrismaService;
  let service: ModelService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new ModelService(prisma);
  });

  it('lists database models newest first', async () => {
    const models = [
      { hash: 'model-b', size: 20, filePath: '/models/b' },
      { hash: 'model-a', size: 10, filePath: '/models/a' },
    ];
    vi.mocked(prisma.model.findMany).mockResolvedValue(models as never);

    await expect(service.getAllModels()).resolves.toEqual(models);
    expect(prisma.model.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });

  it('gets a model by its content hash', async () => {
    const model = {
      hash: 'model-hash',
      size: 42,
      filePath: '/models/model-hash',
    };
    vi.mocked(prisma.model.findUnique).mockResolvedValue(model as never);

    await expect(service.getModelById('model-hash')).resolves.toEqual(model);
    expect(prisma.model.findUnique).toHaveBeenCalledWith({
      where: { hash: 'model-hash' },
    });
  });

  it('throws not found when the model hash does not exist', async () => {
    vi.mocked(prisma.model.findUnique).mockResolvedValue(null);

    await expect(service.getModelById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns chronologically ordered updates aggregated into the model', async () => {
    vi.mocked(prisma.model.findUnique).mockResolvedValue({
      hash: 'aggregate-hash',
    } as never);
    vi.mocked(prisma.modelUpdate.findMany).mockResolvedValue([
      {
        id: 'update-1',
        chainUpdateId: '4',
        chainTxHash: '0xupdate',
        chainSyncStatus: 'CONFIRMED',
        clientAddress: '0xclient',
        score: '80',
        modelHash: 'client-model',
        epoch: '3',
        learningRate: '0.01',
        batchSize: '32',
        prevModelHash: 'previous-hash',
        accuracy: '90',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        trainingRound: { jobId: 'job-1', roundNumber: 2 },
      },
    ] as never);

    await expect(service.getModelVersions('aggregate-hash')).resolves.toEqual([
      {
        id: 'update-1',
        chainUpdateId: '4',
        chainTxHash: '0xupdate',
        chainSyncStatus: 'CONFIRMED',
        trainingJobId: 'job-1',
        roundNumber: '2',
        clientAddress: '0xclient',
        score: '80',
        modelHash: 'client-model',
        epoch: '3',
        learningRate: '0.01',
        batchSize: '32',
        prevModelHash: 'previous-hash',
        accuracy: '90',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(prisma.modelUpdate.findMany).toHaveBeenCalledWith({
      where: {
        trainingRound: { is: { aggregatedModelHash: 'aggregate-hash' } },
      },
      include: {
        trainingRound: { select: { jobId: true, roundNumber: true } },
      },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });
  });

  it('rejects version requests for unknown model hashes', async () => {
    vi.mocked(prisma.model.findUnique).mockResolvedValue(null);

    await expect(service.getModelVersions('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.modelUpdate.findMany).not.toHaveBeenCalled();
  });
});
