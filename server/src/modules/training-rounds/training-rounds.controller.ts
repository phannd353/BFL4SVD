import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { FlCallback, Permissions } from '@/common/decorators/auth';
import { Serialize } from '@/common';
import { RATE_LIMIT } from '@/config';
import {
  RecordTrainingRoundDto,
  StartTrainingRoundDto,
  TrainingRoundMetricsResponseDto,
  TrainingRoundResponseDto,
} from './dto';
import { TrainingRoundsService } from './training-rounds.service';

@Controller('training-jobs/:jobId')
export class TrainingRoundsController {
  constructor(private readonly trainingRoundsService: TrainingRoundsService) {}

  @Get('rounds')
  @Permissions({ trainingJobRound: ['read'] })
  @ApiOperation({ summary: 'List rounds recorded for a training job' })
  @ApiParam({ name: 'jobId', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Training rounds in round-number order' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingRoundResponseDto)
  async getTrainingJobRounds(@Param('jobId') jobId: string) {
    return this.trainingRoundsService.getTrainingJobRounds(jobId);
  }

  @Post('rounds/start')
  @FlCallback('server')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a training round before client training' })
  @ApiParam({ name: 'jobId', description: 'Training job ID' })
  @ApiCreatedResponse({ description: 'Training round started' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingRoundResponseDto)
  async startTrainingRound(
    @Param('jobId') jobId: string,
    @Body() input: StartTrainingRoundDto,
  ) {
    return this.trainingRoundsService.startTrainingRound(jobId, input);
  }

  @Post('rounds')
  @FlCallback('server')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Report the active training round: complete it with its aggregated model, or store metrics while it is still running',
  })
  @ApiParam({ name: 'jobId', description: 'Training job ID' })
  @ApiCreatedResponse({ description: 'Training round recorded' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingRoundResponseDto)
  async recordTrainingRound(
    @Param('jobId') jobId: string,
    @Body() input: RecordTrainingRoundDto,
  ) {
    return this.trainingRoundsService.recordTrainingRound(jobId, input);
  }

  @Get('metrics')
  @Permissions({ trainingJobRound: ['read'] })
  @ApiOperation({ summary: 'List available metrics for a training job' })
  @ApiParam({ name: 'jobId', description: 'Training job ID' })
  @ApiOkResponse({ description: 'Round metrics and model update references' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(TrainingRoundMetricsResponseDto)
  async getTrainingJobMetrics(@Param('jobId') jobId: string) {
    return this.trainingRoundsService.getTrainingJobMetrics(jobId);
  }
}
