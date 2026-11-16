import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { BlockchainService } from './blockchain.service';
import { Permissions } from '@/common/decorators/auth';
import { RATE_LIMIT } from '@/config';
import { Serialize } from '@/common';
import {
  BlockchainEventResponseDto,
  BlockchainHealthResponseDto,
  BlockchainModelUpdateResponseDto,
} from './dto/blockchain-response.dto';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('transactions')
  @Permissions({ blockchainEvent: ['read'] })
  @ApiOperation({ summary: 'List FLRegistry contract events' })
  @ApiOkResponse({ description: 'Blockchain events in block order' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(BlockchainEventResponseDto)
  async getTransactions() {
    return this.blockchainService.getTransactions();
  }

  @Get('model-updates/:id')
  @Permissions({ modelUpdate: ['read'] })
  @ApiOperation({ summary: 'Get a model update by ID' })
  @ApiParam({ name: 'id', description: 'Numeric model update ID' })
  @ApiOkResponse({ description: 'Model update details' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(BlockchainModelUpdateResponseDto)
  async getModelUpdate(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.getModelUpdate(id);
  }

  @Get('model-updates/:id/events')
  @Permissions({ blockchainEvent: ['read'] })
  @ApiOperation({ summary: 'List events associated with a model update' })
  @ApiParam({ name: 'id', description: 'Numeric model update ID' })
  @ApiOkResponse({ description: 'Events associated with the model update' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(BlockchainEventResponseDto)
  async getModelUpdateEvents(@Param('id', ParseIntPipe) id: number) {
    return this.blockchainService.getModelUpdateEvents(id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check FLRegistry RPC and contract connectivity' })
  @ApiOkResponse({ description: 'Blockchain connection status' })
  @Throttle(RATE_LIMIT.INTERNAL)
  @Serialize(BlockchainHealthResponseDto)
  async getBlockchainHealth() {
    return this.blockchainService.getHealth();
  }
}
