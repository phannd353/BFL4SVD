import { ClassSerializerInterceptor, Module, Scope } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';

import { CommonModule, ConfigService } from '@/common';
import { BetterAuthGuard, RolesGuard } from '@/common/guards';
import { configuration, RATE_LIMIT } from '@/config';
import { SerializeResponseInterceptor } from './common/interceptors/serialize-response.interceptor';
import { CatchEverythingFilter, HttpExceptionsFilter } from './common/filters';
import { AuthModule } from './modules/auth/auth.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { ModelModule } from './modules/models/model.module';
import { ModelUpdateModule } from './modules/model-updates/model-updates.module';
import { TrainingJobsModule } from './modules/training-jobs/training-jobs.module';
import { TrainingRoundsModule } from './modules/training-rounds/training-rounds.module';
import { PrismaModule } from './infrastructure/database';

@Module({
  imports: [
    CommonModule.forRoot({
      cachePrefix: 'gateway',
      configuration,
    }),
    ThrottlerModule.forRoot(Object.values(RATE_LIMIT.DEFAULT)),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('betterAuth.secret'),
        signOptions: { algorithm: 'RS256' },
      }),
    }),
    PrismaModule.forRoot(),
    AuthModule,
    BlockchainModule,
    ModelModule,
    ModelUpdateModule,
    TrainingJobsModule,
    TrainingRoundsModule,
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
