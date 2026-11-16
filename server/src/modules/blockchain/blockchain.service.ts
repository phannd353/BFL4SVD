import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Log, LogDescription, TransactionResponse } from 'ethers';
import { TrainingJobStatus } from '@prisma-generated';

import { ContractService } from '@/common';

type OnChainModelUpdate = readonly [
  bigint,
  bigint,
  bigint,
  string,
  bigint,
  string,
  bigint,
  bigint,
  bigint,
  string,
  bigint,
  bigint,
];

type OnChainTrainingJob = readonly [
  bigint,
  string,
  string,
  string,
  string,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
];

type OnChainTrainingRound = readonly [
  bigint,
  bigint,
  bigint,
  bigint,
  string,
  string,
  bigint,
  bigint,
];

type OnChainModel = readonly [string, string, bigint];
export type TransactionMinedCallback = (
  txHash: string,
  gasUsed: bigint,
) => Promise<void>;

export type OnChainTrainingJobStatus =
  'CREATED' | 'RUNNING' | 'STOPPED' | 'COMPLETED' | 'CANCELLED';

export function mapTrainingJobStatus(
  status: TrainingJobStatus,
): OnChainTrainingJobStatus | null {
  switch (status) {
    case TrainingJobStatus.DRAFT:
    case TrainingJobStatus.WAITING:
      return 'CREATED';
    case TrainingJobStatus.RUNNING:
      return 'RUNNING';
    case TrainingJobStatus.STOPPED:
      return 'STOPPED';
    case TrainingJobStatus.COMPLETED:
      return 'COMPLETED';
    case TrainingJobStatus.CANCELLED:
      return 'CANCELLED';
    case TrainingJobStatus.FAILED:
      return null;
  }
}

@Injectable()
export class BlockchainService {
  constructor(private readonly contractService: ContractService) {}

  async getTransactionGasUsed(txHash: string): Promise<bigint | null> {
    const receipt =
      await this.contractService.provider.getTransactionReceipt(txHash);
    return receipt?.gasUsed ?? null;
  }

  async registerModel(
    modelHash: string,
    onSubmitted?: (txHash: string) => Promise<void>,
  ): Promise<string | null> {
    const readContract = await this.contractService.getFLRegistryContract();
    const models = (await readContract.getFunction(
      'getModels',
    )()) as OnChainModel[];
    if (models.some((model) => model[1] === modelHash)) return null;

    const contract = await this.contractService.getFLRegistryWriteContract();
    return this.sendTransaction(
      contract.getFunction('addModel')(modelHash),
      onSubmitted,
    );
  }

  async createTrainingJob(
    databaseJobId: string,
    name: string,
    initialModelHash: string,
    plannedRounds: number,
    onSubmitted?: (txHash: string) => Promise<void>,
    onMined?: TransactionMinedCallback,
  ) {
    const readContract = await this.contractService.getFLRegistryContract();
    const [exists, existingId] = (await readContract.getFunction(
      'getTrainingJobId',
    )(databaseJobId)) as readonly [boolean, bigint];
    if (exists) {
      const existing = (await readContract.getFunction('getTrainingJob')(
        existingId,
      )) as OnChainTrainingJob;
      const sameConfig =
        existing[2] === name &&
        existing[3] === initialModelHash &&
        existing[5] === BigInt(plannedRounds);
      if (!sameConfig) {
        if (this.decodeJobStatus(existing[7]) !== 'CREATED') {
          throw new ConflictException(
            'On-chain training job configuration conflicts with the database',
          );
        }
        const txHash = await this.updateTrainingJob(
          existingId,
          name,
          initialModelHash,
          plannedRounds,
          onSubmitted,
          onMined,
        );
        return { jobId: existingId, txHash };
      }
      return { jobId: existingId, txHash: null };
    }

    const contract = await this.contractService.getFLRegistryWriteContract();
    const txHash = await this.sendTransaction(
      contract.getFunction('createTrainingJob')(
        databaseJobId,
        name,
        initialModelHash,
        BigInt(plannedRounds),
      ),
      onSubmitted,
      onMined,
    );
    const [created, jobId] = (await contract.getFunction('getTrainingJobId')(
      databaseJobId,
    )) as readonly [boolean, bigint];
    if (!created) {
      throw new Error('Confirmed training job transaction is not readable');
    }
    return { jobId, txHash };
  }

  async updateTrainingJob(
    jobId: bigint,
    name: string,
    initialModelHash: string,
    plannedRounds: number,
    onSubmitted?: (txHash: string) => Promise<void>,
    onMined?: TransactionMinedCallback,
  ) {
    const readContract = await this.contractService.getFLRegistryContract();
    const existing = (await readContract.getFunction('getTrainingJob')(
      jobId,
    )) as OnChainTrainingJob;
    if (
      this.decodeJobStatus(existing[7]) === 'CREATED' &&
      existing[2] === name &&
      existing[3] === initialModelHash &&
      existing[5] === BigInt(plannedRounds)
    ) {
      return null;
    }

    const contract = await this.contractService.getFLRegistryWriteContract();
    return this.sendTransaction(
      contract.getFunction('updateTrainingJob')(
        jobId,
        name,
        initialModelHash,
        BigInt(plannedRounds),
      ),
      onSubmitted,
      onMined,
    );
  }

  async startTrainingJob(
    jobId: bigint,
    onSubmitted?: (txHash: string) => Promise<void>,
    onMined?: TransactionMinedCallback,
  ) {
    const contract = await this.contractService.getFLRegistryWriteContract();
    return this.sendTransaction(
      contract.getFunction('startTrainingJob')(jobId),
      onSubmitted,
      onMined,
    );
  }

  async stopTrainingJob(
    jobId: bigint,
    onSubmitted?: (txHash: string) => Promise<void>,
    onMined?: TransactionMinedCallback,
  ) {
    const contract = await this.contractService.getFLRegistryWriteContract();
    return this.sendTransaction(
      contract.getFunction('stopTrainingJob')(jobId),
      onSubmitted,
      onMined,
    );
  }

  async cancelTrainingJob(
    jobId: bigint,
    onSubmitted?: (txHash: string) => Promise<void>,
    onMined?: TransactionMinedCallback,
  ) {
    const contract = await this.contractService.getFLRegistryWriteContract();
    return this.sendTransaction(
      contract.getFunction('cancelTrainingJob')(jobId),
      onSubmitted,
      onMined,
    );
  }

  async syncTrainingJobStatus(
    jobId: bigint,
    status: TrainingJobStatus,
    onSubmitted?: (txHash: string) => Promise<void>,
    onMined?: TransactionMinedCallback,
  ) {
    const mappedStatus = mapTrainingJobStatus(status);
    if (mappedStatus === null) return null;

    const readContract = await this.contractService.getFLRegistryContract();
    const chainJob = (await readContract.getFunction('getTrainingJob')(
      jobId,
    )) as OnChainTrainingJob;
    if (this.decodeJobStatus(chainJob[7]) === mappedStatus) return null;

    switch (mappedStatus) {
      case 'CREATED':
        return null;
      case 'RUNNING':
        return this.startTrainingJob(jobId, onSubmitted, onMined);
      case 'STOPPED':
        return this.stopTrainingJob(jobId, onSubmitted, onMined);
      case 'CANCELLED':
        return this.cancelTrainingJob(jobId, onSubmitted, onMined);
      case 'COMPLETED':
        throw new BadRequestException(
          'Training jobs are completed by completing their final round',
        );
    }
  }

  async completeTrainingRound(
    jobId: bigint,
    roundNumber: number,
    aggregatedModelHash: string,
    onSubmitted?: (txHash: string) => Promise<void>,
    onMined?: TransactionMinedCallback,
  ): Promise<string | null> {
    const readContract = await this.contractService.getFLRegistryContract();
    const rounds = (await readContract.getFunction('getTrainingRounds')(
      jobId,
    )) as OnChainTrainingRound[];
    if (roundNumber <= rounds.length) {
      const existing = rounds[roundNumber - 1];
      if (this.decodeRoundStatus(existing[2]) === 'COMPLETED') {
        if (existing[5] !== aggregatedModelHash) {
          throw new ConflictException(
            'On-chain training round conflicts with the database aggregate',
          );
        }
        return null;
      }
    }

    const contract = await this.contractService.getFLRegistryWriteContract();
    return this.sendTransaction(
      contract.getFunction('completeTrainingRound')(
        jobId,
        BigInt(roundNumber),
        aggregatedModelHash,
      ),
      onSubmitted,
      onMined,
    );
  }

  async recordModelUpdate(
    clientAddress: string,
    jobId: bigint,
    roundNumber: number,
    input: {
      modelHash: string;
      score: string;
      epoch: string;
      learningRate: string;
      batchSize: string;
      prevModelHash: string;
      accuracy: string;
    },
    onSubmitted?: (txHash: string) => Promise<void>,
    onMined?: TransactionMinedCallback,
  ): Promise<{ updateId: bigint; txHash: string | null }> {
    const chainInput = {
      modelHash: input.modelHash,
      score: this.toChainInteger(input.score, 'score'),
      epoch: this.toChainInteger(input.epoch, 'epoch'),
      learningRate: this.toChainInteger(input.learningRate, 'learning rate'),
      batchSize: this.toChainInteger(input.batchSize, 'batch size'),
      prevModelHash: input.prevModelHash,
      accuracy: this.toChainInteger(input.accuracy, 'accuracy'),
    };
    const readContract = await this.contractService.getFLRegistryContract();
    const [alreadyExists, existingUpdateId] = (await readContract.getFunction(
      'getModelUpdateId',
    )(jobId, BigInt(roundNumber), clientAddress)) as readonly [boolean, bigint];
    if (alreadyExists) {
      const updates = (await readContract.getFunction(
        'getModelUpdates',
      )()) as OnChainModelUpdate[];
      if (existingUpdateId >= BigInt(updates.length)) {
        throw new Error('On-chain model update index is invalid');
      }
      const existing = updates[Number(existingUpdateId)];
      const sameUpdate =
        existing !== undefined &&
        existing[3].toLowerCase() === clientAddress.toLowerCase() &&
        existing[4] === chainInput.score &&
        existing[5] === input.modelHash &&
        existing[6] === chainInput.epoch &&
        existing[7] === chainInput.learningRate &&
        existing[8] === chainInput.batchSize &&
        existing[9] === input.prevModelHash &&
        existing[10] === chainInput.accuracy;
      if (!sameUpdate) {
        throw new ConflictException(
          'On-chain model update conflicts with the database record',
        );
      }
      return { updateId: existingUpdateId, txHash: null };
    }

    const contract = await this.contractService.getFLRegistryWriteContract();
    const txHash = await this.sendTransaction(
      contract.getFunction('recordModelUpdateForClient')(
        clientAddress,
        jobId,
        BigInt(roundNumber),
        chainInput,
      ),
      onSubmitted,
      onMined,
    );
    const [exists, updateId] = (await contract.getFunction('getModelUpdateId')(
      jobId,
      BigInt(roundNumber),
      clientAddress,
    )) as readonly [boolean, bigint];
    if (!exists) {
      throw new Error('Confirmed model update transaction is not readable');
    }
    return { updateId, txHash };
  }

  async getTransactions() {
    const contract = await this.contractService.getFLRegistryContract();
    const eventNames = [
      'ModelAdded',
      'ModelUpdateAdded',
      'TrainingJobCreated',
      'TrainingJobUpdated',
      'TrainingJobStatusChanged',
      'TrainingRoundStarted',
      'TrainingRoundCompleted',
    ];
    const logs = await Promise.all(
      eventNames.map((eventName) => contract.queryFilter(eventName)),
    );

    return logs
      .flat()
      .map((log) => this.serializeEvent(contract.interface.parseLog(log), log))
      .sort(
        (left, right) =>
          left.blockNumber - right.blockNumber ||
          left.logIndex - right.logIndex,
      );
  }

  async getModelUpdate(id: number) {
    this.validateId(id);
    const contract = await this.contractService.getFLRegistryContract();
    const updates = (await contract.getFunction(
      'getModelUpdates',
    )()) as OnChainModelUpdate[];
    if (id >= updates.length) {
      throw new NotFoundException('Model update not found');
    }
    const update = updates[id];

    return this.serializeModelUpdate(update);
  }

  async getModelUpdateEvents(id: number) {
    this.validateId(id);
    await this.getModelUpdate(id);
    const contract = await this.contractService.getFLRegistryContract();
    const updateEvents = await contract.queryFilter('ModelUpdateAdded');

    return updateEvents
      .filter((log) => {
        const parsedLog = contract.interface.parseLog(log);
        if (!parsedLog) {
          throw new Error('Unable to decode FLRegistry event log');
        }

        const eventId = parsedLog.args[0];
        return eventId === BigInt(id);
      })
      .map((log) => this.serializeEvent(contract.interface.parseLog(log), log))
      .sort(
        (left, right) =>
          left.blockNumber - right.blockNumber ||
          left.logIndex - right.logIndex,
      );
  }

  async getHealth() {
    const contract = await this.contractService.getFLRegistryContract();
    const contractAddress = await contract.getAddress();
    const [network, blockNumber, code] = await Promise.all([
      this.contractService.provider.getNetwork(),
      this.contractService.provider.getBlockNumber(),
      this.contractService.provider.getCode(contractAddress),
    ]);

    return {
      connected: true,
      chainId: network.chainId.toString(),
      blockNumber,
      contractAddress,
      contractDeployed: code !== '0x',
    };
  }

  private validateId(id: number) {
    if (!Number.isSafeInteger(id) || id < 0) {
      throw new BadRequestException(
        'Model update ID must be a non-negative integer',
      );
    }
  }

  private decodeJobStatus(value: bigint): OnChainTrainingJobStatus {
    switch (value) {
      case 0n:
        return 'CREATED';
      case 1n:
        return 'RUNNING';
      case 2n:
        return 'STOPPED';
      case 3n:
        return 'COMPLETED';
      case 4n:
        return 'CANCELLED';
      default:
        throw new Error('Unknown on-chain training job status');
    }
  }

  private decodeRoundStatus(value: bigint) {
    switch (value) {
      case 0n:
        return 'RUNNING';
      case 1n:
        return 'STOPPED';
      case 2n:
        return 'COMPLETED';
      default:
        throw new Error('Unknown on-chain training round status');
    }
  }

  private toChainInteger(value: string, field: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(
        `${field} must be a non-negative integer for blockchain storage`,
      );
    }
    return BigInt(value);
  }

  private async sendTransaction(
    submission: Promise<TransactionResponse>,
    onSubmitted?: (txHash: string) => Promise<void>,
    onMined?: TransactionMinedCallback,
  ) {
    const transaction = await submission;
    await onSubmitted?.(transaction.hash);
    const receipt = await transaction.wait();
    if (!receipt) {
      throw new Error(`Blockchain transaction ${transaction.hash} failed`);
    }
    await onMined?.(transaction.hash, receipt.gasUsed);
    if (receipt.status !== 1) {
      throw new Error(`Blockchain transaction ${transaction.hash} failed`);
    }
    return transaction.hash;
  }

  private serializeModelUpdate(update: OnChainModelUpdate) {
    return {
      id: update[0].toString(),
      trainingJobId: update[1].toString(),
      roundNumber: update[2].toString(),
      clientAddress: update[3],
      score: update[4].toString(),
      modelHash: update[5],
      epoch: update[6].toString(),
      learningRate: update[7].toString(),
      batchSize: update[8].toString(),
      prevModelHash: update[9],
      accuracy: update[10].toString(),
      timestamp: update[11].toString(),
    };
  }

  private serializeEvent(parsedLog: LogDescription | null, log: Log) {
    if (!parsedLog) {
      throw new Error('Unable to decode FLRegistry event log');
    }

    const args = Object.fromEntries(
      parsedLog.fragment.inputs.map((input, index) => [
        input.name || String(index),
        this.serializeValue(parsedLog.args[index]),
      ]),
    );

    return {
      event: parsedLog.name,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex: log.index,
      args,
    };
  }

  private serializeValue(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.serializeValue(item));
    }
    return value;
  }
}
