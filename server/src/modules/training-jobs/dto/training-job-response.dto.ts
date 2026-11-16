import { UserBriefResponseDto } from '@/modules/auth/dto';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class TrainingJobResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string | null;

  @Expose()
  status!:
    | 'DRAFT'
    | 'WAITING'
    | 'RUNNING'
    | 'STOPPED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'FAILED';

  @Expose()
  chainTxHash!: string | null;

  @Expose()
  chainSyncStatus!: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

  @Expose()
  gasUsed!: string | null;

  @Expose()
  createdById!: string | null;

  @Expose()
  plannedRounds!: number | null;

  @Expose()
  currentRound!: number;

  @Expose()
  epochs!: number | null;

  @Expose()
  batchSize!: number | null;

  @Expose()
  learningRate!: number | null;

  @Expose()
  initialModelHash!: string;

  @Expose()
  finalModelHash!: string | null;

  @Expose()
  publishAt!: Date;

  @Expose()
  publishedAt!: Date | null;

  @Expose()
  startAt!: Date | null;

  @Expose()
  startedAt!: Date | null;

  @Expose()
  stoppingReason!: string | null;

  @Expose()
  failureReason!: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

@Exclude()
export class TrainingJobStatusResponseDto {
  @Expose()
  id!: string;

  @Expose()
  status!:
    | 'DRAFT'
    | 'WAITING'
    | 'RUNNING'
    | 'STOPPED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'FAILED';

  @Expose()
  currentRound!: number;

  @Expose()
  plannedRounds!: number | null;

  @Expose()
  updatedAt!: Date;
}

@Exclude()
export class TrainingJobLogResponseDto {
  @Expose()
  id!: string;

  @Expose()
  jobId!: string;

  @Expose()
  level!: string;

  @Expose()
  message!: string;

  @Expose()
  createdAt!: Date;
}

@Exclude()
export class TrainingJobParticipantResponseDto {
  @Expose()
  id!: string;

  @Expose()
  @Type(() => UserBriefResponseDto)
  user!: UserBriefResponseDto;

  @Expose()
  joinedAt!: Date;
}

@Exclude()
export class TrainingJobJoinConfigResponseDto {
  @Expose()
  jobId!: string;

  /** Secret participant credential; show only to the participant. */
  @Expose()
  authToken!: string;

  @Expose()
  expiresAt!: Date;

  /** `host:port` of the Flower SuperLink reachable by participants. */
  @Expose()
  superlinkAddress!: string;

  @Expose()
  supernodeImage!: string;

  @Expose()
  superexecImage!: string;

  @Expose()
  defaultSupernodePort!: number;

  @Expose()
  datasetContainerPath!: string;
}

@Exclude()
export class TrainingJobMembershipResponseDto {
  @Expose()
  jobId!: string;

  @Expose()
  userId!: string;

  @Expose()
  status!: 'JOINED' | 'LEFT';
}
