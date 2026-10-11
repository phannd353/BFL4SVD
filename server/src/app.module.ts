import { ClassSerializerInterceptor, Module, Scope } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CacheInterceptor } from '@nestjs/cache-manager';

import { CommonModule } from '@/common';
import { BetterAuthGuard, RolesGuard } from '@/common/guards';
import { configuration, RATE_LIMIT } from '@/config';
import { SerializeResponseInterceptor } from './common/interceptors/serialize-response.interceptor';
import { CatchEverythingFilter, HttpExceptionsFilter } from './common/filters';
import { AuthModule } from './modules/auth/auth.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { ClientModule } from './modules/clients/client.module';
import { ModelModule } from './modules/models/model.module';
import { TrainingJobsModule } from './modules/training-jobs/training-jobs.module';
import { PrismaModule } from './infrastructure/database';

@Module({
  imports: [
    CommonModule.forRoot({
      cachePrefix: 'gateway',
      configuration,
    }),
    ThrottlerModule.forRoot(Object.values(RATE_LIMIT.DEFAULT)),
    PrismaModule.forRoot(),
    AuthModule,
    BlockchainModule,
    ClientModule,
    ModelModule,
    TrainingJobsModule,
  ],
  providers: [
    // Global guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: BetterAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
      scope: Scope.REQUEST,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializeResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    // Global pipes
    // Global filters
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionsFilter,
    },
  ],
})
export class AppModule {}
