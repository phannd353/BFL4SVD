import { setTimeout as delay } from 'node:timers/promises';
import { BaseContract, Contract } from 'ethers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BlockchainService } from '@/modules/blockchain/blockchain.service';
import { InfrastructureHelper } from '../helper/infrastructure.helper';
import { createTestingAppModule } from '../helper/app.helper';
import { INestApplication } from '@nestjs/common';
import { ContractService } from '@/common';

describe(
  'BlockchainService integration',
  { tags: ['integration', 'blockchain'] },
  () => {
    let writer: BaseContract;
    let contractAddress: string;
    let chainId: bigint;
    let infraHelper: InfrastructureHelper;
    let app: INestApplication;
    let blockchainService: BlockchainService;

    beforeAll(async () => {
      infraHelper = new InfrastructureHelper();
      await infraHelper.startInfrastructure();

      app = await createTestingAppModule(infraHelper);
      blockchainService = app.get(BlockchainService);

      const contractService: ContractService = app.get(ContractService);
      const contract = await contractService.getFLRegistryContract();
      writer = contract.connect(await contractService.provider.getSigner(0));
      contractAddress = await writer.getAddress();
      chainId = (await contractService.provider.getNetwork()).chainId;
    }, 30000);

    afterAll(async () => {
      await app?.close();
      await infraHelper?.stopInfrastructure();
    });

    it('reads RPC and deployed contract health', async () => {
      await expect(blockchainService.getHealth()).resolves.toMatchObject({
        connected: true,
        chainId: chainId.toString(),
        contractAddress,
        contractDeployed: true,
      });
      expect(await blockchainService.getHealth()).toHaveProperty('blockNumber');
    });

    it('reads and serializes the constructor model update from chain', async () => {
      await expect(blockchainService.getModelUpdate(0)).resolves.toMatchObject({
        id: '0',
        owner: await getOwner(),
        score: '0',
        modelHash: '0x0',
        epoch: '0',
        learningRate: '0',
        batchSize: '0',
        prevModelId: '0',
        accuracy: '0',
      });
    });

    it('reads and decodes constructor events from chain logs', async () => {
      const events = await blockchainService.getTransactions();

      expect(events.map(({ event }) => event)).toEqual([
        'ModelUpdateAdded',
        'ModelAdded',
      ]);
      expect(events[0]).toMatchObject({
        transactionHash: expect.stringMatching(/^0x[0-9a-f]{64}$/i),
        args: expect.objectContaining({
          id: '0',
          modelHash: '0x0',
        }),
      });
    });

    it('returns events associated with an existing update', async () => {
      const events = await blockchainService.getModelUpdateEvents(0);

      expect(events.map(({ event }) => event)).toEqual([
        'ModelUpdateAdded',
        'ModelAdded',
      ]);
      expect(events[1].args).toMatchObject({
        updateId: '0',
        modelHash: '0x0',
      });
    });

    it('includes newly submitted updates in reads and transaction history', async () => {
      const tx = await writer.getFunction('uploadModelUpdate')(
        'second-update',
        25,
        3,
        4,
        64,
        0,
        95,
      );
      await tx.wait();
      await delay(300);

      await expect(blockchainService.getModelUpdate(1)).resolves.toMatchObject({
        id: '1',
        score: '25',
        modelHash: 'second-update',
        epoch: '3',
        learningRate: '4',
        batchSize: '64',
        prevModelId: '0',
        accuracy: '95',
      });
      const events = await blockchainService.getTransactions();
      expect(events.map(({ event }) => event)).toEqual([
        'ModelUpdateAdded',
        'ModelAdded',
        'ModelUpdateAdded',
      ]);
    });

    it('rejects an update ID that does not exist on chain', async () => {
      await expect(blockchainService.getModelUpdate(99)).rejects.toMatchObject({
        status: 404,
      });
    });

    async function getOwner() {
      return writer.getFunction('owner')() as Promise<string>;
    }
  },
);
