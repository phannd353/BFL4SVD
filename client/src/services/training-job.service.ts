"use server";

import { retryFetcher } from ".";
import type {
  CreateTrainingJobRequestDto,
  TrainingJobParticipantResponseDto,
  TrainingJobJoinConfigResponseDto,
  TrainingJobLogResponseDto,
  TrainingJobMembershipResponseDto,
  TrainingJobMetricsResponseDto,
  TrainingJobResponseDto,
  TrainingJobRoundResponseDto,
  TrainingJobStatusResponseDto,
  StopTrainingJobRequestDto,
  UpdateTrainingJobRequestDto,
} from "@/types";

const trainingJobPath = (jobId: string) =>
  `/training-jobs/${encodeURIComponent(jobId)}`;

async function createTrainingJob(input: CreateTrainingJobRequestDto) {
  return retryFetcher<TrainingJobResponseDto>("/training-jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function updateTrainingJob(
  jobId: string,
  input: UpdateTrainingJobRequestDto,
) {
  return retryFetcher<TrainingJobResponseDto>(trainingJobPath(jobId), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

async function deleteTrainingJob(jobId: string) {
  return retryFetcher<void>(trainingJobPath(jobId), { method: "DELETE" });
}

async function getTrainingJobs() {
  console.log("Fetching training jobs...");
  return retryFetcher<TrainingJobResponseDto[]>("/training-jobs", {
    method: "GET",
  });
}

async function getTrainingJobById(jobId: string) {
  return retryFetcher<TrainingJobResponseDto>(trainingJobPath(jobId), {
    method: "GET",
  });
}

async function getTrainingJobStatus(jobId: string) {
  return retryFetcher<TrainingJobStatusResponseDto>(
    `${trainingJobPath(jobId)}/status`,
    { method: "GET" },
  );
}

async function getTrainingJobRounds(jobId: string) {
  return retryFetcher<TrainingJobRoundResponseDto[]>(
    `${trainingJobPath(jobId)}/rounds`,
    { method: "GET" },
  );
}

async function getTrainingJobMetrics(jobId: string) {
  return retryFetcher<TrainingJobMetricsResponseDto[]>(
    `${trainingJobPath(jobId)}/metrics`,
    { method: "GET" },
  );
}

async function getTrainingJobLogs(jobId: string) {
  return retryFetcher<TrainingJobLogResponseDto[]>(
    `${trainingJobPath(jobId)}/logs`,
    { method: "GET" },
  );
}

async function getTrainingJobParticipants(jobId: string) {
  return retryFetcher<TrainingJobParticipantResponseDto[]>(
    `${trainingJobPath(jobId)}/participants`,
    { method: "GET" },
  );
}

async function startTrainingJob(jobId: string) {
  return retryFetcher<TrainingJobResponseDto>(
    `${trainingJobPath(jobId)}/start`,
    { method: "POST" },
  );
}

async function stopTrainingJob(jobId: string, reason: string) {
  const input: StopTrainingJobRequestDto = { reason };
  return retryFetcher<TrainingJobResponseDto>(
    `${trainingJobPath(jobId)}/stop`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

async function cancelTrainingJob(jobId: string) {
  return retryFetcher<TrainingJobResponseDto>(
    `${trainingJobPath(jobId)}/cancel`,
    { method: "POST" },
  );
}

async function joinTrainingJob(jobId: string) {
  return retryFetcher<TrainingJobMembershipResponseDto>(
    `${trainingJobPath(jobId)}/join`,
    { method: "POST" },
  );
}

// POST + no-store: every call issues a fresh secret participant token.
async function getTrainingJobJoinConfig(jobId: string) {
  return retryFetcher<TrainingJobJoinConfigResponseDto>(
    `${trainingJobPath(jobId)}/join-config`,
    { method: "POST", cache: "no-store" },
  );
}

async function leaveTrainingJob(jobId: string) {
  return retryFetcher<TrainingJobMembershipResponseDto>(
    `${trainingJobPath(jobId)}/leave`,
    { method: "POST" },
  );
}

export {
  createTrainingJob,
  updateTrainingJob,
  deleteTrainingJob,
  getTrainingJobs,
  getTrainingJobById,
  getTrainingJobStatus,
  getTrainingJobRounds,
  getTrainingJobMetrics,
  getTrainingJobLogs,
  getTrainingJobParticipants,
  startTrainingJob,
  stopTrainingJob,
  cancelTrainingJob,
  joinTrainingJob,
  getTrainingJobJoinConfig,
  leaveTrainingJob,
};
