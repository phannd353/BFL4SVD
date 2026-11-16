import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { ConfigService } from '@/common';
import { PrismaService } from '@/infrastructure/database';
import {
  FL_PARTICIPANT_AUDIENCE,
  FL_TOKEN_ISSUER,
  deriveParticipantTokenSecret,
} from '@/lib/fl-credentials';
import { ModelUpdatesController } from '@/modules/model-updates/model-updates.controller';
import { ModelUpdatesService } from '@/modules/model-updates/model-updates.service';
import { TrainingJobsController } from '@/modules/training-jobs/training-jobs.controller';
import { TrainingJobsService } from '@/modules/training-jobs/training-jobs.service';
import { TrainingRoundsController } from '@/modules/training-rounds/training-rounds.controller';
import { TrainingRoundsService } from '@/modules/training-rounds/training-rounds.service';
import { BetterAuthGuard } from './auth.guard';
import { RolesGuard } from './role.guard';

const AUTH_SECRET = 'better-auth-secret-for-tests-0123456789abcdef';
const SERVER_TOKEN = 'flower-server-token-for-tests-0123456789abcdef';
const WALLET = '0x00000000000000000000000000000000000000Aa';

const settings: Record<string, unknown> = {
  'betterAuth.secret': AUTH_SECRET,
  'betterAuth.cookiePrefix': 'bfl4svd-auth',
  env: 'test',
  flwrServerToken: SERVER_TOKEN,
};

function participantToken(
  claims: { sub?: string | null; jobId?: string } = {},
  overrides: jwt.SignOptions & { secret?: string } = {},
) {
  const { secret, ...options } = overrides;
  const subject = claims.sub === undefined ? 'user-1' : claims.sub;
  return jwt.sign(
    { jobId: claims.jobId ?? 'job-1' },
    secret ?? deriveParticipantTokenSecret(AUTH_SECRET),
    {
      algorithm: 'HS256',
      ...(subject === null ? {} : { subject }),
      issuer: FL_TOKEN_ISSUER,
      audience: FL_PARTICIPANT_AUDIENCE,
      expiresIn: '1h',
      ...options,
    },
  );
}

const updateBody = {
  score: '95',
  modelHash: 'sha256:model',
  epoch: '5',
  learningRate: '1000',
  batchSize: '32',
  prevModelHash: 'sha256:previous',
  accuracy: '97',
  trainingJobId: 'job-1',
  roundNumber: '1',
};

describe(
  'Flower callback authentication',
  { tags: ['unit', 'training-jobs', 'models'] },
  () => {
    const prisma = {
      user: { findUnique: vi.fn() },
      trainingJobParticipant: { findUnique: vi.fn() },
    };
    const modelUpdates = { create: vi.fn(), update: vi.fn() };
    const rounds = {
      startTrainingRound: vi.fn(),
      recordTrainingRound: vi.fn(),
    };
    const jobs = { finalizeTrainingJobById: vi.fn() };
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [
          ModelUpdatesController,
          TrainingRoundsController,
          TrainingJobsController,
        ],
        providers: [
          { provide: PrismaService, useValue: prisma },
          {
            provide: ConfigService,
            useValue: { get: (k: string) => settings[k] },
          },
          { provide: ModelUpdatesService, useValue: modelUpdates },
          { provide: TrainingRoundsService, useValue: rounds },
          { provide: TrainingJobsService, useValue: jobs },
          // Same guard chain as AppModule.
          { provide: APP_GUARD, useClass: BetterAuthGuard },
          { provide: APP_GUARD, useClass: RolesGuard },
        ],
      }).compile();
      app = moduleRef.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      );
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      vi.resetAllMocks();
      prisma.user.findUnique.mockResolvedValue({
        walletAddress: WALLET,
        banned: false,
        banExpires: null,
      });
      prisma.trainingJobParticipant.findUnique.mockResolvedValue({
        status: 'JOINED',
      });
      modelUpdates.create.mockResolvedValue({ id: 'update-1' });
      modelUpdates.update.mockResolvedValue({ id: 'update-1' });
      rounds.startTrainingRound.mockResolvedValue({ id: 'round-1' });
      rounds.recordTrainingRound.mockResolvedValue({ id: 'round-1' });
      jobs.finalizeTrainingJobById.mockResolvedValue({ id: 'job-1' });
    });

    const post = (path: string, token?: string, body: object = {}) => {
      const req = request(app.getHttpServer()).post(path);
      return (token ? req.set('Authorization', `Bearer ${token}`) : req).send(
        body,
      );
    };

    describe('participant routes (POST /model-updates)', () => {
      it('accepts a valid participant token and uses the current wallet', async () => {
        const response = await post(
          '/model-updates',
          participantToken(),
          updateBody,
        );

        expect(response.status).toBe(201);
        expect(modelUpdates.create).toHaveBeenCalledWith(
          expect.objectContaining({ trainingJobId: 'job-1' }),
          'user-1',
          WALLET,
        );
        expect(prisma.trainingJobParticipant.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { jobId_userId: { jobId: 'job-1', userId: 'user-1' } },
          }),
        );
      });

      it.each([
        ['no credential', undefined],
        ['garbage', 'not-a-jwt'],
        ['the Flower server token', SERVER_TOKEN],
        [
          'a token signed with the raw auth secret',
          participantToken({}, { secret: AUTH_SECRET }),
        ],
        [
          'a token signed with another key',
          participantToken({}, { secret: 'x'.repeat(40) }),
        ],
        [
          'a token with the wrong audience',
          participantToken({}, { audience: 'someone-else' }),
        ],
        [
          'a token with the wrong issuer',
          participantToken({}, { issuer: 'someone-else' }),
        ],
        ['an expired token', participantToken({}, { expiresIn: -60 })],
        ['a token without a subject', participantToken({ sub: null })],
      ])('rejects %s with 401', async (_name, token) => {
        const response = await post('/model-updates', token, updateBody);

        expect(response.status).toBe(401);
        expect(modelUpdates.create).not.toHaveBeenCalled();
      });

      it('rejects an unsigned (alg=none) token', async () => {
        const encode = (value: object) =>
          Buffer.from(JSON.stringify(value)).toString('base64url');
        const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
          sub: 'user-1',
          jobId: 'job-1',
          iss: FL_TOKEN_ISSUER,
          aud: FL_PARTICIPANT_AUDIENCE,
        })}.`;

        const response = await post('/model-updates', token, updateBody);

        expect(response.status).toBe(401);
      });

      it('does not accept a browser session cookie', async () => {
        const session = jwt.sign(
          { user: { id: 'user-1', role: 'admin' } },
          AUTH_SECRET,
          {
            algorithm: 'HS256',
          },
        );

        const response = await request(app.getHttpServer())
          .post('/model-updates')
          .set('Cookie', `bfl4svd-auth.session_data=${session}`)
          .send(updateBody);

        expect(response.status).toBe(401);
        expect(modelUpdates.create).not.toHaveBeenCalled();
      });

      it('rejects a participant who left the job with 403', async () => {
        prisma.trainingJobParticipant.findUnique.mockResolvedValue({
          status: 'LEFT',
        });

        const response = await post(
          '/model-updates',
          participantToken(),
          updateBody,
        );

        expect(response.status).toBe(403);
        expect(modelUpdates.create).not.toHaveBeenCalled();
      });

      it('rejects a user who never joined with 403', async () => {
        prisma.trainingJobParticipant.findUnique.mockResolvedValue(null);

        const response = await post(
          '/model-updates',
          participantToken(),
          updateBody,
        );

        expect(response.status).toBe(403);
      });

      it('rejects a banned or deleted user with 401', async () => {
        prisma.user.findUnique.mockResolvedValueOnce({
          walletAddress: WALLET,
          banned: true,
          banExpires: null,
        });
        const banned = await post(
          '/model-updates',
          participantToken(),
          updateBody,
        );
        prisma.user.findUnique.mockResolvedValueOnce(null);
        const deleted = await post(
          '/model-updates',
          participantToken(),
          updateBody,
        );

        expect(banned.status).toBe(401);
        expect(deleted.status).toBe(401);
        expect(modelUpdates.create).not.toHaveBeenCalled();
      });

      it('ignores an expired ban', async () => {
        prisma.user.findUnique.mockResolvedValue({
          walletAddress: WALLET,
          banned: true,
          banExpires: new Date(Date.now() - 1000),
        });

        const response = await post(
          '/model-updates',
          participantToken(),
          updateBody,
        );

        expect(response.status).toBe(201);
      });

      it('rejects a body that targets a different job than the credential', async () => {
        const response = await post('/model-updates', participantToken(), {
          ...updateBody,
          trainingJobId: 'job-2',
        });

        expect(response.status).toBe(403);
        expect(modelUpdates.create).not.toHaveBeenCalled();
      });

      it('lets a participant change only its own update, scoped to its job', async () => {
        const response = await request(app.getHttpServer())
          .patch('/model-updates/update-1')
          .set('Authorization', `Bearer ${participantToken()}`)
          .send({ score: '96' });

        expect(response.status).toBe(200);
        expect(modelUpdates.update).toHaveBeenCalledWith(
          'update-1',
          { score: '96' },
          { jobId: 'job-1', walletAddress: WALLET },
        );
      });

      it('rejects PATCH without a credential or with the server token', async () => {
        for (const token of [undefined, SERVER_TOKEN]) {
          const req = request(app.getHttpServer()).patch(
            '/model-updates/update-1',
          );
          const response = await (
            token ? req.set('Authorization', `Bearer ${token}`) : req
          ).send({ score: '96' });
          expect(response.status).toBe(401);
        }
        expect(modelUpdates.update).not.toHaveBeenCalled();
      });
    });

    describe.each([
      [
        'POST /training-jobs/:jobId/rounds/start',
        '/training-jobs/job-1/rounds/start',
        { roundNumber: 1, prevModelHash: 'sha256:a' },
        rounds.startTrainingRound,
      ],
      [
        'POST /training-jobs/:jobId/rounds',
        '/training-jobs/job-1/rounds',
        {
          roundNumber: 1,
          aggregatedModelHash: 'sha256:b',
          aggregatedModelSize: 10,
          aggregatedModelFilePath: '/m/b.pkl',
        },
        rounds.recordTrainingRound,
      ],
      [
        'POST /training-jobs/:id/finalize',
        '/training-jobs/job-1/finalize',
        { finalModelHash: 'sha256:c' },
        jobs.finalizeTrainingJobById,
      ],
    ])('server routes (%s)', (_name, path, body, handler) => {
      it('accepts the Flower server token', async () => {
        const response = await post(path, SERVER_TOKEN, body);

        expect(response.status).toBeLessThan(300);
        expect(handler).toHaveBeenCalled();
        // The server credential is not tied to a user, so no DB lookups.
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
      });

      it.each([
        ['no credential', undefined],
        ['a wrong server token', `${SERVER_TOKEN}x`],
        ['a participant token', participantToken()],
        ['a token that is a prefix of the real one', SERVER_TOKEN.slice(0, 20)],
      ])('rejects %s with 401', async (_label, token) => {
        const response = await post(path, token, body);

        expect(response.status).toBe(401);
        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('misconfiguration', () => {
      it('rejects every server callback while FLWR_SERVER_TOKEN is unset or weak', async () => {
        for (const weak of ['', 'short-secret']) {
          settings.flwrServerToken = weak;
          const response = await post(
            '/training-jobs/job-1/finalize',
            weak || 'anything',
            { finalModelHash: 'sha256:c' },
          );
          expect(response.status).toBe(401);
        }
        settings.flwrServerToken = SERVER_TOKEN;
        expect(jobs.finalizeTrainingJobById).not.toHaveBeenCalled();
      });
    });
  },
);
