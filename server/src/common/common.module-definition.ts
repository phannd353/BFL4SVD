import { ConfigurableModuleBuilder } from '@nestjs/common';
import { CommonOptionDto } from './dto';

export const {
  ConfigurableModuleClass,
  ASYNC_OPTIONS_TYPE,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<CommonOptionDto>()
  .setClassMethodName('forRoot')
  .build();
