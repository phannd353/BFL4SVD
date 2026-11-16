import { Module } from '@nestjs/common';

import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuthModule } from '../auth/auth.module';
import { TrainingJobsController } from './training-jobs.controller';
import { TrainingJobsService } from './training-jobs.service';
import { TrainingJobWorker } from './training-jobs.worker';

@Module({
  imports: [AuthModule, BlockchainModule],
  controllers: [TrainingJobsController],
  providers: [TrainingJobsService, TrainingJobWorker],
})
export class TrainingJobsModule {}
