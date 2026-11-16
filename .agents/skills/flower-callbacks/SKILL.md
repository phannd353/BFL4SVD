---
name: flower-callbacks
description: Modify the Flower ServerApp/ClientApp, QualityFedAvg strategy, model hashing, metrics, or the Python callbacks that report jobs, rounds, and model updates to the BFL4SVD API. Use for any change under fl/.
---

# Flower application and API callbacks

Relevant code (all under `fl/`):

- `pyproject.toml` – dependencies, `[tool.flwr.app]` entry points and default run config (`rounds`, `local-epochs`, `batch-size`, `learning-rate`, `training-job-id`, `initial-model-hash`, `api-endpoint`, ...).
- `sklearnexample/server_app.py` – ServerApp: loads initial model by hash from `FLWR_MODEL_DIR`, builds `QualityFedAvg`, runs the strategy, saves/finalizes the model.
- `sklearnexample/client_app.py` – ClientApp `train` / `evaluate`; `train` calls `create_model_update`.
- `sklearnexample/task.py` – model + data loading.
- `src/strategy.py` – `QualityFedAvg`, round start/complete reporting.
- `src/hash.py` – deterministic model hash.
- `src/services/` – `api_client.py` (`ServerAPIClient`, base path `/api/v1`, auth via `Authorization: Bearer`), `training_jobs.py`, `training_rounds.py`, `model_updates.py`, `jwt.py`.
- `tests/test_services.py` – `unittest` with mocked `urlopen`.

Use Flower's `ServerApp`/`ClientApp` API pinned in `pyproject.toml`. Ignore `fl1/`.

## Rules

1. **Config alignment.** Run-config keys read in `server_app.py`/`client_app.py` must match what the API worker passes (`training-jobs.worker.ts › buildRunConfig`) and the Docker node-config (`auth-token`, `data-dir`, `partition-id`, `num-partitions`). Change both sides together.
2. **Credentials.** Participant `auth-token` is node config, not run config. The Flower-server token is read from the ServerApp's `FLWR_SERVER_TOKEN` environment variable (never run config, which every participant receives) and has no default; do not add one. Never print tokens or full request headers in errors or logs.
3. **Dataset locality.** `data-dir` must actually drive data loading; validate its structure and fail with a clear error. Raw data never leaves the participant.
4. **Hashing and lineage.** `hash_model` output format must stay identical across server finalization, client updates (`prevModelHash`/`modelHash`), saved model file names, and API/DB/chain. Do not change serialization without updating all producers/consumers and tests.
5. **Metrics.** Never send `NaN`/`inf` (the client uses `allow_nan=False`); never replace missing metrics with `0`. Keep documented units and scaling (accuracy/score as integer percent, learning rate ×1e6 strings) unless the API contract is changed through the `api-contract-change` skill.
6. **Round numbers.** Use the Flower server round (1-based) consistently; reject round < 1.
7. **Retries and idempotency.** If adding retries to callbacks, retry only transient failures (network, 5xx) and rely on API idempotency; treat 409 conflicts as errors needing inspection, not as success.
8. **Failure reporting.** A failed run should surface to the API (job failure/stop), not just a Python traceback inside the container, when the API supports it.

## Tests

Add `unittest` cases in `fl/tests/` with mocked network calls: payload shape, URL encoding of IDs, Bearer header, tokens absent from errors, error surfacing, hash determinism, config parsing. Run via `.agent/workflows/verify-fl.md`. Avoid launching `flwr run` for validation unless the user asks and the infrastructure is configured.
