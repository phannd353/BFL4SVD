# API and Blockchain Agent Guide

Applies to `server/` in addition to [the root guide](../AGENTS.md). Paths below are relative to this directory.

## Ownership and implementation map

This component owns authentication/authorization, participation, scheduled Flower orchestration, operational persistence, and blockchain traceability.

- `src/modules/training-jobs/`: job operations, participation, DTOs, and scheduled worker (`training-jobs.worker.ts`).
- `src/modules/training-rounds/`: round lifecycle operations.
- `src/modules/model-updates/` and `src/modules/models/`: participant updates and model records/artifacts.
- `src/modules/auth/` and `src/lib/`: authentication and permissions, including Better Auth integration.
- `src/modules/blockchain/`: API-to-chain integration.
- `prisma/schema.prisma`: database models, enums, indexes, and constraints.
- `contracts/FLRegistry.sol`: Solidity registry, lifecycle rules, and events.
- `test/`, module-local `*.spec.ts`, and `vitest.config.mjs`: test infrastructure and suites.
- `infrastructure/`, `scripts/`, and `foundry.toml`: deployment/development infrastructure and contract tooling.

## API and persistence conventions

- Keep controllers focused on HTTP concerns, validate request DTOs, and put business rules in services. Follow existing dependency injection, configuration, imports, permissions, and error handling.
- Enforce identity, permissions, and job membership server-side. Caller-supplied client addresses, user IDs, job IDs, and round numbers are not authorization.
- Flower callbacks use `@FlCallback('participant' | 'server')` (`src/common/guards/fl-callback.guard.ts`), never a bare `@Public()`. Credentials are sent as `Authorization: Bearer`; browser session cookies are not accepted on these routes.
- `participant` tokens are short-lived HS256 JWTs (`sub` = user, `jobId`) signed with a key derived from the Better Auth secret and a distinct issuer/audience (`src/lib/fl-credentials.ts`). The guard re-reads the user and `JOINED` membership on every call, and handlers must check the body's job against `auth.jobId`.
- The `server` credential is the `FLWR_SERVER_TOKEN` deployment secret (>= 32 characters; callbacks are rejected while unset). It belongs in the ServerApp container environment, never in Flower run config, which every participant receives.
- Do not bypass callback authorization by issuing administrator credentials or reusing a session token.
- Use Prisma transactions/conditional updates to enforce database invariants. Preserve unique job rounds and participant updates; reject conflicting duplicates rather than overwriting provenance.
- Include appropriate migrations and regeneration steps for requested schema changes. Never hand-edit generated Prisma code.

## Lifecycle and scheduled execution

- Consult the Prisma schema and service transition checks before changing lifecycle behavior. Current database job statuses are `DRAFT`, `WAITING`, `RUNNING`, `STOPPED`, `COMPLETED`, `CANCELLED`, and `FAILED`; round statuses are `RUNNING`, `STOPPED`, and `COMPLETED`.
- Validate ordering of `publishAt` and `startAt` on the API. Keep them distinct from actual `publishedAt` and `startedAt` timestamps.
- Preserve restrictions on modifying/deleting published jobs and joining/leaving jobs. Do not rely on UI checks.
- Automatic training starts belong to the API worker, not an open browser or a manual UI action.
- Handle overlapping ticks, concurrent API calls, multiple server instances, and restarts. Claim a job atomically before launch and launch only if the claim succeeds.
- Handle launch failures, timeouts, and process cleanup explicitly. Record actionable failures without leaving jobs falsely running or launching duplicate runs.
- Prefer executable-plus-argument process APIs over interpolated shell strings. Never concatenate untrusted job fields or paths into commands.
- Align generated Flower run configuration with `fl/` consumers and supply callback credentials securely.
- Generate participant Docker commands from trusted configuration with safe argument quoting. Support dataset paths containing spaces, prefer read-only mounts, and avoid privileged containers, Docker socket mounts, or unnecessary host access. Never log credential-bearing commands.

## Blockchain consistency

- Synchronize required lifecycle/provenance changes with the contract as well as the database. Verify the integration rather than assuming a database mutation updates the chain.
- Database and chain writes are not one atomic transaction. Handle failed submissions, reverts, receipt confirmation, retries, and reconciliation explicitly. A submitted transaction is not a confirmed update.
- Preserve explicit mappings between database string identifiers and contract numeric identifiers.
- The contract job statuses are `CREATED`, `RUNNING`, `STOPPED`, `COMPLETED`, and `CANCELLED`, unlike the database enum. Map statuses explicitly; never cast enum positions or assume every database state exists on-chain.
- Preserve round numbering and previous/aggregated/final model hashes across callbacks, persistence, and contract calls.
- Use integer-safe Solidity conversions and test score, accuracy, and learning-rate scaling. Avoid floating-point loss and unsafe JavaScript number conversions.
- Update API integration, ABI consumption, tests, and deployment notes when contract interfaces change. Regenerate artifacts through tooling; explain redeployment or identifier migration requirements.
- Store only agreed provenance, hashes, statuses, and metrics on-chain, never datasets, credentials, or private local paths.
- Never deploy, broadcast transactions, spend funds, or reset database/chain state without explicit authorization.

## Commands and validation

Run from `server/` using `pnpm`.

| Command                                           | Purpose / caveat                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run <test-file>`                | Run a specific existing test file; substitute its actual path.                                                                    |
| `pnpm test`                                       | Run Vitest tests.                                                                                                                 |
| `pnpm build`                                      | Compile the NestJS API.                                                                                                           |
| `pnpm exec eslint "{src,apps,libs,test}/**/*.ts"` | Non-fixing lint check. `pnpm lint` includes `--fix` and can modify unrelated files.                                               |
| `pnpm ct:test`                                    | Run Foundry contract tests (`forge test`); requires Foundry.                                                                      |
| `pnpm exec prisma generate`                       | Regenerate Prisma when needed. `pnpm prisma:generate` also runs auth generation via `pnpm dlx auth@latest`; inspect before using. |

Inspect package scripts and infrastructure configuration before setup, migrations, Docker, or Make operations. Some integration tests require Docker or external services; report prerequisites/blockers accurately.

Add focused tests as applicable for scheduling boundaries, invalid transitions, concurrent starts, launch failures/cleanup, invalid or expired credentials, role/membership and cross-job access, duplicate/out-of-order callbacks, model lineage, metric scaling, safe Docker commands, and blockchain submission/receipt failures with retry/reconciliation behavior.
