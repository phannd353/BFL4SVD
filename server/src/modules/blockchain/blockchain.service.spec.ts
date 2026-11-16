import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Interface, Log } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractService } from '@/common';
import { TrainingJobStatus } from '@prisma-generated';
import { BlockchainService, mapTrainingJobStatus } from './blockchain.service';

const contractInterface = new Interface([
  'event ModelAdded(address owner, string modelHash, uint256 timestamp)',
  'event ModelUpdateAdded(uint256 indexed id, uint256 indexed trainingJobId, uint256 indexed roundNumber, address client, uint256 score, string modelHash, uint256 accuracy, uint256 timestamp)',
  'event TrainingJobUpdated(uint256 indexed jobId, string name, string initialModelHash, uint256 plannedRounds, uint256 timestamp)',
  'event TrainingRoundCompleted(uint256 indexed jobId, uint256 indexed roundNumber, string modelHash, uint256 modelUpdateCount, uint256 timestamp)',
]);

const modelUpdate = (
  id: bigint,
  overrides: Partial<{
    trainingJobId: bigint;
    roundNumber: bigint;
    client: string;
    score: bigint;
    modelHash: string;
    epoch: bigint;
    learningRate: bigint;
    batchSize: bigint;
    prevModelHash: string;
    accuracy: bigint;
    timestamp: bigint;
  }> = {},
) =>
  [
    id,
    overrides.trainingJobId ?? 5n,
    overrides.roundNumber ?? 2n,
    overrides.client ?? '0x0000000000000000000000000000000000000001',
    overrides.score ?? 10n,
    overrides.modelHash ?? `model-${id}`,
    overrides.epoch ?? 1n,
    overrides.learningRate ?? 2n,
    overrides.batchSize ?? 32n,
    overrides.prevModelHash ?? 'previous-model',
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
    getTransactionReceipt: vi.fn(),
  };
  const contractService = {
    getFLRegistryContract: vi.fn(),
    getFLRegistryWriteContract: vi.fn(),
    provider,
  } as unknown as ContractService;
  let service: BlockchainService;

  beforeEach(() => {
    vi.resetAllMocks();
    contractService.getFLRegistryContract = vi
      .fn()
      .mockResolvedValue(contract as never);
    contractService.getFLRegistryWriteContract = vi
      .fn()
      .mockResolvedValue(contract as never);
    service = new BlockchainService(contractService);
  });

  it('reads gas usage from a mined transaction receipt', async () => {
    provider.getTransactionReceipt.mockResolvedValue({ gasUsed: 31000n });

    await expect(service.getTransactionGasUsed('0xreceipt')).resolves.toBe(
      31000n,
    );
    expect(provider.getTransactionReceipt).toHaveBeenCalledWith('0xreceipt');
  });

  it('does not re-register a model that already exists on chain', async () => {
    contract.getFunction.mockReturnValue(
      vi
        .fn()
        .mockResolvedValue([
          ['0x0000000000000000000000000000000000000001', 'sha256:model', 1n],
        ]),
    );

    await expect(service.registerModel('sha256:model')).resolves.toBeNull();
    expect(contractService.getFLRegistryWriteContract).not.toHaveBeenCalled();
  });

  it('registers a missing model and waits for transaction confirmation', async () => {
    const tx = {
      hash: '0xmodel',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    };
    const addModel = vi.fn().mockResolvedValue(tx);
    contract.getFunction.mockImplementation((name: string) =>
      name === 'getModels' ? vi.fn().mockResolvedValue([]) : addModel,
    );
    const onSubmitted = vi.fn().mockResolvedValue(undefined);

    await expect(
      service.registerModel('sha256:model', onSubmitted),
    ).resolves.toBe('0xmodel');
    expect(addModel).toHaveBeenCalledWith('sha256:model');
    expect(onSubmitted).toHaveBeenCalledWith('0xmodel');
    expect(tx.wait).toHaveBeenCalledOnce();
  });

  it.each([
    ['DRAFT', TrainingJobStatus.DRAFT, 'CREATED'],
    ['WAITING', TrainingJobStatus.WAITING, 'CREATED'],
    ['RUNNING', TrainingJobStatus.RUNNING, 'RUNNING'],
    ['STOPPED', TrainingJobStatus.STOPPED, 'STOPPED'],
    ['COMPLETED', TrainingJobStatus.COMPLETED, 'COMPLETED'],
    ['CANCELLED', TrainingJobStatus.CANCELLED, 'CANCELLED'],
    ['FAILED', TrainingJobStatus.FAILED, null],
  ] as const)('maps database %s status explicitly', (_, status, expected) => {
    expect(mapTrainingJobStatus(status)).toBe(expected);
  });

  it('does not resubmit a job status already confirmed on chain', async () => {
    const runningJob = [
      1n,
      '0x0000000000000000000000000000000000000001',
      'job',
      'initial',
      '',
      2n,
      0n,
      1n,
      1n,
      0n,
      0n,
      0n,
    ];
    contract.getFunction.mockReturnValue(vi.fn().mockResolvedValue(runningJob));

    await expect(
      service.syncTrainingJobStatus(1n, TrainingJobStatus.RUNNING),
    ).resolves.toBeNull();
    expect(contractService.getFLRegistryWriteContract).not.toHaveBeenCalled();
  });

  it('waits for confirmation when changing a job status on chain', async () => {
    const runningJob = [
      1n,
      '0x0000000000000000000000000000000000000001',
      'job',
      'initial',
      '',
      2n,
      0n,
      1n,
      1n,
      0n,
      0n,
      0n,
    ];
    const tx = {
      hash: '0xstop',
      wait: vi.fn().mockResolvedValue({ status: 1, gasUsed: 42000n }),
    };
    const stop = vi.fn().mockResolvedValue(tx);
    contract.getFunction.mockImplementation((name: string) =>
      name === 'getTrainingJob' ? vi.fn().mockResolvedValue(runningJob) : stop,
    );
    const onSubmitted = vi.fn().mockResolvedValue(undefined);
    const onMined = vi.fn().mockResolvedValue(undefined);

    await expect(
      service.syncTrainingJobStatus(
        1n,
        TrainingJobStatus.STOPPED,
        onSubmitted,
        onMined,
      ),
    ).resolves.toBe('0xstop');
    expect(onSubmitted).toHaveBeenCalledWith('0xstop');
    expect(onMined).toHaveBeenCalledWith('0xstop', 42000n);
    expect(tx.wait).toHaveBeenCalledOnce();
  });

  it('records gas for a mined transaction that reverted', async () => {
    const tx = {
      hash: '0xreverted',
      wait: vi.fn().mockResolvedValue({ status: 0, gasUsed: 35000n }),
    };
    const stop = vi.fn().mockResolvedValue(tx);
    contract.getFunction.mockImplementation((name: string) =>
      name === 'getTrainingJob'
        ? vi
            .fn()
            .mockResolvedValue([
              1n,
              '0x0000000000000000000000000000000000000001',
              'job',
              'initial',
              '',
              2n,
              0n,
              1n,
              1n,
              0n,
              0n,
              0n,
            ])
        : stop,
    );
    const onMined = vi.fn().mockResolvedValue(undefined);

    await expect(
      service.syncTrainingJobStatus(
        1n,
        TrainingJobStatus.STOPPED,
        undefined,
        onMined,
      ),
    ).rejects.toThrow('Blockchain transaction 0xreverted failed');
    expect(onMined).toHaveBeenCalledWith('0xreverted', 35000n);
  });

  it('does not submit a completed round a second time', async () => {
    const completedRound = [1n, 1n, 2n, 1n, 'previous', 'aggregate', 1n, 2n];
    contract.getFunction.mockImplementation((name: string) =>
      name === 'getTrainingRounds'
        ? vi.fn().mockResolvedValue([completedRound])
        : vi.fn(),
    );

    await expect(
      service.completeTrainingRound(1n, 1, 'aggregate'),
    ).resolves.toBeNull();
    expect(contractService.getFLRegistryWriteContract).not.toHaveBeenCalled();
  });

  it('submits model updates with validated BigInt metrics and awaits confirmation', async () => {
    const tx = {
      hash: '0xupdate',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    };
    const submit = vi.fn().mockResolvedValue(tx);
    const lookup = vi
      .fn()
      .mockResolvedValueOnce([false, 0n])
      .mockResolvedValueOnce([true, 7n]);
    contract.getFunction.mockImplementation((name: string) => {
      if (name === 'recordModelUpdateForClient') return submit;
      if (name === 'getModelUpdateId') return lookup;
      return vi.fn();
    });
    const onSubmitted = vi.fn().mockResolvedValue(undefined);

    await expect(
      service.recordModelUpdate(
        '0x0000000000000000000000000000000000000001',
        3n,
        2,
        {
          modelHash: 'model',
          score: '95',
          epoch: '5',
          learningRate: '1000000',
          batchSize: '32',
          prevModelHash: 'previous',
          accuracy: '97',
        },
        onSubmitted,
      ),
    ).resolves.toEqual({ updateId: 7n, txHash: '0xupdate' });
    expect(submit).toHaveBeenCalledWith(
      '0x0000000000000000000000000000000000000001',
      3n,
      2n,
      {
        modelHash: 'model',
        score: 95n,
        epoch: 5n,
        learningRate: 1000000n,
        batchSize: 32n,
        prevModelHash: 'previous',
        accuracy: 97n,
      },
    );
    expect(onSubmitted).toHaveBeenCalledWith('0xupdate');
    expect(tx.wait).toHaveBeenCalledOnce();
  });

  it('rejects fractional and negative metric strings before submitting', async () => {
    const submit = vi.fn();
    contract.getFunction.mockReturnValue(submit);

    await expect(
      service.recordModelUpdate('0x1', 1n, 1, {
        modelHash: 'model',
        score: '-1',
        epoch: '1',
        learningRate: '1',
        batchSize: '32',
        prevModelHash: 'previous',
        accuracy: '90',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.recordModelUpdate('0x1', 1n, 1, {
        modelHash: 'model',
        score: '1.5',
        epoch: '1',
        learningRate: '1',
        batchSize: '32',
        prevModelHash: 'previous',
        accuracy: '90',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(submit).not.toHaveBeenCalled();
  });

  it('returns all known contract events in block and log order', async () => {
    const modelAdded = makeLog(
      'ModelAdded',
      ['0x0000000000000000000000000000000000000001', 'model-hash', 10n],
      4,
      1,
    );
    const updateAdded = makeLog(
      'ModelUpdateAdded',
      [
        2n,
        5n,
        2n,
        '0x0000000000000000000000000000000000000001',
        42n,
        'update-hash',
        97n,
        11n,
      ],
      3,
      4,
    );
    const roundCompleted = makeLog(
      'TrainingRoundCompleted',
      [5n, 2n, 'aggregate-hash', 10n, 12n],
      4,
      0,
    );
    contract.queryFilter.mockImplementation((eventName: string) =>
      Promise.resolve(
        {
          ModelAdded: [modelAdded],
          ModelUpdateAdded: [updateAdded],
          TrainingRoundCompleted: [roundCompleted],
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
        event: 'TrainingRoundCompleted',
        blockNumber: 4,
        logIndex: 0,
      }),
      expect.objectContaining({
        event: 'ModelAdded',
        blockNumber: 4,
        logIndex: 1,
      }),
    ]);
    expect(contract.queryFilter).toHaveBeenCalledTimes(7);
  });

  it('serializes all model update integer fields as strings', async () => {
    contract.getFunction.mockReturnValue(
      vi.fn().mockResolvedValue([
        modelUpdate(0n, {
          score: 42n,
          epoch: 3n,
          learningRate: 5n,
          batchSize: 64n,
          prevModelHash: 'previous-model-hash',
          accuracy: 97n,
          timestamp: 12345678901234567890n,
        }),
      ]),
    );

    await expect(service.getModelUpdate(0)).resolves.toEqual({
      id: '0',
      trainingJobId: '5',
      roundNumber: '2',
      clientAddress: '0x0000000000000000000000000000000000000001',
      score: '42',
      modelHash: 'model-0',
      epoch: '3',
      learningRate: '5',
      batchSize: '64',
      prevModelHash: 'previous-model-hash',
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
                  5n,
                  2n,
                  '0x0000000000000000000000000000000000000001',
                  10n,
                  'first',
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
                  5n,
                  2n,
                  '0x0000000000000000000000000000000000000001',
                  20n,
                  'second',
                  90n,
                  200n,
                ],
                5,
                0,
              ),
            ]
          : [],
      ),
    );

    const events = await service.getModelUpdateEvents(1);
    expect(events.map(({ event, args }) => [event, args])).toEqual([
      [
        'ModelUpdateAdded',
        expect.objectContaining({ id: '1', modelHash: 'first' }),
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
