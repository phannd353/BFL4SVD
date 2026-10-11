import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Log, LogDescription } from 'ethers';

import { ContractService } from '@/common';

type OnChainModelUpdate = readonly [
  bigint,
  string,
  bigint,
  string,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
];

@Injectable()
export class BlockchainService {
  constructor(private readonly contractService: ContractService) {}

  async getTransactions() {
    const contract = await this.contractService.getFLRegistryContract();
    const eventNames = ['ModelAdded', 'ModelUpdateAdded', 'RoundEnded'];
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
    const update = updates[id];

    if (!update) {
      throw new NotFoundException('Model update not found');
    }

    return this.serializeModelUpdate(update);
  }

  async getModelUpdateEvents(id: number) {
    this.validateId(id);
    await this.getModelUpdate(id);
    const contract = await this.contractService.getFLRegistryContract();
    const [updateEvents, modelEvents] = await Promise.all([
      contract.queryFilter('ModelUpdateAdded'),
      contract.queryFilter('ModelAdded'),
    ]);

    return [...updateEvents, ...modelEvents]
      .filter((log) => {
        const parsedLog = contract.interface.parseLog(log);
        if (!parsedLog) {
          throw new Error('Unable to decode FLRegistry event log');
        }

        const eventId =
          parsedLog.name === 'ModelAdded'
            ? parsedLog.args[1]
            : parsedLog.args[0];
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

  private serializeModelUpdate(update: OnChainModelUpdate) {
    return {
      id: update[0].toString(),
      owner: update[1],
      score: update[2].toString(),
      modelHash: update[3],
      epoch: update[4].toString(),
      learningRate: update[5].toString(),
      batchSize: update[6].toString(),
      prevModelId: update[7].toString(),
      accuracy: update[8].toString(),
      timestamp: update[9].toString(),
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
