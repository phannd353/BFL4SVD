import { Injectable, NotFoundException } from '@nestjs/common';

import { ContractService } from '@/common';

type OnChainModel = readonly [bigint, bigint, string, string, bigint];
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
export class ModelService {
  constructor(private readonly contractService: ContractService) {}

  async getAllModels() {
    const contract = await this.contractService.getFLRegistryContract();
    const models = (await contract.getFunction(
      'getModels',
    )()) as OnChainModel[];
    return models.map((model) => this.serializeModel(model));
  }

  async getModelById(id: number) {
    const models = await this.getAllModels();
    const model = models.find((entry) => entry.id === String(id));
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    return model;
  }

  async getModelVersions(id: number) {
    const model = await this.getModelById(id);
    const contract = await this.contractService.getFLRegistryContract();
    const updates = (await contract.getFunction(
      'getModelUpdates',
    )()) as OnChainModelUpdate[];
    const updatesById = new Map(
      updates.map((update) => [update[0].toString(), update]),
    );

    const versions: ReturnType<ModelService['serializeModelUpdate']>[] = [];
    const visited = new Set<string>();
    let updateId = model.updateId;

    while (!visited.has(updateId)) {
      visited.add(updateId);
      const update = updatesById.get(updateId);
      if (!update || update[1].toLowerCase() !== model.owner.toLowerCase()) {
        break;
      }
      versions.push(this.serializeModelUpdate(update));

      const previousUpdateId = update[7].toString();
      if (previousUpdateId === updateId) {
        break;
      }
      updateId = previousUpdateId;
    }

    return versions.reverse();
  }

  private serializeModel(model: OnChainModel) {
    return {
      id: model[0].toString(),
      updateId: model[1].toString(),
      owner: model[2],
      modelHash: model[3],
      timestamp: model[4].toString(),
    };
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
}
