import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ModelResponseDto {
  @Expose()
  hash!: string;

  @Expose()
  size!: number;

  @Expose()
  filePath!: string;

  @Expose()
  chainTxHash!: string | null;

  @Expose()
  chainSyncStatus!: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

@Exclude()
export class ModelVersionResponseDto {
  @Expose()
  id!: string;

  @Expose()
  chainUpdateId!: string | null;

  @Expose()
  chainTxHash!: string | null;

  @Expose()
  chainSyncStatus!: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

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
