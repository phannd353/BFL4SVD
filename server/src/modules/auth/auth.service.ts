import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { ConfigService } from '@/common';
import { createBetterAuthInstance } from '@/lib/auth';
import { PrismaService } from '@/infrastructure/database';
import { Config } from '@/config';

type AuthInstance = ReturnType<typeof createBetterAuthInstance>;
type AuthApi = AuthInstance['api'];

@Injectable()
export class AuthService {
  private readonly auth: ReturnType<typeof createBetterAuthInstance>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Config>,
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
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
