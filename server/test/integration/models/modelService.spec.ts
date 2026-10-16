import { INestApplication } from '@nestjs/common';
import { BaseContract } from 'ethers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ContractService } from '@/common';
import { ModelService } from '@/modules/models/model.service';
import { createTestingAppModule } from '../helper/app.helper';
import { InfrastructureHelper } from '../helper/infrastructure.helper';

describe(
  'ModelService integration',
  { tags: ['integration', 'models'] },
  () => {
    let app: INestApplication;
    let infraHelper: InfrastructureHelper;
    let service: ModelService;
    let writer: BaseContract;
    let owner: string;

    beforeAll(async () => {
      infraHelper = new InfrastructureHelper();
      await infraHelper.startInfrastructure();

      app = await createTestingAppModule(infraHelper);
      service = app.get(ModelService);

      const contractService = app.get(ContractService);
      const contract = await contractService.getFLRegistryContract();
      writer = contract.connect(await contractService.provider.getSigner(0));
      owner = (await writer.getFunction('owner')()) as string;
    }, 30000);

    afterAll(async () => {
      await app?.close();
      await infraHelper?.stopInfrastructure();
    });

    it('reads and serializes all on-chain models', async () => {
      await expect(service.getAllModels()).resolves.toEqual([
        {
          id: '0',
          updateId: '0',
          owner,
          modelHash: '0x0',
          timestamp: expect.any(String),
        },
      ]);
    });

    it('gets a model by ID and rejects missing IDs', async () => {
      await expect(service.getModelById(0)).resolves.toMatchObject({
        id: '0',
        updateId: '0',
        owner,
        modelHash: '0x0',
      });
      await expect(service.getModelById(1)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('returns linked model updates in chronological order after a round completes', async () => {
      for (let updateId = 1; updateId <= 9; updateId++) {
        const transaction = await writer.getFunction('uploadModelUpdate')(
          `update-${updateId}`,
          10 + updateId,
          2,
          3,
          64,
          updateId - 1,
          85 + updateId,
        );
        await transaction.wait();
      }

      const models = await service.getAllModels();
      expect(models).toHaveLength(2);
      expect(models[1]).toMatchObject({
        id: '1',
        updateId: '9',
        owner,
        modelHash: 'update-9',
      });

      const versions = await service.getModelVersions(1);
      expect(versions).toHaveLength(10);
      expect(versions.map(({ id }) => id)).toEqual(
        Array.from({ length: 10 }, (_, index) => String(index)),
      );
      expect(versions[0]).toMatchObject({
        id: '0',
        modelHash: '0x0',
        owner,
      });
      expect(versions[9]).toMatchObject({
        id: '9',
        modelHash: 'update-9',
        prevModelId: '8',
        owner,
      });
    });

    it('rejects version requests for unknown models', async () => {
      await expect(service.getModelVersions(99)).rejects.toMatchObject({
        status: 404,
      });
    });
  },
);
