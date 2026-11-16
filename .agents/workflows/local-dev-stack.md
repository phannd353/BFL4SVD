---
description: Start or stop the local BFL4SVD development stack (Postgres/Redis, anvil, Flower SuperLink/SuperNodes, API, UI) after user confirmation
---

# Local development stack

This workflow starts long-running services and containers. **Ask the user to confirm before running any step**, and inspect each script/compose file first. Do not run blocking commands (`make start-dev` runs `anvil` in the foreground, `pnpm start:dev` and `pnpm dev` never exit) in a plain terminal call; ask the user to run them in their own terminals.

All paths relative to the repository root.

1. Review what will run.
   // turbo

   ```sh
   cat server/Makefile server/infrastructure/docker-compose.dev.yml
   ```

2. Infrastructure (`server/`): `make start-dev` starts the dev compose services, then runs `anvil` in the foreground. The anvil state is stored in `server/anvil/`; do not delete it without authorization.

3. Environment: confirm `server/.env` (database URL, JSON-RPC URL, signer key, auth secrets) exists. Use throwaway local values only; never copy real keys into the repository or this conversation.

4. Database: apply migrations to the **development** database only (`pnpm exec prisma migrate deploy` or `migrate dev`, see `prisma-schema-change.md`).

5. Contract: deploying to local anvil (`make deploy-contract`) broadcasts a transaction and needs `JSON_RPC_PROVIDER_URL` and `PRIVATE_KEY`; run only with explicit authorization, and confirm the RPC URL is local.

6. Flower: `make start-flwrserver` for SuperLink/ServerApp executor, and `make start-flwrclientN` with a dev `AUTH_TOKEN` for each SuperNode. Check the Makefile target names against the compose files before running (the `.PHONY` / target names for the client targets are inconsistent, so verify each).

7. API and UI (separate terminals): in `server/`, `pnpm start:dev`; in `client/`, `pnpm dev`.

8. Health check once running. Use the port the API actually listens on (check `server/src/main.ts` and `PORT`). Note that `SERVER_URL` defaults to `http://localhost:3001` in `server/src/config/envs/default.ts`, while `fl/pyproject.toml` defaults `api-endpoint` to `http://localhost:3000`; make sure these agree with the real port.
   ```sh
   curl -sS http://localhost:<port>/api/v1/health
   ```

Stop services with `make stop-*` targets (stop) or `make clean-*` (removes containers; confirm first).
