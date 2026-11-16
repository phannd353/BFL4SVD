import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { TrainingJobParticipantStatus } from '@prisma-generated';
import { PrismaService } from '@/infrastructure/database';
import { Config } from '@/config';
import {
  MIN_SERVER_TOKEN_LENGTH,
  extractBearerToken,
  isValidServerToken,
  verifyParticipantToken,
} from '@/lib/fl-credentials';
import { ConfigService } from '../providers';

export const FL_CALLBACK_KEY = 'flCallbackKind';

export type FlCallbackKind = 'participant' | 'server';

export type FlAuthContext =
  | {
      kind: 'participant';
      userId: string;
      /** The only job this credential may act on. */
      jobId: string;
      /** Current wallet address, read from the database at request time. */
      walletAddress: string | null;
    }
  | { kind: 'server' };

declare global {
  namespace Express {
    interface Request {
      flAuth?: FlAuthContext;
    }
  }
}

/**
 * Authenticates Flower callbacks. Applied through `@FlCallback(kind)`, which
 * also bypasses the browser-session guard: these routes accept only the Flower
 * credential for their `kind`, sent as `Authorization: Bearer <token>`, and
 * never a browser session.
 */
@Injectable()
export class FlCallbackGuard implements CanActivate {
  private readonly logger = new Logger(FlCallbackGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<Config>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const kind = this.reflector.getAllAndOverride<FlCallbackKind | undefined>(
      FL_CALLBACK_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Fail closed if the guard is ever attached without a declared kind.
    if (kind !== 'participant' && kind !== 'server') {
      throw new UnauthorizedException('Authentication required');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    request.flAuth =
      kind === 'server'
        ? this.authenticateServer(token)
        : await this.authenticateParticipant(token);
    return true;
  }

  private authenticateServer(token: string): FlAuthContext {
    const expected = this.config.get('flwrServerToken');
    if (expected.length < MIN_SERVER_TOKEN_LENGTH) {
      this.logger.error(
        `FLWR_SERVER_TOKEN is missing or shorter than ${MIN_SERVER_TOKEN_LENGTH} characters; rejecting Flower server callbacks`,
      );
      throw new UnauthorizedException('Authentication required');
    }
    if (!isValidServerToken(token, expected)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { kind: 'server' };
  }

  private async authenticateParticipant(token: string): Promise<FlAuthContext> {
    let claims: { userId: string; jobId: string };
    try {
      claims = verifyParticipantToken(
        token,
        this.config.get('betterAuth.secret'),
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired credentials');
    }

    // Re-check against the database so leaving a job, being banned, or
    // relinking a wallet takes effect immediately instead of at token expiry.
    const [user, membership] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: claims.userId },
        select: { walletAddress: true, banned: true, banExpires: true },
      }),
      this.prisma.trainingJobParticipant.findUnique({
        where: { jobId_userId: { jobId: claims.jobId, userId: claims.userId } },
        select: { status: true },
      }),
    ]);
    const isBanned =
      Boolean(user?.banned) &&
      (!user?.banExpires || user.banExpires.getTime() > Date.now());
    if (!user || isBanned) {
      throw new UnauthorizedException('Invalid or expired credentials');
    }
    if (membership?.status !== TrainingJobParticipantStatus.JOINED) {
      throw new ForbiddenException('You are not participating in this job');
    }

    return {
      kind: 'participant',
      userId: claims.userId,
      jobId: claims.jobId,
      walletAddress: user.walletAddress,
    };
  }
}
