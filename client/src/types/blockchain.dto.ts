export interface BlockchainEventResponseDto {
  event: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  args: Record<string, unknown>;
}

export interface BlockchainModelUpdateResponseDto {
  id: string;
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

export interface BlockchainHealthResponseDto {
  connected: boolean;
  chainId: string;
  blockNumber: number;
  contractAddress: string;
  contractDeployed: boolean;
}
