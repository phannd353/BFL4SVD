---
name: participant-docker-onboarding
description: Generate, change, or display the Docker run commands and auth token that a BFL4SVD participant uses to join a training job, including SuperNode port and dataset directory mounting. Use for the join-config endpoint, the join command dialog, Docker/compose files for Flower SuperNode/SuperExec, or the participant token.
---

# Participant join command and Docker setup

Relevant code:

- `server/src/modules/training-jobs/training-jobs.service.ts` – join/leave and `getJoinConfig` (membership + job-status check, token via `AuthService.issueTrainingAuthToken`), exposed as `POST /training-jobs/:id/join-config` (POST so the secret response is never served by the global GET cache).
- `server/src/modules/training-jobs/constants/index.ts` – `FL_JOIN_DEFAULTS` (default SuperNode port, container dataset path). Images and SuperLink address come from config: `FLWR_SUPERNODE_IMAGE`, `FLWR_SUPEREXEC_IMAGE`, `FLWR_SUPERLINK_ENDPOINT` (must be reachable from participants' machines).
- `client/src/utils/fl-join-command.util.ts` – pure builder/validator for the two `docker run` commands (SuperNode, then SuperExec sharing its network namespace via `--network container:`). The dataset path is typed in the browser and never sent to the API.
- `client/src/app/dashboard/@client/training-jobs/_components/join-command-dialog.tsx` and `client-training-job-actions.tsx` – dialog (opens after joining and via the "Join command" button) with editable port and dataset directory.
- `server/infrastructure/docker-compose.flwrclient{0,1}.yml`, `docker-compose.flwrserver.yml`, `flwr.Dockerfile` – dev equivalents (SuperNode + SuperExec client app).
- `server/Makefile` – `start-flwrclient*` targets (use local dev tokens only).
- `client/src/` job pages/components that show the command to the participant (find with `grep -ri "join" client/src`).
- `fl/sklearnexample/client_app.py` / `task.py` – consumers of `data-dir`, `auth-token`.

## Intended behavior

A participant who joined a published job receives a command containing connection configuration and a callback auth token, and chooses a local dataset directory that is mounted into the container and used by the Flower client.

## Checklist

1. **Verify before assuming.** The command passes `data-dir=<container path>` and mounts the participant's directory there read-only, but check whether `fl/sklearnexample/task.py` actually loads from `data-dir` (at the time of writing it uses `flwr_datasets` and ignores it); an unused mount is not a complete feature.
2. **Token handling.** Issue per participant and per job where the auth layer supports it; show only to that participant; never log the rendered command or token; keep it out of URLs and analytics. Treat the token as a secret in the UI (copy button, no persistence in logs).
3. **Safe generation.** Build the command from trusted configuration, not from raw user strings. Quote every argument correctly for POSIX shells, support paths with spaces, and reject control characters/newlines in the dataset path. Do not interpolate untrusted values into a shell string on the server.
4. **Mount hygiene.** Dataset mount `:ro` (`--mount type=bind,source=...,target=...,readonly`). No `--privileged`, no Docker socket, no host networking unless justified and documented.
5. **Consistency.** Image names/tags, ports, SuperLink address, and `node-config` keys must match `docker-compose.*` files, `flwr.Dockerfile`, and `fl/` code. Update all together.
6. **Network reachability.** SuperLink address and API endpoint given to participants must be reachable from their machines; `host.docker.internal` and `localhost` values are dev-only.
7. **Do not weaken auth** to make onboarding work (no admin tokens, no shared static tokens in committed files).

## Tests

- Unit-test command generation: spaces, quotes, `$`, backticks, newlines in paths; token placeholder replaced exactly once; read-only flag present.
- UI: loading/error/expired-job states, and that the token is not rendered for non-participants.

Do not start containers to validate unless the user asks; compose and `make start-*` targets spawn services.
