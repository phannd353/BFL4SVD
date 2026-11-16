---
name: training-job-lifecycle
description: Modify training job scheduling, publication, joining, automatic Flower start, status transitions, or round lifecycle in the BFL4SVD API. Use for changes to training-jobs.worker.ts, training-jobs.service.ts, training-rounds, job/round statuses, or schedule validation.
---

# Training job lifecycle and scheduling

Relevant code:

- `server/src/modules/training-jobs/training-jobs.worker.ts` – `@Cron` worker that publishes due `DRAFT` jobs and starts due `WAITING` jobs.
- `server/src/modules/training-jobs/training-jobs.service.ts` – create/update/delete, join/leave, finalize, stop/cancel, transitions.
- `server/src/modules/training-rounds/` – round creation/completion callbacks.
- `server/prisma/schema.prisma` – `TrainingJobStatus` (`DRAFT, WAITING, RUNNING, STOPPED, COMPLETED, CANCELLED, FAILED`), `TrainingRoundStatus` (`RUNNING, STOPPED, COMPLETED`), `@@unique([jobId, roundNumber])`.
- `server/src/modules/training-jobs/constants/index.ts` – participant Docker join command template.

## Expected behavior

- Admin sets `publishAt` (join opens) and `startAt` (training starts). `publishedAt` / `startedAt` are the **actual** times; never overwrite schedule fields with them.
- Publishing: `DRAFT` + `publishAt <= now` → `WAITING`.
- Starting: `WAITING` + `startAt <= now` → Flower run launched by the API, with no browser involved.
- Published jobs cannot be edited or deleted; joining is only for eligible users before start.

## Review checklist before editing

Read the worker and service first, then verify each point against the current code and report gaps rather than assuming:

1. **Atomic claim before launch.** Claim with a conditional `updateMany` (status + schedule predicates) and launch only when `count === 1`. Check whether the current worker launches Flower regardless of the claim result and whether the claim happens before or after launch.
2. **Failure state.** If the launch fails after the job was claimed as `RUNNING`, the job must not stay falsely `RUNNING`. `markScheduledJobFailed` only transitions from the `from` status; verify it matches the state actually written.
3. **Multi-instance / restart safety.** `isProcessing` guards only a single process. Consider the DB claim as the real guard; do not rely on in-memory flags.
4. **Process launching.** The worker builds a shell string with `exec`. Prefer `execFile`/`spawn` with an argument array and never interpolate job fields (`name`, `description`, hashes, paths) into a shell command. Handle timeouts by killing the child process.
5. **Run config alignment.** `buildRunConfig` keys (`batch-size`, `rounds`, `learning-rate`, `local-epochs`, `training-job-id`, `initial-model-hash`, `api-endpoint`) must match what `fl/sklearnexample/server_app.py` and `client_app.py` read from `context.run_config`. Never put callback tokens into shared run config.
6. **Time handling.** Compare and persist UTC `Date` values; validate `startAt > publishAt` (and any minimum lead time) in the service.
7. **Idempotency.** Stop/cancel/finalize must tolerate retries; finalize already returns the existing result when the same final hash is submitted.

## Implementing changes

- Put business rules in the service, transactions via `prisma.$transaction`, and row locks (`SELECT ... FOR UPDATE`) as in `finalizeTrainingJobById` when concurrent writers matter.
- Write a `trainingJobLog` entry for user-visible lifecycle events, without secrets.
- If the status set changes: update the Prisma enum and migration, DTOs, client `types`, status badges, contract status mapping (see `blockchain-traceability` skill), and tests.

## Tests

Extend `training-jobs.service.spec.ts` / `training-rounds.service.spec.ts` (mocked) and `server/test/integration/training-jobs/trainingJobs.spec.ts` (needs Docker). Cover: boundary times, double ticks, concurrent claim, launch failure, timeout, invalid transitions, duplicate callbacks. Run them with `.agent/workflows/verify-server.md`.
