import { Module } from '@nestjs/common';

import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { ContractService } from '@/common';

@Module({
  controllers: [BlockchainController],
  providers: [BlockchainService, ContractService],
})
export class BlockchainModule {}
