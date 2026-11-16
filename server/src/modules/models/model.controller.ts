import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ModelService } from './model.service';
import { Permissions } from '@/common/decorators/auth';
import { RATE_LIMIT } from '@/config';
import { Serialize } from '@/common';
import {
  ModelResponseDto,
  ModelVersionResponseDto,
} from './dto/model-response.dto';

@Controller('models')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Get(':hash/versions')
  @Permissions({ modelUpdate: ['read'] })
  @ApiOperation({ summary: 'List updates aggregated into a model' })
  @ApiParam({ name: 'hash', description: 'Model hash' })
  @ApiOkResponse({ description: 'Model versions, ordered by update time' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(ModelVersionResponseDto)
  async getModelVersions(@Param('hash') hash: string) {
    return this.modelService.getModelVersions(hash);
  }

  @Get(':hash')
  @Permissions({ model: ['read'] })
  @ApiOperation({ summary: 'Get a model by hash' })
  @ApiParam({ name: 'hash', description: 'Model hash' })
  @ApiOkResponse({ description: 'Model details from the database' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(ModelResponseDto)
  async getModelById(@Param('hash') hash: string) {
    return this.modelService.getModelById(hash);
  }

  @Get()
  @Permissions({ model: ['read'] })
  @ApiOperation({ summary: 'List models registered on FLRegistry' })
  @ApiOkResponse({ description: 'Models stored in the database' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(ModelResponseDto)
  async getAllModels() {
    return this.modelService.getAllModels();
  }
}
