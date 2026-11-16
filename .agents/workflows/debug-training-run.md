---
description: Diagnose why a scheduled BFL4SVD training job did not publish, start, report rounds, or record model updates
---

# Debug a training run

Gather evidence before changing code. Only read state; do not reset the database or chain, restart services, or broadcast transactions without authorization.

1. **Identify the failing stage** using the intended workflow:
   publish (`DRAFT`→`WAITING`) → start (`WAITING`→`RUNNING`, Flower launched) → round start → client updates → round complete/aggregation → finalize → chain sync → UI display.

2. **Publish/start stage** – read `server/src/modules/training-jobs/training-jobs.worker.ts`:
   - Is the worker registered in `training-jobs.module.ts` and is `ScheduleModule` imported in `app.module.ts`?
   - Do `publishAt`/`startAt` (UTC) satisfy the query predicates?
   - Did the launch command fail or time out (10 s race)? Check `failureReason` and `training_job_log` for the job.
   - Are `flwrBinPath`, `flwrAppPath`, `flwrSuperlinkEnv`, `serverUrl` set in `server/src/config/envs/`?

3. **Flower stage** – compare `buildRunConfig` keys against `fl/sklearnexample/server_app.py` / `client_app.py`. Check that SuperLink and the SuperNodes are reachable (compose files in `server/infrastructure/`) and that `min-clients` participants joined.

4. **Callback stage** – `fl/src/services/api_client.py` calls `<endpoint>/api/v1/...` with `Authorization: Bearer <token>`. ClientApp calls (`POST/PATCH /model-updates`) need the participant token, which is valid only for the job it was issued for and only while the user is still `JOINED`. ServerApp calls (rounds, finalize) need the `FLWR_SERVER_TOKEN` environment variable on the ServerApp container to equal the API's `FLWR_SERVER_TOKEN` (>= 32 characters; the API logs an error and returns 401 while it is unset). Look for HTTP 401 (bad/expired/missing credential), 403 (not a participant, or wrong job) and 409 text surfaced by `ServerAPIError`. Never paste tokens into output.

5. **Persistence stage** – confirm `training_job_round` and `model_update` rows exist with the expected `roundNumber`, hashes (`prevModelHash` chain), and unique constraints not being violated by duplicates.

6. **Blockchain stage** – check `/api/v1/blockchain/health` and whether a write path for the lifecycle event exists (see `blockchain-traceability` skill). Distinguish a failed submission from an unconfirmed one.

7. **UI stage** – compare API responses with `client/src/services/training-job.service.ts` expectations and `client/src/types`.

8. Report: failing stage, evidence (file/line, log excerpt without secrets), root cause or leading hypotheses, and a minimal proposed fix. Add a regression test when you fix it.
