import { Exclude, Expose, Type } from 'class-transformer';
import { ModelUpdateResponseDto } from '@/modules/model-updates/dto/model-update-response.dto';

@Exclude()
export class TrainingRoundResponseDto {
  @Expose()
  id!: string;

  @Expose()
  jobId!: string;

  @Expose()
  roundNumber!: number;

  @Expose()
  status!: 'RUNNING' | 'STOPPED' | 'COMPLETED';

  @Expose()
  chainTxHash!: string | null;

  @Expose()
  chainSyncStatus!: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

  @Expose()
  gasUsed!: string | null;

  @Expose()
  aggregatedModelHash!: string | null;

  @Expose()
  metrics!: unknown;

  @Expose()
  startedAt!: Date;

  @Expose()
  completedAt!: Date | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  @Type(() => ModelUpdateResponseDto)
  modelUpdates!: ModelUpdateResponseDto[];
}

@Exclude()
export class TrainingRoundMetricsResponseDto {
  @Expose()
  roundNumber!: number;

  @Expose()
  metrics!: unknown;

  @Expose()
  chainTxHash!: string | null;

  @Expose()
  chainSyncStatus!: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

  @Expose()
  gasUsed!: string | null;

  @Expose()
  aggregatedModelHash!: string | null;

  @Expose()
  createdAt!: Date;
}
