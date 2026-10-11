import { configuration } from '@/config';
import { PrismaModule } from '@/infrastructure/database';
import { AuthModule } from '@/modules/auth/auth.module';
import { Test, TestingModule } from '@nestjs/testing';
import { CommonModule } from '@/common';
import { AuthHelper } from './auth.helper';
import { InfrastructureHelper } from './infrastructure.helper';

export async function createTestingAppModule(
  infraHelper: InfrastructureHelper,
) {
  const dbUrl = infraHelper.getPgConnectionStr();
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      CommonModule.forRoot({
        configuration: () =>
          ({
            ...configuration(),
            db: {
              directUrl: dbUrl,
              url: dbUrl,
            },
            redis: {
              url: infraHelper.getRedisConnectionStr(),
            },
          }) as ReturnType<typeof configuration>,
        cachePrefix: 'auth-service',
        global: true,
      }),
      PrismaModule.forRoot(),
      AuthModule,
    ],
    providers: [AuthHelper],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('/api/v1');

  const port = process.env.NODE_PORT || 3000;

  app.enableShutdownHooks();
  await app.startAllMicroservices();
  await app.listen(port);

  return app;
}
