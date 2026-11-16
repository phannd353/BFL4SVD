import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigService } from '@/common';
import { PrismaService } from '@/infrastructure/database';
import { AuthService } from '../auth/auth.service';
import { TrainingJobsService } from './training-jobs.service';

describe(
  'TrainingJobsService join configuration',
  { tags: ['unit', 'training-jobs'] },
  () => {
    const mocks = {
      trainingJob: { findUnique: vi.fn() },
      trainingJobParticipant: { findUnique: vi.fn() },
    };
    const authService = { issueTrainingAuthToken: vi.fn() };
    const settings: Record<string, string> = {
      flwrSuperlinkEndpoint: 'superlink.example.com:9092',
      flwrSupernodeImage: 'flwr/supernode:test',
      flwrSuperexecImage: 'registry.example.com/bfl4svd-superexec:test',
    };
    const config = { get: (key: string) => settings[key] };
    const expiresAt = new Date('2099-01-04T00:00:00.000Z');
    let service: TrainingJobsService;

    beforeEach(() => {
      vi.resetAllMocks();
      authService.issueTrainingAuthToken.mockResolvedValue({
        token: 'participant-token',
        expiresAt,
      });
      service = new TrainingJobsService(
        mocks as unknown as PrismaService,
        authService as unknown as AuthService,
        config as unknown as ConfigService,
        {} as never,
      );
    });

    it.each(['WAITING', 'RUNNING'])(
      'issues a participant token and connection settings for a %s job',
      async (status) => {
        mocks.trainingJobParticipant.findUnique.mockResolvedValue({
          status: 'JOINED',
        });
        mocks.trainingJob.findUnique.mockResolvedValue({ id: 'job-1', status });

        await expect(service.getJoinConfig('job-1', 'user-1')).resolves.toEqual(
          {
            jobId: 'job-1',
            authToken: 'participant-token',
            expiresAt,
            superlinkAddress: 'superlink.example.com:9092',
            supernodeImage: 'flwr/supernode:test',
            superexecImage: 'registry.example.com/bfl4svd-superexec:test',
            defaultSupernodePort: 9005,
            datasetContainerPath: '/data',
          },
        );
        expect(authService.issueTrainingAuthToken).toHaveBeenCalledWith(
          'user-1',
          'job-1',
        );
      },
    );

    it('rejects users who never joined or have left the job', async () => {
      mocks.trainingJobParticipant.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ status: 'LEFT' });

      await expect(
        service.getJoinConfig('job-1', 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.getJoinConfig('job-1', 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(authService.issueTrainingAuthToken).not.toHaveBeenCalled();
    });

    it.each(['DRAFT', 'STOPPED', 'COMPLETED', 'CANCELLED', 'FAILED'])(
      'does not issue a token for a %s job',
      async (status) => {
        mocks.trainingJobParticipant.findUnique.mockResolvedValue({
          status: 'JOINED',
        });
        mocks.trainingJob.findUnique.mockResolvedValue({ id: 'job-1', status });

        await expect(
          service.getJoinConfig('job-1', 'user-1'),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(authService.issueTrainingAuthToken).not.toHaveBeenCalled();
      },
    );

    it('reports a missing job', async () => {
      mocks.trainingJobParticipant.findUnique.mockResolvedValue({
        status: 'JOINED',
      });
      mocks.trainingJob.findUnique.mockResolvedValue(null);

      await expect(
        service.getJoinConfig('job-1', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  },
);
