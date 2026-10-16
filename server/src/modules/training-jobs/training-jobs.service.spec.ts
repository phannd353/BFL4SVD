import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@/infrastructure/database';
import { TrainingJobsService } from './training-jobs.service';

describe('TrainingJobsService', { tags: ['unit', 'training-jobs'] }, () => {
  const prisma = {
    trainingJob: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    trainingJobRound: { findMany: vi.fn() },
    trainingJobLog: { findMany: vi.fn(), create: vi.fn() },
    trainingJobParticipant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    client: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  } as unknown as PrismaService;
  let service: TrainingJobsService;

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction = vi.fn((callback: (transaction: unknown) => unknown) =>
      callback(prisma),
    ) as typeof prisma.$transaction;
    service = new TrainingJobsService(prisma);
  });

  it('creates a draft job and an initial log for its creator', async () => {
    const job = { id: 'job-1', status: 'DRAFT' };
    prisma.trainingJob.create = vi.fn().mockResolvedValue(job);

    await expect(
      service.createTrainingJob('user-1', {
        name: 'Image classifier',
        plannedRounds: 4,
      }),
    ).resolves.toBe(job);
    expect(prisma.trainingJob.create).toHaveBeenCalledWith({
      data: {
        name: 'Image classifier',
        plannedRounds: 4,
        createdById: 'user-1',
        logs: { create: { message: 'Training job created' } },
      },
    });
  });

  it('lists jobs newest first', async () => {
    const jobs = [{ id: 'job-1' }];
    prisma.trainingJob.findMany = vi.fn().mockResolvedValue(jobs);

    await expect(service.getAllTrainingJobs()).resolves.toBe(jobs);
    expect(prisma.trainingJob.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns a job by ID and throws when it is missing', async () => {
    prisma.trainingJob.findUnique = vi
      .fn()
      .mockResolvedValueOnce({ id: 'job-1' })
      .mockResolvedValueOnce(null);

    await expect(service.getTrainingJobById('job-1')).resolves.toEqual({
      id: 'job-1',
    });
    await expect(service.getTrainingJobById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the job status summary', async () => {
    const updatedAt = new Date();
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
      currentRound: 2,
      plannedRounds: 5,
      updatedAt,
    });

    await expect(service.getTrainingJobStatus('job-1')).resolves.toEqual({
      id: 'job-1',
      status: 'RUNNING',
      currentRound: 2,
      plannedRounds: 5,
      updatedAt,
    });
  });

  it('returns rounds in order and requires the job to exist', async () => {
    const rounds = [{ roundNumber: 1 }, { roundNumber: 2 }];
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({ id: 'job-1' });
    prisma.trainingJobRound.findMany = vi.fn().mockResolvedValue(rounds);

    await expect(service.getTrainingJobRounds('job-1')).resolves.toBe(rounds);
    expect(prisma.trainingJobRound.findMany).toHaveBeenCalledWith({
      where: { jobId: 'job-1' },
      orderBy: { roundNumber: 'asc' },
    });
  });

  it('returns only rounds that have metrics', async () => {
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({ id: 'job-1' });
    prisma.trainingJobRound.findMany = vi.fn().mockResolvedValue([
      { roundNumber: 1, metrics: { accuracy: 0.8 } },
      { roundNumber: 2, metrics: null },
    ]);

    await expect(service.getTrainingJobMetrics('job-1')).resolves.toEqual([
      { roundNumber: 1, metrics: { accuracy: 0.8 } },
    ]);
  });

  it('returns logs in chronological order', async () => {
    const logs = [{ message: 'created' }];
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({ id: 'job-1' });
    prisma.trainingJobLog.findMany = vi.fn().mockResolvedValue(logs);

    await expect(service.getTrainingJobLogs('job-1')).resolves.toBe(logs);
    expect(prisma.trainingJobLog.findMany).toHaveBeenCalledWith({
      where: { jobId: 'job-1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('starts a draft job and records the status change', async () => {
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({
      id: 'job-1',
      status: 'DRAFT',
      createdById: 'owner',
    });
    prisma.trainingJob.updateMany = vi.fn().mockResolvedValue({ count: 1 });
    prisma.trainingJob.findUniqueOrThrow = vi
      .fn()
      .mockResolvedValue({ id: 'job-1', status: 'RUNNING' });
    prisma.trainingJobLog.create = vi.fn().mockResolvedValue({});

    await expect(service.startTrainingJob('job-1', 'owner')).resolves.toEqual({
      id: 'job-1',
      status: 'RUNNING',
    });
    expect(prisma.trainingJobLog.create).toHaveBeenCalledWith({
      data: { jobId: 'job-1', message: 'Training job running' },
    });
  });

  it('allows a stopped job to resume and records the transition', async () => {
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({
      id: 'job-1',
      status: 'STOPPED',
      createdById: 'owner',
    });
    prisma.trainingJob.updateMany = vi.fn().mockResolvedValue({ count: 1 });
    prisma.trainingJob.findUniqueOrThrow = vi
      .fn()
      .mockResolvedValue({ id: 'job-1', status: 'RUNNING' });
    prisma.trainingJobLog.create = vi.fn().mockResolvedValue({});

    await service.startTrainingJob('job-1', 'owner');

    expect(prisma.trainingJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: { in: ['DRAFT', 'STOPPED'] } },
      data: { status: 'RUNNING' },
    });
  });

  it('rejects status changes by a non-owner', async () => {
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({
      id: 'job-1',
      status: 'DRAFT',
      createdById: 'owner',
    });

    await expect(
      service.startTrainingJob('job-1', 'other'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.trainingJob.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid status transition', async () => {
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({
      id: 'job-1',
      status: 'COMPLETED',
      createdById: 'owner',
    });

    await expect(
      service.startTrainingJob('job-1', 'owner'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a status change if the job changed concurrently', async () => {
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
      createdById: 'owner',
    });
    prisma.trainingJob.updateMany = vi.fn().mockResolvedValue({ count: 0 });

    await expect(
      service.stopTrainingJob('job-1', 'owner'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists only joined clients with public user data', async () => {
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({ id: 'job-1' });
    prisma.trainingJobParticipant.findMany = vi.fn().mockResolvedValue([
      {
        joinedAt: new Date(),
        client: {
          id: 'client-1',
          walletAddress: null,
          user: { id: 'user-1', name: 'Client', image: null },
        },
      },
    ]);

    await expect(service.getClientsByTrainingJobId('job-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'client-1',
        user: { id: 'user-1', name: 'Client', image: null },
      }),
    ]);
    expect(prisma.trainingJobParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jobId: 'job-1', status: 'JOINED' },
      }),
    );
  });

  it('joins a registered client and logs the membership', async () => {
    prisma.trainingJob.findUnique = vi
      .fn()
      .mockResolvedValue({ id: 'job-1', status: 'DRAFT' });
    prisma.client.findUnique = vi.fn().mockResolvedValue({ id: 'client-1' });
    prisma.trainingJobParticipant.findUnique = vi.fn().mockResolvedValue(null);
    prisma.trainingJobParticipant.upsert = vi.fn().mockResolvedValue({});
    prisma.trainingJobLog.create = vi.fn().mockResolvedValue({});

    await expect(service.joinTrainingJob('job-1', 'user-1')).resolves.toEqual({
      jobId: 'job-1',
      clientId: 'client-1',
      status: 'JOINED',
    });
    expect(prisma.trainingJobParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { jobId: 'job-1', clientId: 'client-1' },
      }),
    );
  });

  it('rejects joining a missing or completed job', async () => {
    prisma.trainingJob.findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'job-1', status: 'COMPLETED' });

    await expect(
      service.joinTrainingJob('missing', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.joinTrainingJob('job-1', 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.client.findUnique).not.toHaveBeenCalled();
  });

  it('requires client registration and rejects duplicate membership', async () => {
    prisma.trainingJob.findUnique = vi
      .fn()
      .mockResolvedValue({ id: 'job-1', status: 'RUNNING' });
    prisma.client.findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'client-1' });
    prisma.trainingJobParticipant.findUnique = vi.fn().mockResolvedValue({
      status: 'JOINED',
    });

    await expect(
      service.joinTrainingJob('job-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.joinTrainingJob('job-1', 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.trainingJobParticipant.upsert).not.toHaveBeenCalled();
  });

  it('allows a client to rejoin after leaving', async () => {
    prisma.trainingJob.findUnique = vi
      .fn()
      .mockResolvedValue({ id: 'job-1', status: 'RUNNING' });
    prisma.client.findUnique = vi.fn().mockResolvedValue({ id: 'client-1' });
    prisma.trainingJobParticipant.findUnique = vi.fn().mockResolvedValue({
      status: 'LEFT',
    });
    prisma.trainingJobParticipant.upsert = vi.fn().mockResolvedValue({});
    prisma.trainingJobLog.create = vi.fn().mockResolvedValue({});

    await service.joinTrainingJob('job-1', 'user-1');

    expect(prisma.trainingJobParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: 'JOINED', joinedAt: expect.any(Date), leftAt: null },
      }),
    );
  });

  it('leaves an active membership and logs the change', async () => {
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({ id: 'job-1' });
    prisma.client.findUnique = vi.fn().mockResolvedValue({ id: 'client-1' });
    prisma.trainingJobParticipant.updateMany = vi
      .fn()
      .mockResolvedValue({ count: 1 });
    prisma.trainingJobLog.create = vi.fn().mockResolvedValue({});

    await expect(service.leaveTrainingJob('job-1', 'user-1')).resolves.toEqual({
      jobId: 'job-1',
      clientId: 'client-1',
      status: 'LEFT',
    });
    expect(prisma.trainingJobParticipant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jobId: 'job-1', clientId: 'client-1', status: 'JOINED' },
      }),
    );
  });

  it('rejects leaving without client registration or an active membership', async () => {
    prisma.trainingJob.findUnique = vi.fn().mockResolvedValue({ id: 'job-1' });
    prisma.client.findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'client-1' });
    prisma.trainingJobParticipant.updateMany = vi
      .fn()
      .mockResolvedValue({ count: 0 });

    await expect(
      service.leaveTrainingJob('job-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.leaveTrainingJob('job-1', 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
