# BFL4SVD Agent Guide

## Project and architecture

BFL4SVD coordinates federated learning with blockchain-backed traceability. Administrators schedule training jobs, participants train against local datasets, and the application tracks jobs, rounds, model updates, and metrics.

| Component | Ownership                                                                                                                                    | Agent guide                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `fl/`     | Python/Flower training clients and server, evaluation, aggregation, model hashing, and authenticated API callbacks.                          | [fl/AGENTS.md](fl/AGENTS.md)         |
| `server/` | NestJS/TypeScript API, authentication, scheduling, participation, Prisma/PostgreSQL persistence, and ethers/Solidity blockchain integration. | [server/AGENTS.md](server/AGENTS.md) |
| `client/` | Next.js/React/TypeScript web UI for administrators and participants, including job and round statistics.                                     | [client/AGENTS.md](client/AGENTS.md) |
| `data/`   | Data assets; do not rewrite, delete, or add datasets or large artifacts unless required.                                                     | This guide                           |
| `fl1/`    | Out of scope. Do not inspect, modify, test, or use as a reference unless explicitly requested.                                               | —                                    |

The web UI in `client/` is distinct from a Flower training client in `fl/`. Use explicit names when discussing them.

### Intended workflow

1. An administrator creates a training job with an initial model, training configuration, publication/join schedule, and training start time.
2. The API publishes the job on schedule so eligible authenticated participants can join before training starts.
3. A participant receives a Docker run command containing connection configuration and an issued authentication token, and configures a local dataset directory mounted into the container.
4. The API automatically starts the Flower run when due, without requiring an open browser or a manual UI action.
5. The Flower server reports round lifecycle events and aggregate results; Flower clients report local model updates and metrics. Callbacks authenticate and identify the appropriate job and round.
6. The API validates and persists results and synchronizes relevant statuses/provenance with the smart contract.
7. The UI displays authoritative API data for job status, participation, rounds, logs, metrics, and available traceability information.

This is the intended product behavior, not a guarantee that every integration is complete. Verify implementation points and report gaps rather than assuming the workflow works end to end.

## Engineering principles

- **Clear ownership:** Keep orchestration and authorization in the API, training in Flower, and presentation in the UI. UI checks never replace API enforcement.
- **Consistent contracts:** Update affected NestJS DTOs/controllers, Python payloads, frontend types/services/forms, and tests together when an API contract changes.
- **Traceable results:** Preserve job identity, round numbering, model lineage, deterministic hashes, and metric units/scaling across components. Do not fabricate metrics or treat missing data as zero.
- **Reliable workflows:** Make callbacks and retried operations idempotent where appropriate. Design scheduled work for concurrency, failures, and restarts; reject conflicting duplicate provenance.
- **Explicit consistency:** Database writes and blockchain writes are not atomic. Distinguish submission from confirmed transactions, and database identifiers/statuses from their on-chain counterparts. Database-only changes do not satisfy blockchain-traceability requirements.
- **Correct time handling:** Keep scheduled times distinct from actual execution times, use timezone-aware boundary timestamps, persist consistently in UTC, and display in the user's timezone.
- **Least privilege:** Keep browser sessions, participant callback credentials, Flower-server credentials, and blockchain signing keys conceptually separate. Never grant administrator access merely to bypass an integration failure.
- **Privacy and secrets:** Keep raw datasets local. Never commit real credentials, private keys, or production secrets, or log tokens and Docker commands containing them. Do not place datasets, credentials, or private local paths on-chain.
- **Safe execution:** Safely quote generated Docker arguments, prefer read-only dataset mounts, and avoid privileged containers or unnecessary host access. Never concatenate untrusted values into shell commands.

## General agent behavior

- This guide applies repository-wide. Read the relevant component guide and any deeper `AGENTS.md` before modifying its subtree; more-specific instructions take precedence within their scope.
- Inspect the implementation, dependency manifests, and relevant tests before editing. Starter-template READMEs may not describe current behavior.
- Preserve existing uncommitted work, including deletions. Do not restore files, reorganize unrelated code, or perform broad formatting during a focused task.
- Fix root causes with minimal, focused changes. Reuse existing dependencies, patterns, configuration, and error handling instead of introducing parallel mechanisms.
- Keep changes limited to the request, while updating affected consumers, tests, and documentation when necessary.
- Do not deploy contracts, broadcast transactions, spend funds, or reset database/chain state without explicit authorization.
- Inspect scripts before setup, migrations, Docker, or Make operations; do not assume commands are safe because a README mentions them.

## Validation and handoff

There is no root-level package manifest. Run commands from the relevant component directory using its guide. Use `pnpm` for JavaScript projects, preserve lockfiles, and use the intended Python environment for `fl/`.

- Add focused regression tests for changed behavior. Start with the narrowest relevant checks, then broaden validation as appropriate.
- Do not fix unrelated failures to obtain a green run. Report missing runtimes, Docker/external-service prerequisites, and other blockers accurately.
- For documentation-only changes, use focused content/diff checks; do not launch training or infrastructure unnecessarily.
- Finish with a concise summary of changed files, behavior affected, validation actually run, and remaining integration or deployment steps. Never claim checks or integrations passed without verification.
