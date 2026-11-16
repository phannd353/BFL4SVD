"use server";

import { retryFetcher } from ".";
import type { HealthResponseDto } from "@/types";

async function getHealth() {
  return retryFetcher<HealthResponseDto>("/health", { method: "GET" });
}

async function getFlowerHealth() {
  return retryFetcher<HealthResponseDto>("/health/flower", { method: "GET" });
}

async function getBlockchainServiceHealth() {
  return retryFetcher<HealthResponseDto>("/health/blockchain", {
    method: "GET",
  });
}

export { getHealth, getFlowerHealth, getBlockchainServiceHealth };
