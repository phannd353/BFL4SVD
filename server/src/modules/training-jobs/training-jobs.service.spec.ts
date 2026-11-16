import { EventEmitter } from 'node:events';
import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: spawnMock }));

import { PrismaService } from '@/infrastructure/database';
import { TrainingJobsService } from './training-jobs.service';
import { TrainingJobWorker } from './training-jobs.worker';
import { ConfigService } from '@nestjs/config';
import { configuration } from '@/config';

describe(
  'TrainingJobsService lifecycle',
  { tags: ['unit', 'training-jobs'] },
  () => {
    const mocks = {
      trainingJob: {
        create: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      trainingJobLog: { create: vi.fn(), findMany: vi.fn() },
      trainingJobRound: { updateMany: vi.fn() },
      trainingJobParticipant: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      blockchainTransaction: {
        groupBy: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      model: { findUnique: vi.fn(), update: vi.fn() },
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
    };
    const prisma = mocks as unknown as PrismaService;
    const blockchain = {
      createTrainingJob: vi.fn(),
      updateTrainingJob: vi.fn(),
      syncTrainingJobStatus: vi.fn(),
      getTransactionGasUsed: vi.fn(),
    };
    let service: TrainingJobsService;
    let worker: TrainingJobWorker;

    beforeEach(() => {
      vi.resetAllMocks();
      spawnMock.mockImplementation(() => {
        const child = new EventEmitter();
        queueMicrotask(() => child.emit('spawn'));
        return child;
      });
      mocks.trainingJob.findMany.mockResolvedValue([]);
      mocks.trainingJob.update.mockImplementation(
        ({ where, data }: { where: { id: string }; data: object }) =>
          Promise.resolve({ id: where.id, ...data }),
      );
      mocks.trainingJob.updateMany.mockResolvedValue({ count: 0 });
      mocks.trainingJob.deleteMany.mockResolvedValue({ count: 0 });
      mocks.$queryRaw.mockResolvedValue([]);
      mocks.trainingJobLog.create.mockResolvedValue({});
      mocks.trainingJobRound.updateMany.mockResolvedValue({ count: 1 });
      mocks.blockchainTransaction.groupBy.mockResolvedValue([]);
      mocks.blockchainTransaction.findMany.mockResolvedValue([]);
      mocks.blockchainTransaction.upsert.mockResolvedValue({});
      mocks.blockchainTransaction.update.mockResolvedValue({});
      blockchain.getTransactionGasUsed.mockResolvedValue(null);
      mocks.model.update.mockResolvedValue({});
      blockchain.createTrainingJob.mockImplementation(
        async (...args: unknown[]) => {
          const onSubmitted = args[4] as (txHash: string) => Promise<void>;
          const onMined = args[5] as (
            txHash: string,
            gasUsed: bigint,
          ) => Promise<void>;
          await onSubmitted('0xjob');
          await onMined('0xjob', 100n);
          return { jobId: 1n, txHash: '0xjob' };
        },
      );
      blockchain.updateTrainingJob.mockResolvedValue('0xjob-update');
      blockchain.syncTrainingJobStatus.mockImplementation(
        async (jobId, status, onSubmitted, onMined) => {
          const txHash = `0x${jobId}-${status}`;
          await onSubmitted?.(txHash);
          await onMined?.(txHash, 100n);
          return txHash;
        },
      );
      mocks.$transaction.mockImplementation(
        async (callback: (transaction: unknown) => unknown) => callback(prisma),
      );
      service = new TrainingJobsService(
        prisma,
        {} as never,
        new ConfigService(configuration()),
        blockchain as never,
      );
      worker = new TrainingJobWorker(
        prisma,
        new Logger(),
        new ConfigService(configuration()),
        blockchain as never,
        service,
      );
    });

    it('creates a draft with publication and start schedules', async () => {
      const publishAt = '2099-01-01T10:00:00.000Z';
      const startAt = '2099-01-01T11:00:00.000Z';
      const created = {
        id: 'job-1',
        status: 'DRAFT',
        name: 'Image classifier',
        initialModelHash: 'sha256:initial',
        plannedRounds: 30,
        chainJobId: null,
      };
      mocks.trainingJob.create.mockResolvedValue(created);

      await expect(
        service.createTrainingJob('admin-1', {
          name: 'Image classifier',
          publishAt,
          startAt,
        }),
      ).resolves.toMatchObject({
        id: 'job-1',
        chainJobId: 1n,
        chainSyncStatus: 'CONFIRMED',
      });
      expect(mocks.trainingJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Image classifier',
          publishAt: new Date(publishAt),
          startAt: new Date(startAt),
          createdById: 'admin-1',
        }),
      });
      expect(blockchain.createTrainingJob).toHaveBeenCalledWith(
        'job-1',
        'Image classifier',
        'sha256:initial',
        30,
        expect.any(Function),
        expect.any(Function),
      );
      expect(mocks.blockchainTransaction.upsert).toHaveBeenCalledWith({
        where: { txHash: '0xjob' },
        create: { txHash: '0xjob', jobId: 'job-1' },
        update: {},
      });
      expect(mocks.blockchainTransaction.update).toHaveBeenCalledWith({
        where: { txHash: '0xjob' },
        data: { gasUsed: 100n },
      });
    });

    it('reconciles an unsynced draft with an idempotent on-chain job create', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'DRAFT',
        name: 'Image classifier',
        initialModelHash: 'sha256:initial',
        plannedRounds: 30,
        chainJobId: null,
      });

      await expect(service.reconcileChain('job-1')).resolves.toMatchObject({
        id: 'job-1',
        chainJobId: 1n,
        chainSyncStatus: 'CONFIRMED',
      });
      expect(blockchain.createTrainingJob).toHaveBeenCalledWith(
        'job-1',
        'Image classifier',
        'sha256:initial',
        30,
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('confirms an on-chain status already applied before reconciliation', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'RUNNING',
        chainJobId: 1n,
      });
      blockchain.syncTrainingJobStatus.mockResolvedValue(null);

      await expect(service.reconcileChain('job-1')).resolves.toMatchObject({
        id: 'job-1',
        chainSyncStatus: 'CONFIRMED',
      });
      expect(mocks.trainingJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { chainSyncStatus: 'CONFIRMED' },
      });
    });

    it('sums confirmed transaction gas for each training job as a string', async () => {
      mocks.trainingJob.findMany.mockResolvedValue([
        { id: 'job-1', name: 'Job one' },
        { id: 'job-2', name: 'Job two' },
      ]);
      mocks.blockchainTransaction.groupBy.mockResolvedValue([
        { jobId: 'job-1', _sum: { gasUsed: 21000n } },
      ]);

      await expect(service.getAllTrainingJobs()).resolves.toEqual([
        { id: 'job-1', name: 'Job one', gasUsed: '21000' },
        { id: 'job-2', name: 'Job two', gasUsed: null },
      ]);
    });

    it('reconciles gas for mined transactions after a process restart', async () => {
      mocks.blockchainTransaction.findMany.mockResolvedValue([
        { txHash: '0xconfirmed' },
        { txHash: '0xpending' },
      ]);
      blockchain.getTransactionGasUsed
        .mockResolvedValueOnce(42000n)
        .mockResolvedValueOnce(null);

      await service.reconcilePendingBlockchainTransactionGas();

      expect(mocks.blockchainTransaction.update).toHaveBeenCalledOnce();
      expect(mocks.blockchainTransaction.update).toHaveBeenCalledWith({
        where: { txHash: '0xconfirmed' },
        data: { gasUsed: 42000n },
      });
    });

    it('requires the start time to be after publication', async () => {
      await expect(
        service.createTrainingJob('admin-1', {
          name: 'Invalid schedule',
          publishAt: '2099-01-01T11:00:00.000Z',
          startAt: '2099-01-01T10:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.trainingJob.create).not.toHaveBeenCalled();
    });

    it('excludes draft jobs from non-admin listings', async () => {
      mocks.trainingJob.findMany.mockResolvedValue([]);

      await service.getAllTrainingJobs(false);

      expect(mocks.trainingJob.findMany).toHaveBeenCalledWith({
        where: { status: { not: 'DRAFT' } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('hides draft jobs from non-admin detail lookups', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'DRAFT',
      });

      await expect(
        service.getTrainingJobById('job-1', false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates an unpublished job before its publication time', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'DRAFT',
        publishedAt: null,
        publishAt: new Date('2099-01-01T10:00:00.000Z'),
        startAt: new Date('2099-01-01T11:00:00.000Z'),
      });
      mocks.trainingJob.updateMany.mockResolvedValue({ count: 1 });
      mocks.trainingJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        name: 'Updated',
        initialModelHash: 'sha256:initial',
        plannedRounds: 30,
        chainJobId: 1n,
      });

      await expect(
        service.updateTrainingJob('job-1', { name: 'Updated' }),
      ).resolves.toMatchObject({
        id: 'job-1',
        chainSyncStatus: 'CONFIRMED',
      });
      expect(mocks.trainingJob.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'job-1',
          status: 'DRAFT',
          publishedAt: null,
          publishAt: { gt: expect.any(Date) },
        },
        data: {
          name: 'Updated',
          publishAt: new Date('2099-01-01T10:00:00.000Z'),
          startAt: new Date('2099-01-01T11:00:00.000Z'),
        },
      });
    });

    it('rejects edits and deletion after publication', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'DRAFT',
        publishedAt: new Date(),
        publishAt: new Date('2099-01-01T10:00:00.000Z'),
        startAt: new Date('2099-01-01T11:00:00.000Z'),
      });

      await expect(
        service.updateTrainingJob('job-1', { name: 'Changed' }),
      ).rejects.toBeInstanceOf(ConflictException);
      mocks.trainingJob.findUnique.mockResolvedValueOnce({
        id: 'job-1',
        status: 'DRAFT',
        publishedAt: new Date(),
        publishAt: new Date('2099-01-01T10:00:00.000Z'),
        startAt: new Date('2099-01-01T11:00:00.000Z'),
      });
      await expect(service.deleteTrainingJob('job-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mocks.trainingJob.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'job-1',
          status: 'DRAFT',
          publishedAt: null,
          publishAt: { gt: expect.any(Date) },
        },
      });
    });

    it('sets the final model and completes a running training job', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'RUNNING',
        finalModelHash: null,
      });
      mocks.model.findUnique.mockResolvedValue({ hash: 'sha256:final' });
      mocks.trainingJob.updateMany.mockResolvedValue({ count: 1 });
      mocks.trainingJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: 'COMPLETED',
        finalModelHash: 'sha256:final',
      });

      await expect(
        service.finalizeTrainingJobById('job-1', 'sha256:final'),
      ).resolves.toMatchObject({
        status: 'COMPLETED',
        finalModelHash: 'sha256:final',
      });
      expect(mocks.trainingJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'job-1', status: 'RUNNING' },
        data: {
          finalModelHash: 'sha256:final',
          status: 'COMPLETED',
        },
      });
      expect(mocks.trainingJobLog.create).toHaveBeenCalledWith({
        data: {
          jobId: 'job-1',
          message: 'Training job completed with final model sha256:final',
        },
      });
    });

    it('rejects finalization when the final model is not registered', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'RUNNING',
        finalModelHash: null,
      });
      mocks.model.findUnique.mockResolvedValue(null);

      await expect(
        service.finalizeTrainingJobById('job-1', 'sha256:missing'),
      ).rejects.toThrow('Final model not found');
      expect(mocks.trainingJob.updateMany).not.toHaveBeenCalled();
    });

    it('returns an already-finalized job for a retry with the same model', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'COMPLETED',
        finalModelHash: 'sha256:final',
      });
      mocks.trainingJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: 'COMPLETED',
        finalModelHash: 'sha256:final',
      });

      await expect(
        service.finalizeTrainingJobById('job-1', 'sha256:final'),
      ).resolves.toMatchObject({ finalModelHash: 'sha256:final' });
      expect(mocks.model.findUnique).not.toHaveBeenCalled();
      expect(mocks.trainingJob.updateMany).not.toHaveBeenCalled();
    });

    it('publishes and starts due jobs exactly once', async () => {
      mocks.trainingJob.findMany
        .mockResolvedValueOnce([{ id: 'job-1' }])
        .mockResolvedValueOnce([
          {
            id: 'job-1',
            batchSize: 32,
            plannedRounds: 5,
            learningRate: 0.001,
            epochs: 10,
            initialModelHash: 'sha256:initial',
            chainJobId: 1n,
          },
        ]);
      mocks.trainingJob.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 });

      await worker.processScheduledJobs();

      expect(mocks.trainingJob.updateMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'job-1',
            status: 'DRAFT',
            publishedAt: null,
          }),
          data: { status: 'WAITING', publishedAt: expect.any(Date) },
        }),
      );
      expect(mocks.trainingJob.updateMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'job-1',
            status: 'WAITING',
            startAt: { lte: expect.any(Date) },
          }),
          data: {
            status: 'RUNNING',
            startedAt: expect.any(Date),
          },
        }),
      );
      expect(mocks.trainingJobLog.create).toHaveBeenCalledTimes(2);
      expect(spawnMock).toHaveBeenCalledOnce();
    });

    it('does not launch Flower when another worker claims the job first', async () => {
      mocks.trainingJob.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'job-1' }]);
      mocks.trainingJob.updateMany.mockResolvedValueOnce({ count: 0 });

      await worker.processScheduledJobs();

      expect(spawnMock).not.toHaveBeenCalled();
      expect(mocks.trainingJobLog.create).not.toHaveBeenCalled();
    });

    it('marks a claimed job failed when the Flower process exits unsuccessfully', async () => {
      mocks.trainingJob.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'job-1',
            batchSize: 32,
            plannedRounds: 5,
            learningRate: 0.001,
            epochs: 10,
            initialModelHash: 'sha256:initial',
            chainJobId: 1n,
          },
        ]);
      mocks.trainingJob.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 });
      const child = new EventEmitter();
      spawnMock.mockImplementationOnce(() => {
        queueMicrotask(() => child.emit('spawn'));
        return child;
      });

      await worker.processScheduledJobs();
      child.emit('close', 1, null);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mocks.trainingJob.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'job-1', status: 'RUNNING' },
        data: {
          status: 'FAILED',
          failureReason: 'Flower training process failed',
        },
      });
      expect(mocks.trainingJobLog.create).toHaveBeenCalledWith({
        data: {
          jobId: 'job-1',
          message: 'Flower training process failed',
        },
      });
    });

    it('marks a claimed job failed when Flower cannot be spawned', async () => {
      mocks.trainingJob.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'job-1',
            batchSize: 32,
            plannedRounds: 5,
            learningRate: 0.001,
            epochs: 10,
            initialModelHash: 'sha256:initial',
            chainJobId: 1n,
          },
        ]);
      mocks.trainingJob.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 });
      spawnMock.mockImplementationOnce(() => {
        const child = new EventEmitter();
        queueMicrotask(() => child.emit('error', new Error('spawn failed')));
        return child;
      });

      await worker.processScheduledJobs();

      expect(mocks.trainingJob.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'job-1', status: 'RUNNING' },
        data: {
          status: 'FAILED',
          failureReason: 'Flower training process failed',
        },
      });
    });

    it('cancels a waiting job before its scheduled start time', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'WAITING',
        startAt: new Date(Date.now() + 60_000),
        startedAt: null,
        chainJobId: 1n,
      });
      mocks.trainingJob.updateMany.mockResolvedValue({ count: 1 });
      mocks.trainingJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: 'CANCELLED',
        chainJobId: 1n,
      });

      await expect(service.cancelTrainingJob('job-1')).resolves.toEqual({
        id: 'job-1',
        chainTxHash: '0x1-CANCELLED',
        chainSyncStatus: 'CONFIRMED',
        gasUsed: null,
      });
      expect(mocks.trainingJob.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'job-1',
          status: 'WAITING',
          startedAt: null,
          startAt: { gt: expect.any(Date) },
        },
        data: { status: 'CANCELLED' },
      });
    });

    it('marks a scheduled job failed when publication processing errors', async () => {
      mocks.trainingJob.findMany
        .mockResolvedValueOnce([{ id: 'job-1' }])
        .mockResolvedValueOnce([]);
      mocks.trainingJob.updateMany
        .mockRejectedValueOnce(new Error('publication update failed'))
        .mockResolvedValueOnce({ count: 1 });

      await worker.processScheduledJobs();

      expect(mocks.trainingJob.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'job-1', status: 'DRAFT' },
        data: {
          status: 'FAILED',
          failureReason: 'Scheduled publication failed',
        },
      });
      expect(mocks.trainingJobLog.create).toHaveBeenCalledWith({
        data: { jobId: 'job-1', message: 'Scheduled publication failed' },
      });
    });

    it('requires and stores a stopping reason', async () => {
      await expect(
        service.stopTrainingJob('job-1', '  '),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.$transaction).not.toHaveBeenCalled();

      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'RUNNING',
        startedAt: new Date(),
        currentRound: 0,
      });
      mocks.trainingJob.updateMany.mockResolvedValue({ count: 1 });
      mocks.trainingJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: 'STOPPED',
        stoppingReason: 'Insufficient data',
        chainJobId: 1n,
      });

      await service.stopTrainingJob('job-1', '  Insufficient data  ');
      expect(mocks.trainingJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'job-1', status: { in: ['RUNNING'] } },
        data: {
          status: 'STOPPED',
          stoppingReason: 'Insufficient data',
        },
      });
      expect(mocks.trainingJobLog.create).toHaveBeenCalledWith({
        data: {
          jobId: 'job-1',
          message: 'Training job stopped: Insufficient data',
        },
      });
      expect(mocks.trainingJobRound.updateMany).toHaveBeenCalledWith({
        where: {
          jobId: 'job-1',
          roundNumber: 1,
          status: 'RUNNING',
        },
        data: { status: 'STOPPED' },
      });
    });

    it('resumes the stopped active round with its training job', async () => {
      mocks.trainingJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: 'RUNNING',
        chainJobId: 1n,
      });
      mocks.trainingJob.findUnique
        .mockResolvedValueOnce({
          id: 'job-1',
          status: 'STOPPED',
          publishedAt: new Date(Date.now() - 60_000),
          startAt: new Date(Date.now() - 30_000),
          chainJobId: 1n,
        })
        .mockResolvedValueOnce({
          id: 'job-1',
          status: 'STOPPED',
          startedAt: new Date(),
          currentRound: 2,
          chainJobId: 1n,
        });
      mocks.trainingJob.updateMany.mockResolvedValue({ count: 1 });

      await service.startTrainingJob('job-1');

      expect(mocks.trainingJobRound.updateMany).toHaveBeenCalledWith({
        where: {
          jobId: 'job-1',
          roundNumber: 3,
          status: 'STOPPED',
        },
        data: { status: 'RUNNING' },
      });
    });

    it('allows joining only within the published pre-start window', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'WAITING',
        publishedAt: new Date(Date.now() - 60_000),
        startAt: new Date(Date.now() + 60_000),
        startedAt: null,
      });
      mocks.trainingJobParticipant.findUnique.mockResolvedValue(null);
      mocks.trainingJobParticipant.upsert.mockResolvedValue({});

      await expect(service.joinTrainingJob('job-1', 'user-1')).resolves.toEqual(
        {
          jobId: 'job-1',
          userId: 'user-1',
          status: 'JOINED',
        },
      );
      expect(mocks.trainingJobParticipant.upsert).toHaveBeenCalled();
    });

    it('rejects joining before publication or at/after start time', async () => {
      mocks.trainingJob.findUnique
        .mockResolvedValueOnce({
          id: 'job-1',
          status: 'WAITING',
          publishedAt: null,
          startAt: new Date(Date.now() + 60_000),
          startedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'job-1',
          status: 'RUNNING',
          publishedAt: new Date(Date.now() - 60_000),
          startAt: new Date(Date.now() - 1),
          startedAt: new Date(),
        });

      await expect(
        service.joinTrainingJob('job-1', 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.joinTrainingJob('job-1', 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mocks.trainingJobParticipant.upsert).not.toHaveBeenCalled();
    });

    it('rejects leaving after the scheduled start time', async () => {
      mocks.trainingJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'RUNNING',
        startedAt: new Date(),
        startAt: new Date(Date.now() - 60_000),
      });

      await expect(
        service.leaveTrainingJob('job-1', 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mocks.trainingJobParticipant.updateMany).not.toHaveBeenCalled();
    });
  },
);
