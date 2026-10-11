import { Module, Logger as NestLogger } from '@nestjs/common';
import {
  LoggerModule as PinoLoggerModule,
  Logger as PinoLogger,
} from 'nestjs-pino';

import { loggerOptions } from './logger.config';

@Module({
  imports: [PinoLoggerModule.forRoot(loggerOptions)],
  providers: [
    {
      provide: NestLogger,
      useExisting: PinoLogger,
    },
  ],
  exports: [NestLogger],
})
export class LoggerModule {}
