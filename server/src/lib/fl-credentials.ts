import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import * as jwt from 'jsonwebtoken';

/**
 * Credentials used by Flower processes when they call back into the API.
 *
 * Two distinct principals, never interchangeable and never valid as a browser
 * session:
 *  - participant: a Flower ClientApp acting for one user in one training job.
 *    A short-lived JWT issued by the API (`POST /training-jobs/:id/join-config`).
 *  - server: the Flower ServerApp. A deployment secret supplied through the
 *    ServerApp container environment. It must never be placed in the Flower
 *    run config, because Flower shares run config with every participant.
 */

export const FL_TOKEN_ISSUER = 'bfl4svd-api';
export const FL_PARTICIPANT_AUDIENCE = 'bfl4svd:fl-participant';
export const FL_PARTICIPANT_TOKEN_TTL = '3d';
export const MIN_SERVER_TOKEN_LENGTH = 32;

const PARTICIPANT_KEY_CONTEXT = 'bfl4svd:fl-participant-token:v1';

export interface ParticipantTokenClaims {
  userId: string;
  jobId: string;
}

/**
 * Derives the participant-token signing key from the Better Auth secret so a
 * participant token can never validate as a browser session token (which is
 * signed with the raw secret) and vice versa.
 */
export function deriveParticipantTokenSecret(authSecret: string): string {
  if (!authSecret) {
    throw new Error('Authentication secret is not configured');
  }
  return createHmac('sha256', authSecret)
    .update(PARTICIPANT_KEY_CONTEXT)
    .digest('hex');
}

/** Throws a `jsonwebtoken` error when the token is invalid or expired. */
export function verifyParticipantToken(
  token: string,
  authSecret: string,
): ParticipantTokenClaims {
  const payload = jwt.verify(
    token,
    deriveParticipantTokenSecret(authSecret),
    {
      algorithms: ['HS256'],
      issuer: FL_TOKEN_ISSUER,
      audience: FL_PARTICIPANT_AUDIENCE,
    },
  );
  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    typeof payload.jobId !== 'string' ||
    !payload.jobId
  ) {
    throw new jwt.JsonWebTokenError('invalid participant token claims');
  }
  return { userId: payload.sub, jobId: payload.jobId };
}

/** Constant-time comparison; refuses to match when no strong secret is set. */
export function isValidServerToken(
  presented: string,
  expected: string,
): boolean {
  if (expected.length < MIN_SERVER_TOKEN_LENGTH) return false;
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function extractBearerToken(
  header: string | string[] | undefined,
): string | undefined {
  if (typeof header !== 'string') return undefined;
  const match = /^Bearer ([^\s]+)$/i.exec(header.trim());
  return match?.[1];
}
