import {
  ConflictException,
  ForbiddenException,
  INestApplication,
} from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '@/infrastructure/database';
import { ROLES } from '@/lib/permissions';
import { ClientService } from '@/modules/clients/client.service';
import { TrainingJobsService } from '@/modules/training-jobs/training-jobs.service';
import { AuthHelper } from '../helper/auth.helper';
import { createTestingAppModule } from '../helper/app.helper';
import { InfrastructureHelper } from '../helper/infrastructure.helper';

describe(
  'TrainingJobsService integration',
  { tags: ['integration', 'training-jobs'] },
  () => {
    let app: INestApplication;
    let infraHelper: InfrastructureHelper;
    let prisma: PrismaService;
    let clientService: ClientService;
    let service: TrainingJobsService;
    let ownerId: string;
    let otherUserId: string;
    let participantUserId: string;
    let unregisteredUserId: string;
    let participantClientId: string;

    beforeAll(async () => {
      infraHelper = new InfrastructureHelper();
      await infraHelper.startInfrastructure();
      app = await createTestingAppModule(infraHelper);
      prisma = app.get(PrismaService);
      clientService = app.get(ClientService);
      service = app.get(TrainingJobsService);

      const authHelper = app.get(AuthHelper);
      const users = await Promise.all(
        ['owner', 'other', 'participant', 'unregistered'].map((suffix) =>
          authHelper.registerUser({
            email: `training-job-${suffix}@example.com`,
            password: 'password123',
            role: ROLES.USER,
          }),
        ),
      );
      [ownerId, otherUserId, participantUserId, unregisteredUserId] = users.map(
        ({ user }) => user.id,
      );

      const participant = await clientService.registerClient(
        participantUserId,
        {
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
      );
      participantClientId = participant.id;
    }, 30000);

    afterAll(async () => {
      await app?.close();
      await infraHelper?.stopInfrastructure();
    });

    it('creates jobs, lists them, and retrieves their details and status', async () => {
      const job = await service.createTrainingJob(ownerId, {
        name: 'Integration image classifier',
        description: 'Training test job',
        plannedRounds: 4,
        epochs: 3,
        batchSize: 32,
        learningRate: 0.001,
        modelHash: 'ipfs://initial-model',
      });

      expect(job).toMatchObject({
        name: 'Integration image classifier',
        description: 'Training test job',
        status: 'DRAFT',
        createdById: ownerId,
        plannedRounds: 4,
        currentRound: 0,
        epochs: 3,
        batchSize: 32,
        learningRate: 0.001,
        modelHash: 'ipfs://initial-model',
      });
      await expect(service.getTrainingJobById(job.id)).resolves.toMatchObject({
        id: job.id,
        createdById: ownerId,
      });
      await expect(service.getTrainingJobStatus(job.id)).resolves.toMatchObject(
        {
          id: job.id,
          status: 'DRAFT',
          currentRound: 0,
          plannedRounds: 4,
        },
      );
      await expect(service.getAllTrainingJobs()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: job.id })]),
      );
      await expect(service.getTrainingJobLogs(job.id)).resolves.toEqual([
        expect.objectContaining({ message: 'Training job created' }),
      ]);
    });

    it('starts, stops, resumes, and records lifecycle transitions', async () => {
      const job = await createJob();

      await expect(
        service.startTrainingJob(job.id, ownerId),
      ).resolves.toMatchObject({
        status: 'RUNNING',
      });
      await expect(
        service.stopTrainingJob(job.id, ownerId),
      ).resolves.toMatchObject({
        status: 'STOPPED',
      });
      await expect(
        service.startTrainingJob(job.id, ownerId),
      ).resolves.toMatchObject({
        status: 'RUNNING',
      });
      await expect(service.getTrainingJobLogs(job.id)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'Training job running' }),
          expect.objectContaining({ message: 'Training job stopped' }),
        ]),
      );
    });

    it('restricts lifecycle updates to the job creator and valid transitions', async () => {
      const job = await createJob();

      await expect(
        service.startTrainingJob(job.id, otherUserId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await service.startTrainingJob(job.id, ownerId);
      await expect(
        service.startTrainingJob(job.id, ownerId),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('joins, lists, leaves, and allows a client to rejoin', async () => {
      const job = await createJob();

      await expect(
        service.joinTrainingJob(job.id, participantUserId),
      ).resolves.toEqual({
        jobId: job.id,
        clientId: participantClientId,
        status: 'JOINED',
      });
      await expect(service.getClientsByTrainingJobId(job.id)).resolves.toEqual([
        expect.objectContaining({
          id: participantClientId,
          user: { id: participantUserId, name: 'Test User', image: null },
        }),
      ]);
      await expect(
        service.joinTrainingJob(job.id, participantUserId),
      ).rejects.toBeInstanceOf(ConflictException);

      await expect(
        service.leaveTrainingJob(job.id, participantUserId),
      ).resolves.toMatchObject({ status: 'LEFT' });
      await expect(service.getClientsByTrainingJobId(job.id)).resolves.toEqual(
        [],
      );

      await service.joinTrainingJob(job.id, participantUserId);
      await expect(
        service.getClientsByTrainingJobId(job.id),
      ).resolves.toHaveLength(1);
    });

    it('rejects joining without a registered client and joining a completed job', async () => {
      const job = await createJob();

      await expect(
        service.joinTrainingJob(job.id, unregisteredUserId),
      ).rejects.toMatchObject({ status: 400 });

      await prisma.trainingJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED' },
      });
      await expect(
        service.joinTrainingJob(job.id, participantUserId),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('reads rounds and only rounds with metrics', async () => {
      const job = await createJob();
      await prisma.trainingJobRound.createMany({
        data: [
          {
            jobId: job.id,
            roundNumber: 2,
            modelHash: 'model-2',
            blockchainUpdateId: '22',
            metrics: { accuracy: 0.95 },
          },
          {
            jobId: job.id,
            roundNumber: 1,
            modelHash: 'model-1',
            blockchainUpdateId: '11',
            metrics: { accuracy: 0.8 },
          },
          { jobId: job.id, roundNumber: 3, modelHash: 'model-3' },
        ],
      });

      await expect(service.getTrainingJobRounds(job.id)).resolves.toEqual([
        expect.objectContaining({ roundNumber: 1 }),
        expect.objectContaining({ roundNumber: 2 }),
        expect.objectContaining({ roundNumber: 3 }),
      ]);
      await expect(service.getTrainingJobMetrics(job.id)).resolves.toEqual([
        expect.objectContaining({
          roundNumber: 1,
          metrics: { accuracy: 0.8 },
          blockchainUpdateId: '11',
        }),
        expect.objectContaining({
          roundNumber: 2,
          metrics: { accuracy: 0.95 },
          blockchainUpdateId: '22',
        }),
      ]);
    });

    it('returns not found for missing jobs and their related collections', async () => {
      await expect(
        service.getTrainingJobById('missing-job'),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.getTrainingJobRounds('missing-job'),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.getTrainingJobMetrics('missing-job'),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.getTrainingJobLogs('missing-job'),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.getClientsByTrainingJobId('missing-job'),
      ).rejects.toMatchObject({ status: 404 });
    });

    async function createJob() {
      return service.createTrainingJob(ownerId, {
        name: `Training job ${Date.now()}-${Math.random()}`,
      });
    }
  },
);
