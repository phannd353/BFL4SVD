import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Interface, Log } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractService } from '@/common';
import { BlockchainService } from './blockchain.service';

const contractInterface = new Interface([
  'event ModelAdded(uint256 id, uint256 updateId, address owner, string modelHash, uint256 timestamp)',
  'event ModelUpdateAdded(uint256 id, address owner, uint256 score, string modelHash, uint256 epoch, uint256 learningRate, uint256 batchSize, uint256 prevModelId, uint256 accuracy, uint256 timestamp)',
  'event RoundEnded(uint256 round, uint256 timestamp)',
]);

const modelUpdate = (
  id: bigint,
  overrides: Partial<{
    owner: string;
    score: bigint;
    modelHash: string;
    epoch: bigint;
    learningRate: bigint;
    batchSize: bigint;
    prevModelId: bigint;
    accuracy: bigint;
    timestamp: bigint;
  }> = {},
) =>
  [
    id,
    overrides.owner ?? '0x0000000000000000000000000000000000000001',
    overrides.score ?? 10n,
    overrides.modelHash ?? `model-${id}`,
    overrides.epoch ?? 1n,
    overrides.learningRate ?? 2n,
    overrides.batchSize ?? 32n,
    overrides.prevModelId ?? 0n,
    overrides.accuracy ?? 90n,
    overrides.timestamp ?? 1234n,
  ] as const;

describe('BlockchainService', { tags: ['unit', 'blockchain'] }, () => {
  const contract = {
    interface: contractInterface,
    queryFilter: vi.fn(),
    getFunction: vi.fn(),
    getAddress: vi.fn(),
  };
  const provider = {
    getNetwork: vi.fn(),
    getBlockNumber: vi.fn(),
    getCode: vi.fn(),
  };
  const contractService = {
    getFLRegistryContract: vi.fn(),
    provider,
  } as unknown as ContractService;
  let service: BlockchainService;

  beforeEach(() => {
    vi.resetAllMocks();
    contractService.getFLRegistryContract = vi
      .fn()
      .mockResolvedValue(contract as never);
    service = new BlockchainService(contractService);
  });

  it('returns all known contract events in block and log order', async () => {
    const modelAdded = makeLog(
      'ModelAdded',
      [1n, 2n, '0x0000000000000000000000000000000000000001', 'model-hash', 10n],
      4,
      1,
    );
    const updateAdded = makeLog(
      'ModelUpdateAdded',
      [
        2n,
        '0x0000000000000000000000000000000000000001',
        42n,
        'update-hash',
        3n,
        5n,
        64n,
        1n,
        97n,
        11n,
      ],
      3,
      4,
    );
    const roundEnded = makeLog('RoundEnded', [2n, 12n], 4, 0);
    contract.queryFilter.mockImplementation((eventName: string) =>
      Promise.resolve(
        {
          ModelAdded: [modelAdded],
          ModelUpdateAdded: [updateAdded],
          RoundEnded: [roundEnded],
        }[eventName] ?? [],
      ),
    );

    await expect(service.getTransactions()).resolves.toEqual([
      expect.objectContaining({
        event: 'ModelUpdateAdded',
        blockNumber: 3,
        logIndex: 4,
        args: expect.objectContaining({
          id: '2',
          score: '42',
          modelHash: 'update-hash',
          timestamp: '11',
        }),
      }),
      expect.objectContaining({
        event: 'RoundEnded',
        blockNumber: 4,
        logIndex: 0,
      }),
      expect.objectContaining({
        event: 'ModelAdded',
        blockNumber: 4,
        logIndex: 1,
      }),
    ]);
    expect(contract.queryFilter).toHaveBeenCalledTimes(3);
  });

  it('serializes all model update integer fields as strings', async () => {
    contract.getFunction.mockReturnValue(
      vi.fn().mockResolvedValue([
        modelUpdate(0n, {
          score: 42n,
          epoch: 3n,
          learningRate: 5n,
          batchSize: 64n,
          prevModelId: 2n,
          accuracy: 97n,
          timestamp: 12345678901234567890n,
        }),
      ]),
    );

    await expect(service.getModelUpdate(0)).resolves.toEqual({
      id: '0',
      owner: '0x0000000000000000000000000000000000000001',
      score: '42',
      modelHash: 'model-0',
      epoch: '3',
      learningRate: '5',
      batchSize: '64',
      prevModelId: '2',
      accuracy: '97',
      timestamp: '12345678901234567890',
    });
    expect(contract.getFunction).toHaveBeenCalledWith('getModelUpdates');
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid model update ID %s without querying the contract',
    async (id) => {
      await expect(service.getModelUpdate(id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(contractService.getFLRegistryContract).not.toHaveBeenCalled();
    },
  );

  it('returns not found when a model update ID is out of range', async () => {
    contract.getFunction.mockReturnValue(vi.fn().mockResolvedValue([]));

    await expect(service.getModelUpdate(0)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns only events for the requested model update in chain order', async () => {
    contract.getFunction.mockReturnValue(
      vi.fn().mockResolvedValue([modelUpdate(1n), modelUpdate(2n)]),
    );
    contract.queryFilter.mockImplementation((eventName: string) =>
      Promise.resolve(
        eventName === 'ModelUpdateAdded'
          ? [
              makeLog(
                'ModelUpdateAdded',
                [
                  1n,
                  '0x0000000000000000000000000000000000000001',
                  10n,
                  'first',
                  1n,
                  2n,
                  32n,
                  0n,
                  80n,
                  100n,
                ],
                4,
                0,
              ),
              makeLog(
                'ModelUpdateAdded',
                [
                  2n,
                  '0x0000000000000000000000000000000000000001',
                  20n,
                  'second',
                  1n,
                  2n,
                  32n,
                  1n,
                  90n,
                  200n,
                ],
                5,
                0,
              ),
            ]
          : [
              makeLog(
                'ModelAdded',
                [
                  1n,
                  1n,
                  '0x0000000000000000000000000000000000000001',
                  'model-first',
                  300n,
                ],
                6,
                0,
              ),
            ],
      ),
    );

    const events = await service.getModelUpdateEvents(1);
    expect(events.map(({ event, args }) => [event, args])).toEqual([
      [
        'ModelUpdateAdded',
        expect.objectContaining({ id: '1', modelHash: 'first' }),
      ],
      [
        'ModelAdded',
        expect.objectContaining({ updateId: '1', modelHash: 'model-first' }),
      ],
    ]);
  });

  it('does not query events for a model update that does not exist', async () => {
    contract.getFunction.mockReturnValue(vi.fn().mockResolvedValue([]));

    await expect(service.getModelUpdateEvents(0)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(contract.queryFilter).not.toHaveBeenCalled();
  });

  it('reports RPC network, block height, and contract deployment health', async () => {
    contract.getAddress.mockResolvedValue(
      '0x0000000000000000000000000000000000001234',
    );
    provider.getNetwork.mockResolvedValue({ chainId: 31337n });
    provider.getBlockNumber.mockResolvedValue(456);
    provider.getCode.mockResolvedValue('0x6000');

    await expect(service.getHealth()).resolves.toEqual({
      connected: true,
      chainId: '31337',
      blockNumber: 456,
      contractAddress: '0x0000000000000000000000000000000000001234',
      contractDeployed: true,
    });
    expect(provider.getCode).toHaveBeenCalledWith(
      '0x0000000000000000000000000000000000001234',
    );
  });
});

function makeLog(
  eventName: string,
  args: readonly (string | bigint)[],
  blockNumber: number,
  index: number,
) {
  const fragment = contractInterface.getEvent(eventName);
  if (!fragment) {
    throw new Error(`Unknown event ${eventName}`);
  }
  const encoded = contractInterface.encodeEventLog(fragment, [...args]);

  return {
    ...encoded,
    blockNumber,
    transactionHash: `0x${String(blockNumber).padStart(64, '0')}`,
    index,
  } as Log;
}
