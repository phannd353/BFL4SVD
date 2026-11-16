export type SeoType = {
  title: string;
  subTitle: string;
  absoluteTitle: string;
  ogTitle: string;
  author: { name: string; twitterUrl: string; twitterAddress: string };
  description: string;
  keywords: Array<string>;
  tags: Array<string>;
};

export type { ApiResponseDto, HealthResponseDto } from "./api.dto";
export type {
  BlockchainEventResponseDto,
  BlockchainHealthResponseDto,
  BlockchainModelUpdateResponseDto,
} from "./blockchain.dto";
export type {
  ChainSyncStatusDto,
  JsonValueDto,
  ModelResponseDto,
  ModelUpdateResponseDto,
  ModelVersionResponseDto,
} from "./model.dto";
export type {
  CreateTrainingJobRequestDto,
  TrainingJobJoinConfigResponseDto,
  TrainingJobLogResponseDto,
  TrainingJobMembershipResponseDto,
  TrainingJobMetricsResponseDto,
  TrainingJobParticipantResponseDto,
  TrainingJobResponseDto,
  TrainingJobRoundResponseDto,
  TrainingJobStatusDto,
  TrainingJobStatusResponseDto,
  StopTrainingJobRequestDto,
  UpdateTrainingJobRequestDto,
} from "./training-job.dto";
export type {
  User,
  UserBriefResponseDto,
  UserCreateRequestDto,
} from "./user.dto";
