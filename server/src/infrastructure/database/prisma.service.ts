import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma-generated';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@/common';
import { Config } from '@/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly logger: Logger,
  ) {
    const adapter = new PrismaPg({
      connectionString: configService.get('db.url'),
    });
    super({ adapter, log: ['query', 'info', 'warn', 'error'] });
  }

  async onModuleInit() {
    await Promise.race([
      this.$connect().then(() =>
        this.logger.log('Prisma connected to the database'),
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Prisma connection timeout')), 5000),
      ),
    ]);
  }

  async onModuleDestroy() {
    await Promise.race([
      this.$disconnect().then(() =>
        this.logger.log('Prisma disconnected from the database'),
      ),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Prisma disconnection timeout')),
          5000,
        ),
      ),
    ]);
  }
}
