import { Module } from '@nestjs/common';

import { TrainingJobsController } from './training-jobs.controller';
import { TrainingJobsService } from './training-jobs.service';

@Module({
  controllers: [TrainingJobsController],
  providers: [TrainingJobsService],
})
export class TrainingJobsModule {}
