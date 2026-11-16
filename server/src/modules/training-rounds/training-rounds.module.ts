import { Module } from '@nestjs/common';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { TrainingRoundsController } from './training-rounds.controller';
import { TrainingRoundsService } from './training-rounds.service';

@Module({
  imports: [BlockchainModule],
  controllers: [TrainingRoundsController],
  providers: [TrainingRoundsService],
})
export class TrainingRoundsModule {}
