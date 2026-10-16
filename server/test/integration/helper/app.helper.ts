import { configuration } from '@/config';
import { PrismaModule } from '@/infrastructure/database';
import { AuthModule } from '@/modules/auth/auth.module';
import { Test, TestingModule } from '@nestjs/testing';
import { CommonModule } from '@/common';
import { AuthHelper } from './auth.helper';
import { InfrastructureHelper } from './infrastructure.helper';
import { ClientModule } from '@/modules/clients/client.module';
import { TrainingJobsModule } from '@/modules/training-jobs/training-jobs.module';
import { BlockchainModule } from '@/modules/blockchain/blockchain.module';
import { ModelModule } from '@/modules/models/model.module';

export async function createTestingAppModule(
  infraHelper: InfrastructureHelper,
) {
  const dbUrl = infraHelper.getPgConnectionStr();
  const flRegistryAddress = await infraHelper.getFLRegistryAddress();
  const availablePort = await infraHelper.getAvailablePort();
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      CommonModule.forRoot({
        configuration: () =>
          ({
            ...configuration(),
            port: availablePort,
            db: {
              directUrl: dbUrl,
              url: dbUrl,
            },
            redis: {
              url: infraHelper.getRedisConnectionStr(),
            },
            jsonRpcUrl: infraHelper.getAnvilConnectionStr(),
            FLRegistryAddress: flRegistryAddress,
          }) as ReturnType<typeof configuration>,
        cachePrefix: 'bfl4svd-test',
        global: true,
      }),
      PrismaModule.forRoot(),
      AuthModule,
      ClientModule,
      TrainingJobsModule,
      BlockchainModule,
      ModelModule,
    ],
    providers: [AuthHelper],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('/api/v1');

  app.enableShutdownHooks();
  await app.startAllMicroservices();
  await app.listen(availablePort);

  return app;
}
