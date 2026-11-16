import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

import {
  FL_PARTICIPANT_AUDIENCE,
  FL_TOKEN_ISSUER,
  verifyParticipantToken,
} from '@/lib/fl-credentials';
import { AuthService } from './auth.service';

const SECRET = 'test-secret-with-enough-entropy-0123456789';

function createService(user: Record<string, unknown> | null) {
  // Mirror app.module.ts, whose JwtModule defaults to RS256 even though the
  // Better Auth secret is symmetric.
  const jwtService = new JwtService({
    secret: SECRET,
    signOptions: { algorithm: 'RS256' },
  });
  const service = Object.create(AuthService.prototype) as AuthService;
  Object.assign(service, {
    prisma: { user: { findUnique: vi.fn().mockResolvedValue(user) } },
    config: { get: () => SECRET },
    jwtService,
  });
  return service;
}

describe('AuthService training tokens', { tags: ['unit'] }, () => {
  const user = {
    id: 'user-1',
    name: 'Participant',
    image: null,
    walletAddress: '0x0000000000000000000000000000000000000001',
  };

  it('issues a participant-scoped HS256 token with minimal claims', async () => {
    const token = await createService(user).generateTrainingAuthToken(
      'user-1',
      'job-1',
    );

    expect(verifyParticipantToken(token, SECRET)).toEqual({
      userId: 'user-1',
      jobId: 'job-1',
    });
    const { header, payload } = jwt.decode(token, {
      complete: true,
    }) as jwt.Jwt & { payload: jwt.JwtPayload };
    expect(header.alg).toBe('HS256');
    expect(payload).toMatchObject({
      sub: 'user-1',
      jobId: 'job-1',
      iss: FL_TOKEN_ISSUER,
      aud: FL_PARTICIPANT_AUDIENCE,
    });
    // No profile data or wallet in a token that appears in process arguments.
    expect(Object.keys(payload).sort()).toEqual(
      ['aud', 'exp', 'iat', 'iss', 'jobId', 'sub'].sort(),
    );
  });

  it('is not usable as a browser session token', async () => {
    const token = await createService(user).generateTrainingAuthToken(
      'user-1',
      'job-1',
    );

    expect(() =>
      jwt.verify(token, SECRET, { algorithms: ['HS256'] }),
    ).toThrow();
  });

  it('returns the token expiry for display', async () => {
    const before = Date.now();
    const { token, expiresAt } = await createService(
      user,
    ).issueTrainingAuthToken('user-1', 'job-1');

    const { exp } = jwt.decode(token) as jwt.JwtPayload;
    expect(expiresAt.getTime()).toBe(exp! * 1000);
    expect(expiresAt.getTime()).toBeGreaterThan(before + 2.9 * 86_400_000);
  });

  it('requires a linked wallet address', async () => {
    await expect(
      createService({ ...user, walletAddress: null }).generateTrainingAuthToken(
        'user-1',
        'job-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
