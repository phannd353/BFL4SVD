import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { BlockchainService } from './blockchain.service';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('transactions')
  async getTransactions() {
    const transactions = await this.blockchainService.getTransactions();
    return { status: 'ok', data: transactions };
  }

  @Get('model-updates/:id')
  async getModelUpdate(@Param('id', ParseIntPipe) id: number) {
    const update = await this.blockchainService.getModelUpdate(id);
    return { status: 'ok', data: update };
  }

  @Get('model-updates/:id/events')
  async getModelUpdateEvents(@Param('id', ParseIntPipe) id: number) {
    const events = await this.blockchainService.getModelUpdateEvents(id);
    return { status: 'ok', data: events };
  }

  @Get('health')
  async getBlockchainHealth() {
    const health = await this.blockchainService.getHealth();
    return { status: 'ok', data: health };
  }
}
