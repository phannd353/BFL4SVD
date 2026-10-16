import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractService } from '@/common';
import { ModelService } from './model.service';

const owner = '0x0000000000000000000000000000000000000001';

const onChainModel = (
  id: bigint,
  updateId: bigint,
  overrides: {
    modelOwner?: string;
    modelHash?: string;
    timestamp?: bigint;
  } = {},
) =>
  [
    id,
    updateId,
    overrides.modelOwner ?? owner,
    overrides.modelHash ?? `model-${id}`,
    overrides.timestamp ?? 100n + id,
  ] as const;

const onChainUpdate = (
  id: bigint,
  previousUpdateId: bigint,
  overrides: {
    updateOwner?: string;
    score?: bigint;
    modelHash?: string;
    timestamp?: bigint;
  } = {},
) =>
  [
    id,
    overrides.updateOwner ?? owner,
    overrides.score ?? 10n + id,
    overrides.modelHash ?? `update-${id}`,
    1n,
    2n,
    32n,
    previousUpdateId,
    90n,
    overrides.timestamp ?? 1000n + id,
  ] as const;

describe('ModelService', { tags: ['unit', 'models'] }, () => {
  const contract = { getFunction: vi.fn() };
  const contractService = {
    getFLRegistryContract: vi.fn(),
  } as unknown as ContractService;
  let service: ModelService;

  beforeEach(() => {
    vi.resetAllMocks();
    contractService.getFLRegistryContract = vi
      .fn()
      .mockResolvedValue(contract as never);
    service = new ModelService(contractService);
  });

  it('returns all models with bigint fields serialized as strings', async () => {
    contract.getFunction.mockReturnValue(
      vi
        .fn()
        .mockResolvedValue([
          onChainModel(0n, 0n, { timestamp: 12345678901234567890n }),
          onChainModel(1n, 9n, { modelHash: 'round-one-model' }),
        ]),
    );

    await expect(service.getAllModels()).resolves.toEqual([
      {
        id: '0',
        updateId: '0',
        owner,
        modelHash: 'model-0',
        timestamp: '12345678901234567890',
      },
      {
        id: '1',
        updateId: '9',
        owner,
        modelHash: 'round-one-model',
        timestamp: '101',
      },
    ]);
    expect(contract.getFunction).toHaveBeenCalledWith('getModels');
  });

  it('gets a model by its ID', async () => {
    contract.getFunction.mockReturnValue(
      vi
        .fn()
        .mockResolvedValue([
          onChainModel(0n, 0n),
          onChainModel(1n, 9n, { modelHash: 'latest-model' }),
        ]),
    );

    await expect(service.getModelById(1)).resolves.toMatchObject({
      id: '1',
      updateId: '9',
      modelHash: 'latest-model',
    });
  });

  it('throws not found when the model ID does not exist', async () => {
    contract.getFunction.mockReturnValue(
      vi.fn().mockResolvedValue([onChainModel(0n, 0n)]),
    );

    await expect(service.getModelById(1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns model updates in chronological order following previous-update links', async () => {
    contract.getFunction.mockImplementation((functionName: string) =>
      vi
        .fn()
        .mockResolvedValue(
          functionName === 'getModels'
            ? [onChainModel(0n, 0n), onChainModel(1n, 2n)]
            : [
                onChainUpdate(0n, 0n, { modelHash: 'genesis-update' }),
                onChainUpdate(1n, 0n, { modelHash: 'round-zero-update' }),
                onChainUpdate(2n, 1n, { modelHash: 'round-one-update' }),
              ],
        ),
    );

    await expect(service.getModelVersions(1)).resolves.toEqual([
      expect.objectContaining({
        id: '0',
        modelHash: 'genesis-update',
        timestamp: '1000',
      }),
      expect.objectContaining({
        id: '1',
        modelHash: 'round-zero-update',
        prevModelId: '0',
      }),
      expect.objectContaining({
        id: '2',
        modelHash: 'round-one-update',
        prevModelId: '1',
      }),
    ]);
    expect(contract.getFunction).toHaveBeenNthCalledWith(1, 'getModels');
    expect(contract.getFunction).toHaveBeenNthCalledWith(2, 'getModelUpdates');
  });

  it('stops model history at an update owned by a different address', async () => {
    const otherOwner = '0x0000000000000000000000000000000000000002';
    contract.getFunction.mockImplementation((functionName: string) =>
      vi
        .fn()
        .mockResolvedValue(
          functionName === 'getModels'
            ? [onChainModel(0n, 0n), onChainModel(1n, 1n)]
            : [
                onChainUpdate(0n, 0n, { updateOwner: otherOwner }),
                onChainUpdate(1n, 0n),
              ],
        ),
    );

    await expect(service.getModelVersions(1)).resolves.toEqual([
      expect.objectContaining({ id: '1', owner }),
    ]);
  });

  it('terminates malformed cyclic update history without duplicates', async () => {
    contract.getFunction.mockImplementation((functionName: string) =>
      vi
        .fn()
        .mockResolvedValue(
          functionName === 'getModels'
            ? [onChainModel(0n, 0n), onChainModel(1n, 1n)]
            : [onChainUpdate(0n, 1n), onChainUpdate(1n, 0n)],
        ),
    );

    await expect(service.getModelVersions(1)).resolves.toMatchObject([
      { id: '0' },
      { id: '1' },
    ]);
  });

  it('returns not found when requesting versions for a missing model', async () => {
    contract.getFunction.mockReturnValue(
      vi.fn().mockResolvedValue([onChainModel(0n, 0n)]),
    );

    await expect(service.getModelVersions(1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(contract.getFunction).toHaveBeenCalledTimes(1);
  });
});
