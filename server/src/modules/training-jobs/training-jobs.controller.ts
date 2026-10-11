import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/auth/user.decorator';
import { CreateTrainingJobDto } from './dto';
import { TrainingJobsService } from './training-jobs.service';

@Controller('training-jobs')
export class TrainingJobsController {
  constructor(private readonly trainingJobsService: TrainingJobsService) {}

  @Get(':id/status')
  async getTrainingJobStatus(@Param('id') id: string) {
    const status = await this.trainingJobsService.getTrainingJobStatus(id);
    return { status: 'ok', data: status };
  }

  @Get(':id/rounds')
  async getTrainingJobRounds(@Param('id') id: string) {
    const rounds = await this.trainingJobsService.getTrainingJobRounds(id);
    return { status: 'ok', data: rounds };
  }

  @Get(':id/metrics')
  async getTrainingJobMetrics(@Param('id') id: string) {
    const metrics = await this.trainingJobsService.getTrainingJobMetrics(id);
    return { status: 'ok', data: metrics };
  }

  @Get(':id/logs')
  async getTrainingJobLogs(@Param('id') id: string) {
    const logs = await this.trainingJobsService.getTrainingJobLogs(id);
    return { status: 'ok', data: logs };
  }

  @Post(':id/stop')
  async stopTrainingJob(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const job = await this.trainingJobsService.stopTrainingJob(id, userId);
    return { status: 'ok', data: job };
  }

  @Post(':id/start')
  async startTrainingJob(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const job = await this.trainingJobsService.startTrainingJob(id, userId);
    return { status: 'ok', data: job };
  }

  @Get(':id/clients')
  async getClientsByTrainingJobId(@Param('id') id: string) {
    const clients =
      await this.trainingJobsService.getClientsByTrainingJobId(id);
    return { status: 'ok', data: clients };
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  async joinTrainingJob(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const membership = await this.trainingJobsService.joinTrainingJob(
      id,
      userId,
    );
    return { status: 'ok', data: membership };
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  async leaveTrainingJob(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const membership = await this.trainingJobsService.leaveTrainingJob(
      id,
      userId,
    );
    return { status: 'ok', data: membership };
  }

  @Get(':id')
  async getTrainingJobById(@Param('id') id: string) {
    const job = await this.trainingJobsService.getTrainingJobById(id);
    return { status: 'ok', data: job };
  }

  @Get()
  async getAllTrainingJobs() {
    const jobs = await this.trainingJobsService.getAllTrainingJobs();
    return { status: 'ok', data: jobs };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTrainingJob(
    @CurrentUser('id') userId: string,
    @Body() input: CreateTrainingJobDto,
  ) {
    const job = await this.trainingJobsService.createTrainingJob(userId, input);
    return { status: 'ok', data: job };
  }
}
