import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { ModelService } from './model.service';

@Controller('models')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Get(':id/versions')
  async getModelVersions(@Param('id', ParseIntPipe) id: number) {
    const versions = await this.modelService.getModelVersions(id);
    return { status: 'ok', data: versions };
  }

  @Get(':id')
  async getModelById(@Param('id', ParseIntPipe) id: number) {
    const model = await this.modelService.getModelById(id);
    return { status: 'ok', data: model };
  }

  @Get()
  async getAllModels() {
    const models = await this.modelService.getAllModels();
    return { status: 'ok', data: models };
  }
}
