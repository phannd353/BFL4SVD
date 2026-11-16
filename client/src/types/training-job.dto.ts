import type {
  ChainSyncStatusDto,
  JsonValueDto,
  ModelUpdateResponseDto,
} from "./model.dto";
import type { UserBriefResponseDto } from "./user.dto";

export type TrainingJobStatusDto =
  | "DRAFT"
  | "WAITING"
  | "RUNNING"
  | "STOPPED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export type TrainingJobParticipantStatusDto = "JOINED" | "LEFT";

export interface CreateTrainingJobRequestDto {
  name: string;
  publishAt: string;
  startAt: string;
  initialModelHash: string;
  description?: string;
  plannedRounds?: number;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
}

export interface TrainingJobResponseDto {
  id: string;
  name: string;
  description: string | null;
  status: TrainingJobStatusDto;
  chainTxHash: string | null;
  chainSyncStatus: ChainSyncStatusDto;
  gasUsed: string | null;
  createdById: string | null;
  plannedRounds: number | null;
  currentRound: number;
  epochs: number | null;
  batchSize: number | null;
  learningRate: number | null;
  initialModelHash: string;
  finalModelHash: string | null;
  publishAt: string;
  publishedAt: string | null;
  startAt: string | null;
  startedAt: string | null;
  stoppingReason: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateTrainingJobRequestDto = Partial<CreateTrainingJobRequestDto>;

export interface TrainingJobStatusResponseDto {
  id: string;
  status: TrainingJobStatusDto;
  currentRound: number;
  plannedRounds: number | null;
  updatedAt: string;
}

export interface TrainingJobRoundResponseDto {
  id: string;
  jobId: string;
  roundNumber: number;
  status: "RUNNING" | "STOPPED" | "COMPLETED";
  chainTxHash: string | null;
  chainSyncStatus: ChainSyncStatusDto;
  gasUsed: string | null;
  aggregatedModelHash: string | null;
  metrics: JsonValueDto | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  modelUpdates: ModelUpdateResponseDto[];
}

export interface TrainingJobMetricsResponseDto {
  roundNumber: number;
  metrics: JsonValueDto;
  aggregatedModelHash: string | null;
  chainTxHash: string | null;
  chainSyncStatus: ChainSyncStatusDto;
  gasUsed: string | null;
  createdAt: string;
}

export interface TrainingJobLogResponseDto {
  id: string;
  jobId: string;
  level: string;
  message: string;
  createdAt: string;
}

export interface TrainingJobMembershipResponseDto {
  jobId: string;
  userId: string;
  status: TrainingJobParticipantStatusDto;
}

export interface StopTrainingJobRequestDto {
  reason: string;
}

/**
 * Connection settings used to build the Flower SuperNode/SuperExec Docker
 * commands. `authToken` is a secret participant credential.
 */
export interface TrainingJobJoinConfigResponseDto {
  jobId: string;
  authToken: string;
  expiresAt: string;
  superlinkAddress: string;
  supernodeImage: string;
  superexecImage: string;
  defaultSupernodePort: number;
  datasetContainerPath: string;
}

export type TrainingJobParticipantResponseDto = {
  id: string;
  user: UserBriefResponseDto;
  joinedAt: string;
};
