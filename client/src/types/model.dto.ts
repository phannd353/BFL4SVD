export type JsonValueDto =
  | string
  | number
  | boolean
  | null
  | JsonValueDto[]
  | { [key: string]: JsonValueDto };

export type ChainSyncStatusDto =
  "PENDING" | "SUBMITTED" | "CONFIRMED" | "FAILED";

export interface ModelResponseDto {
  hash: string;
  size: number;
  filePath: string;
  chainTxHash: string | null;
  chainSyncStatus: ChainSyncStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface ModelVersionResponseDto {
  id: string;
  chainUpdateId: string | null;
  chainTxHash: string | null;
  chainSyncStatus: ChainSyncStatusDto;
  trainingJobId: string;
  roundNumber: string;
  clientAddress: string;
  score: string;
  modelHash: string;
  epoch: string;
  learningRate: string;
  batchSize: string;
  prevModelHash: string;
  accuracy: string;
  timestamp: string;
}

export interface ModelUpdateResponseDto {
  id: string;
  chainUpdateId: string | null;
  chainTxHash: string | null;
  chainSyncStatus: ChainSyncStatusDto;
  trainingRoundId: string;
  clientAddress: string;
  score: string;
  modelHash: string;
  epoch: string;
  learningRate: string;
  batchSize: string;
  prevModelHash: string;
  accuracy: string;
  metrics: JsonValueDto | null;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}
