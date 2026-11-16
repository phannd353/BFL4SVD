"use server";

import { retryFetcher } from ".";
import type { ModelResponseDto, ModelVersionResponseDto } from "@/types";

async function getModels() {
  return retryFetcher<ModelResponseDto[]>("/models", { method: "GET" });
}

async function getModelById(modelHash: string) {
  return retryFetcher<ModelResponseDto>(
    `/models/${encodeURIComponent(modelHash)}`,
    {
      method: "GET",
    },
  );
}

async function getModelVersions(modelHash: string) {
  return retryFetcher<ModelVersionResponseDto[]>(
    `/models/${encodeURIComponent(modelHash)}/versions`,
    { method: "GET" },
  );
}

export { getModels, getModelById, getModelVersions };
