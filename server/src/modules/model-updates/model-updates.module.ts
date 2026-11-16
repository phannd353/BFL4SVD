import { Module } from '@nestjs/common';

import { BlockchainModule } from '../blockchain/blockchain.module';
import { ModelUpdatesController } from './model-updates.controller';
import { ModelUpdatesService } from './model-updates.service';

@Module({
  imports: [BlockchainModule],
  controllers: [ModelUpdatesController],
  providers: [ModelUpdatesService],
})
export class ModelUpdateModule {}
