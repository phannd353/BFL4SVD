import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BlockchainEventResponseDto {
  @Expose()
  event!: string;

  @Expose()
  blockNumber!: number;

  @Expose()
  transactionHash!: string;

  @Expose()
  logIndex!: number;

  @Expose()
  args!: Record<string, unknown>;
}

@Exclude()
export class BlockchainModelUpdateResponseDto {
  @Expose()
  id!: string;

  @Expose()
  trainingJobId!: string;

  @Expose()
  roundNumber!: string;

  @Expose()
  clientAddress!: string;

  @Expose()
  score!: string;

  @Expose()
  modelHash!: string;

  @Expose()
  epoch!: string;

  @Expose()
  learningRate!: string;

  @Expose()
  batchSize!: string;

  @Expose()
  prevModelHash!: string;

  @Expose()
  accuracy!: string;

  @Expose()
  timestamp!: string;
}

@Exclude()
export class BlockchainHealthResponseDto {
  @Expose()
  connected!: boolean;

  @Expose()
  chainId!: string;

  @Expose()
  blockNumber!: number;

  @Expose()
  contractAddress!: string;

  @Expose()
  contractDeployed!: boolean;
}
