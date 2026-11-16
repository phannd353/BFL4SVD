import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '@/infrastructure/database';
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
    let prisma: PrismaService;

    beforeAll(async () => {
      infraHelper = new InfrastructureHelper();
      await infraHelper.startInfrastructure();

      app = await createTestingAppModule(infraHelper);
      service = app.get(ModelService);
      prisma = app.get(PrismaService);

      await prisma.model.createMany({
        data: [
          { hash: 'initial-hash', size: 10, filePath: '/models/initial' },
          { hash: 'aggregate-hash', size: 20, filePath: '/models/aggregate' },
        ],
      });
      const job = await prisma.trainingJob.create({
        data: {
          name: 'model history test',
          initialModelHash: 'initial-hash',
          finalModelHash: 'aggregate-hash',
        },
      });
      const round = await prisma.trainingJobRound.create({
        data: {
          jobId: job.id,
          prevModelHash: 'initial-hash',
          aggregatedModelHash: 'aggregate-hash',
          roundNumber: 1,
        },
      });
      await prisma.modelUpdate.createMany({
        data: [
          {
            trainingRoundId: round.id,
            clientAddress: '0x0000000000000000000000000000000000000001',
            score: '80',
            modelHash: 'client-model-1',
            prevModelHash: 'initial-hash',
            epoch: '2',
            learningRate: '0.01',
            batchSize: '32',
            accuracy: '90',
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            trainingRoundId: round.id,
            clientAddress: '0x0000000000000000000000000000000000000002',
            score: '85',
            modelHash: 'client-model-2',
            prevModelHash: 'initial-hash',
            epoch: '2',
            learningRate: '0.01',
            batchSize: '32',
            accuracy: '92',
            timestamp: new Date('2026-01-02T00:00:00.000Z'),
          },
        ],
      });
    }, 30000);

    afterAll(async () => {
      await app?.close();
      await infraHelper?.stopInfrastructure();
    });

    it('reads models from the database', async () => {
      await expect(service.getAllModels()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hash: 'initial-hash',
            size: 10,
            filePath: '/models/initial',
          }),
          expect.objectContaining({
            hash: 'aggregate-hash',
            size: 20,
            filePath: '/models/aggregate',
          }),
        ]),
      );
    });

    it('gets a model by hash and rejects missing hashes', async () => {
      await expect(
        service.getModelById('aggregate-hash'),
      ).resolves.toMatchObject({
        hash: 'aggregate-hash',
        size: 20,
      });
      await expect(service.getModelById('missing-hash')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('returns model updates from the round aggregated into that model', async () => {
      const versions = await service.getModelVersions('aggregate-hash');

      expect(versions).toHaveLength(2);
      expect(versions.map(({ modelHash }) => modelHash)).toEqual([
        'client-model-1',
        'client-model-2',
      ]);
      expect(versions[0]).toMatchObject({
        trainingJobId: expect.any(String),
        roundNumber: '1',
        prevModelHash: 'initial-hash',
      });
    });

    it('rejects version requests for unknown model hashes', async () => {
      await expect(
        service.getModelVersions('missing-hash'),
      ).rejects.toMatchObject({
        status: 404,
      });
    });
  },
);
