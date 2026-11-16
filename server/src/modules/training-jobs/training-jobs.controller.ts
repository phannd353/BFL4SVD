import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '@/common/decorators/auth/user.decorator';
import { FlCallback, Permissions } from '@/common/decorators/auth';
import { RATE_LIMIT } from '@/config';
import { Serialize } from '@/common';
import {
  CreateTrainingJobDto,
  FinalizeTrainingJobDto,
  StopTrainingJobDto,
  UpdateTrainingJobDto,
} from './dto';
import { TrainingJobsService } from './training-jobs.service';
import {
  TrainingJobJoinConfigResponseDto,
  TrainingJobLogResponseDto,
  TrainingJobMembershipResponseDto,
  TrainingJobParticipantResponseDto,
  TrainingJobResponseDto,
  TrainingJobStatusResponseDto,
} from './dto';

@Controller('training-jobs')
export class TrainingJobsController {
  constructor(private readonly trainingJobsService: TrainingJobsService) {}

  @Get(':id/status')
  @Permissions({ trainingJob: ['read'] })
  @ApiOperation({ summary: 'Get training job status and round progress' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Training job status' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobStatusResponseDto)
  async getTrainingJobStatus(@Param('id') id: string) {
    return this.trainingJobsService.getTrainingJobStatus(id);
  }

  @Get(':id/logs')
  @Permissions({ trainingJobLog: ['read'] })
  @ApiOperation({ summary: 'List logs for a training job' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Training job logs in creation order' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobLogResponseDto)
  async getTrainingJobLogs(@Param('id') id: string) {
    return await this.trainingJobsService.getTrainingJobLogs(id);
  }

  @Post(':id/stop')
  @Permissions({ trainingJob: ['stop'] })
  @ApiOperation({ summary: 'Stop a running training job' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiCreatedResponse({ description: 'Training job stopped' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobResponseDto)
  async stopTrainingJob(
    @Param('id') id: string,
    @Body() input: StopTrainingJobDto,
  ) {
    return await this.trainingJobsService.stopTrainingJob(id, input.reason);
  }

  @Post(':id/cancel')
  @Permissions({ trainingJob: ['cancel'] })
  @ApiOperation({ summary: 'Cancel a waiting training job' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiCreatedResponse({ description: 'Training job cancelled' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobResponseDto)
  async cancelTrainingJob(@Param('id') id: string) {
    return await this.trainingJobsService.cancelTrainingJob(id);
  }

  @Post(':id/start')
  @Permissions({ trainingJob: ['start'] })
  @ApiOperation({ summary: 'Start a waiting or stopped training job' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiCreatedResponse({ description: 'Training job started' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobResponseDto)
  async startTrainingJob(@Param('id') id: string) {
    return await this.trainingJobsService.startTrainingJob(id);
  }

  @Get(':id/participants')
  @Permissions({ trainingJobParticipant: ['read'] })
  @ApiOperation({ summary: 'List participants for a training job' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Joined training job users' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobParticipantResponseDto)
  async getParticipantsByTrainingJobId(@Param('id') id: string) {
    return await this.trainingJobsService.getParticipantsByTrainingJobId(id);
  }

  @Post(':id/join')
  @Permissions({ trainingJobParticipant: ['join'] })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a training job as the current user' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Training job membership created' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobMembershipResponseDto)
  async joinTrainingJob(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingJobsService.joinTrainingJob(id, userId);
  }

  // POST (not GET): issues a fresh secret token per call, so the response must
  // never be served from the global GET response cache.
  @Post(':id/join-config')
  @Permissions({ trainingJobParticipant: ['join'] })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Issue the participant token and settings used to build the Flower SuperNode/SuperExec Docker commands',
  })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiOkResponse({
    description: 'Join configuration containing a secret token',
  })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobJoinConfigResponseDto)
  async getJoinConfig(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingJobsService.getJoinConfig(id, userId);
  }

  @Post(':id/leave')
  @Permissions({ trainingJobParticipant: ['leave'] })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a training job as the current user' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Training job membership ended' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobMembershipResponseDto)
  async leaveTrainingJob(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingJobsService.leaveTrainingJob(id, userId);
  }

  @Get(':id')
  @Permissions({ trainingJob: ['read'] })
  @ApiOperation({ summary: 'Get a training job by ID' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Training job details' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobResponseDto)
  async getTrainingJobById(
    @Param('id') id: string,
    @CurrentUser('role') role: string,
  ) {
    return this.trainingJobsService.getTrainingJobById(id, role === 'admin');
  }

  @Post(':id/finalize')
  @FlCallback('server')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize a training job with its final model' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Training job finalized' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobResponseDto)
  async finalizeTrainingJobById(
    @Param('id') id: string,
    @Body() input: FinalizeTrainingJobDto,
  ) {
    return this.trainingJobsService.finalizeTrainingJobById(
      id,
      input.finalModelHash,
    );
  }

  @Patch(':id')
  @Permissions({ trainingJob: ['update'] })
  @ApiOperation({ summary: 'Update an unpublished training job' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Training job updated' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobResponseDto)
  async updateTrainingJob(
    @Param('id') id: string,
    @Body() input: UpdateTrainingJobDto,
  ) {
    return this.trainingJobsService.updateTrainingJob(id, input);
  }

  @Delete(':id')
  @Permissions({ trainingJob: ['delete'] })
  @ApiOperation({ summary: 'Delete an unpublished training job' })
  @ApiParam({ name: 'id', description: 'Training job ID' })
  @Throttle(RATE_LIMIT.INTERNAL)
  async deleteTrainingJob(@Param('id') id: string) {
    await this.trainingJobsService.deleteTrainingJob(id);
    return { success: true };
  }

  @Get()
  @Permissions({ trainingJob: ['read'] })
  @ApiOperation({ summary: 'List training jobs' })
  @ApiOkResponse({ description: 'Training jobs ordered by creation time' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobResponseDto)
  async getAllTrainingJobs(@CurrentUser('role') role: string) {
    return await this.trainingJobsService.getAllTrainingJobs(role === 'admin');
  }

  @Post()
  @Permissions({ trainingJob: ['create'] })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a training job' })
  @ApiCreatedResponse({ description: 'Training job created' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingJobResponseDto)
  async createTrainingJob(
    @CurrentUser('id') userId: string,
    @Body() input: CreateTrainingJobDto,
  ) {
    return this.trainingJobsService.createTrainingJob(userId, input);
  }
}
