import { RATE_LIMIT } from '@/config';
import { Serialize } from '@/common';
import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { HealthResponseDto } from './health-response.dto';

@Controller('health')
export class HealthController {
  @Get('flower')
  @Throttle(RATE_LIMIT.DEFAULT)
  @Serialize(HealthResponseDto)
  flower() {
    return { status: 'ok' };
  }

  @Get('blockchain')
  @Throttle(RATE_LIMIT.DEFAULT)
  @Serialize(HealthResponseDto)
  blockchain() {
    return { status: 'ok' };
  }

  @Get()
  @Throttle(RATE_LIMIT.DEFAULT)
  @Serialize(HealthResponseDto)
  healthCheck() {
    return { status: 'ok' };
  }
}
