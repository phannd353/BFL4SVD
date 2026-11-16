import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { FlAuth, FlCallback, Permissions } from '@/common/decorators/auth';
import type { FlAuthContext } from '@/common/guards/fl-callback.guard';
import { Serialize } from '@/common';
import { RATE_LIMIT } from '@/config';
import {
  CreateModelUpdateDto,
  ModelUpdateResponseDto,
  UpdateModelUpdateDto,
} from './dto/model-update.dto';
import { ModelUpdatesService } from './model-updates.service';

@Controller('model-updates')
export class ModelUpdatesController {
  constructor(private readonly modelUpdatesService: ModelUpdatesService) {}

  @Post()
  @FlCallback('participant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a model update record' })
  @ApiCreatedResponse({ description: 'Model update created' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(ModelUpdateResponseDto)
  async create(
    @FlAuth() auth: FlAuthContext,
    @Body() input: CreateModelUpdateDto,
  ) {
    const participant = this.requireParticipant(auth);
    // The job comes from the credential, never from the request body alone.
    if (input.trainingJobId !== participant.jobId) {
      throw new ForbiddenException(
        'This credential cannot submit updates to that training job',
      );
    }
    return this.modelUpdatesService.create(
      input,
      participant.userId,
      participant.walletAddress ?? undefined,
    );
  }

  @Get()
  @Permissions({ modelUpdate: ['read'] })
  @ApiOperation({ summary: 'List persisted model updates' })
  @ApiOkResponse({ description: 'Model updates ordered by creation time' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(ModelUpdateResponseDto)
  async findAll() {
    return this.modelUpdatesService.findAll();
  }

  @Get(':id')
  @Permissions({ modelUpdate: ['read'] })
  @ApiOperation({ summary: 'Get a persisted model update' })
  @ApiParam({ name: 'id', description: 'Persisted model update ID' })
  @ApiOkResponse({ description: 'Model update details' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(ModelUpdateResponseDto)
  async findOne(@Param('id') id: string) {
    return this.modelUpdatesService.findOne(id);
  }

  @Patch(':id')
  @FlCallback('participant')
  @ApiOperation({
    summary:
      'Update your own model update before chain finalization (participant credential)',
  })
  @ApiParam({ name: 'id', description: 'Persisted model update ID' })
  @ApiOkResponse({ description: 'Model update changed' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(ModelUpdateResponseDto)
  async update(
    @Param('id') id: string,
    @FlAuth() auth: FlAuthContext,
    @Body() input: UpdateModelUpdateDto,
  ) {
    const participant = this.requireParticipant(auth);
    if (!participant.walletAddress) {
      throw new ForbiddenException(
        'Link a verified wallet before changing model updates',
      );
    }
    return this.modelUpdatesService.update(id, input, {
      jobId: participant.jobId,
      walletAddress: participant.walletAddress,
    });
  }

  @Delete(':id')
  @Permissions({ modelUpdate: ['delete'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a model update before chain finalization' })
  @ApiParam({ name: 'id', description: 'Persisted model update ID' })
  @ApiNoContentResponse({ description: 'Model update deleted' })
  @Throttle(RATE_LIMIT.INTERNAL)
  async remove(@Param('id') id: string) {
    await this.modelUpdatesService.remove(id);
  }

  private requireParticipant(auth: FlAuthContext) {
    if (auth.kind !== 'participant') {
      throw new ForbiddenException('A participant credential is required');
    }
    return auth;
  }
}
