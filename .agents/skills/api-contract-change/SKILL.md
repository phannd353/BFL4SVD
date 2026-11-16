---
name: api-contract-change
description: Change a request/response contract shared by the NestJS API (server/), Python Flower services (fl/), and the Next.js UI (client/). Use when adding, renaming, or removing fields, endpoints, DTOs, enums, or payload formats in BFL4SVD.
---

# Cross-component API contract change

Use this skill whenever a field, endpoint, enum, or payload shape changes. The goal is to update **every consumer in the same change** (see root `AGENTS.md`, "Consistent contracts").

## 1. Find the producer and all consumers

Never guess paths; search first.

| Layer | Where to look |
| --- | --- |
| API controllers/DTOs/services | `server/src/modules/<module>/` (`training-jobs`, `training-rounds`, `model-updates`, `models`, `blockchain`, `auth`) |
| Persistence | `server/prisma/schema.prisma` |
| Python callbacks | `fl/src/services/{training_jobs,training_rounds,model_updates,api_client}.py`, callers in `fl/src/strategy.py` and `fl/sklearnexample/{server_app,client_app}.py` |
| UI wrappers/types | `client/src/services/*.service.ts`, `client/src/types/`, `client/src/interfaces/`, forms/components using them |
| Tests | module `*.spec.ts`, `server/test/integration/`, `fl/tests/test_services.py` |

Use `grep` for the field name and the route path (e.g. `training-jobs`, `model-updates`) across `server/src`, `fl/src`, `fl/sklearnexample`, `client/src`. Do not search `fl1/`.

## 2. Decide compatibility

- Prefer additive, optional changes. Removing/renaming a field requires updating all consumers together.
- Python Flower processes may run in already-built Docker images; note if a rebuilt image (`bfl4svd-superexec`) is needed for the change to take effect.
- Do not change units/scaling of values silently (accuracy, score, learning rate are sent as scaled integer strings by `fl/sklearnexample/client_app.py`). If scaling changes, update API validation, blockchain conversion, UI display, and tests together.

## 3. Implement in order

1. **Server**: DTO validation (`class-validator`), service logic, controller, Swagger decorators if used by neighbors, Prisma schema + migration if persistence changes.
2. **fl/**: payload construction in `fl/src/services/*` and callers. Keep `allow_nan=False` JSON behavior; never send `NaN` metrics, and never convert missing metrics to `0`.
3. **client/**: `src/types` / `src/interfaces`, `src/services/*.service.ts`, forms and displays. Respect server-action boundaries (`"use server"` service files). Read `client/AGENTS.md` and the local Next.js docs before touching Next.js code.
4. **Tests**: update/add tests in each affected component.

## 4. Authorization check

For every new or changed endpoint confirm:
- Which principal calls it (admin session, participant token, Flower-server token) and that the API guard/permission enforces it.
- Job membership and job/round identity are verified server-side, not trusted from the payload.
- No credential is added to URLs, logs, or error messages.

## 5. Verify

Run the narrowest checks per touched component (see `.agent/workflows/verify-server.md`, `verify-fl.md`, `verify-client.md`). In the final summary list every consumer updated and any consumer you could not verify.
