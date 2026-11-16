import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { randomBytes } from 'node:crypto';
import { getAddress, isAddress, verifyMessage } from 'ethers';
import { JwtService } from '@nestjs/jwt';

import { Prisma } from '@prisma-generated';
import { ConfigService } from '@/common';
import { createBetterAuthInstance } from '@/lib/auth';
import { PrismaService } from '@/infrastructure/database';
import { Config } from '@/config';
import {
  FL_PARTICIPANT_AUDIENCE,
  FL_PARTICIPANT_TOKEN_TTL,
  FL_TOKEN_ISSUER,
  deriveParticipantTokenSecret,
} from '@/lib/fl-credentials';

type AuthInstance = ReturnType<typeof createBetterAuthInstance>;
type AuthApi = AuthInstance['api'];

@Injectable()
export class AuthService {
  private readonly auth: ReturnType<typeof createBetterAuthInstance>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Config>,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.auth = createBetterAuthInstance(config, prisma);
  }

  get api() {
    return this.auth.api as AuthApi;
  }
  get instance() {
    return this.auth as AuthInstance;
  }

  async userInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        walletAddress: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async generateTrainingAuthToken(userId: string, jobId: string) {
    const user = await this.userInfo(userId);

    if (!user.walletAddress) {
      throw new BadRequestException(
        'User does not have a linked wallet address',
      );
    }
    // Minimal claims: the guard re-reads the user and membership from the
    // database on every callback. The key is derived from the Better Auth
    // secret and the audience is distinct, so this token is not a browser
    // session. The JwtModule default is RS256, which cannot sign with a
    // symmetric key, hence the explicit HS256.
    return this.jwtService.sign(
      { jobId },
      {
        secret: deriveParticipantTokenSecret(
          this.config.get('betterAuth.secret'),
        ),
        algorithm: 'HS256',
        subject: user.id,
        issuer: FL_TOKEN_ISSUER,
        audience: FL_PARTICIPANT_AUDIENCE,
        expiresIn: FL_PARTICIPANT_TOKEN_TTL,
      },
    );
  }

  async issueTrainingAuthToken(userId: string, jobId: string) {
    const token = await this.generateTrainingAuthToken(userId, jobId);
    const payload = this.jwtService.decode<{ exp?: number } | null>(token);
    if (!payload?.exp) {
      throw new Error('Issued training token has no expiry');
    }
    return { token, expiresAt: new Date(payload.exp * 1000) };
  }

  async createWalletChallenge(userId: string) {
    const cachedMessage = await this.cacheManager.get(
      this.walletChallengeKey(userId),
    );
    if (cachedMessage) return { message: cachedMessage };

    const nonce = randomBytes(32).toString('hex');
    const message = [
      'Connect this wallet to your BFL4SVD account.',
      `User: ${userId}`,
      `Nonce: ${nonce}`,
    ].join('\n');
    await this.cacheManager.set(
      this.walletChallengeKey(userId),
      message,
      5 * 60 * 1000,
    );
    return { message };
  }

  async verifyWalletSignature(
    userId: string,
    walletAddress: string,
    signature: string,
  ) {
    const challengeKey = this.walletChallengeKey(userId);
    const message = await this.cacheManager.get<string>(challengeKey);
    if (!message) {
      throw new BadRequestException(
        'Wallet verification challenge expired; please try again',
      );
    }
    await this.cacheManager.del(challengeKey);

    if (!isAddress(walletAddress)) {
      throw new BadRequestException('Invalid wallet address');
    }
    const normalizedAddress = getAddress(walletAddress);
    let signerAddress: string;
    try {
      signerAddress = getAddress(verifyMessage(message, signature));
    } catch {
      throw new BadRequestException('Wallet signature is invalid');
    }
    if (signerAddress !== normalizedAddress) {
      throw new BadRequestException(
        'Signature does not match the connected wallet',
      );
    }

    const existingWallet = await this.prisma.user.findFirst({
      where: {
        walletAddress: { equals: normalizedAddress, mode: 'insensitive' },
        NOT: { id: userId },
      },
      select: { id: true },
    });
    if (existingWallet) {
      throw new ConflictException(
        'This wallet is already linked to another account',
      );
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { walletAddress: normalizedAddress },
        select: { id: true, walletAddress: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This wallet is already linked to another account',
        );
      }
      Logger.error(
        'Failed to save verified wallet address',
        error instanceof Error ? error.stack : String(error),
        AuthService.name,
      );
      throw error;
    }
  }

  private walletChallengeKey(userId: string) {
    return `wallet-link-challenge:${userId}`;
  }
}
