import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get('flower')
  flower() {
    return { status: 'ok' };
  }

  @Get('blockchain')
  blockchain() {
    return { status: 'ok' };
  }

  @Get()
  healthCheck() {
    return { status: 'ok' };
  }
}
