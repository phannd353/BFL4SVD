"use server";

import { retryFetcher } from ".";
import type {
  BlockchainEventResponseDto,
  BlockchainHealthResponseDto,
  BlockchainModelUpdateResponseDto,
} from "@/types";

async function getBlockchainTransactions() {
  return retryFetcher<BlockchainEventResponseDto[]>(
    "/blockchain/transactions",
    { method: "GET" },
  );
}

async function getBlockchainModelUpdate(updateId: number) {
  return retryFetcher<BlockchainModelUpdateResponseDto>(
    `/blockchain/model-updates/${updateId}`,
    { method: "GET" },
  );
}

async function getBlockchainModelUpdateEvents(updateId: number) {
  return retryFetcher<BlockchainEventResponseDto[]>(
    `/blockchain/model-updates/${updateId}/events`,
    { method: "GET" },
  );
}

async function getBlockchainHealth() {
  return retryFetcher<BlockchainHealthResponseDto>("/blockchain/health", {
    method: "GET",
  });
}

export {
  getBlockchainTransactions,
  getBlockchainModelUpdate,
  getBlockchainModelUpdateEvents,
  getBlockchainHealth,
};
