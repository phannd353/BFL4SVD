import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ModelUpdateResponseDto {
  @Expose()
  id!: string;

  @Expose()
  chainUpdateId!: string | null;

  @Expose()
  chainTxHash!: string | null;

  @Expose()
  chainSyncStatus!: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

  @Expose()
  trainingRoundId!: string;

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
  metrics!: unknown;

  @Expose()
  timestamp!: Date;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
