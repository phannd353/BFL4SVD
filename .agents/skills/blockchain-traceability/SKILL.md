---
name: blockchain-traceability
description: Work on smart-contract traceability in BFL4SVD - FLRegistry.sol, ethers integration in the NestJS blockchain module, database-to-chain status/provenance synchronization, and Foundry tests. Use when adding on-chain writes, changing contract interfaces, or mapping DB identifiers/statuses to the chain.
---

# Blockchain traceability

Relevant code:

- `server/contracts/FLRegistry.sol` – registry (`createTrainingJob`, `startTrainingJob`, `stopTrainingJob`, rounds, model updates, events). Owner-only mutating functions.
- `server/src/modules/blockchain/` – `blockchain.service.ts`, controller (`/blockchain/transactions`, `/model-updates/:id`, `/model-updates/:id/events`, `/health`). Verify whether it currently has write paths; at the time of writing it exposes read operations.
- `server/prisma/schema.prisma` – `ModelUpdate.chainUpdateId` (nullable, unique) links to on-chain IDs.
- `server/test/contracts/FLRegistry.t.sol` (Foundry) and `server/test/integration/blockchain/` (needs infrastructure).
- `server/scripts/FLRegistry.s.sol`, `server/Makefile` (`deploy-contract`, `verify-contract`, ...). **These deploy/broadcast; never run them without explicit user authorization.**

## Rules

1. **Do not assume sync exists.** Trace the actual call from the HTTP handler/service to the chain write. If a flow only updates the database, say so; DB-only updates do not satisfy traceability requirements.
2. **Separate identifiers.** DB job IDs are `cuid` strings; the contract uses numeric `uint256` IDs assigned sequentially by the contract. Persist the on-chain job ID explicitly (add a schema field + migration if missing). Never derive one from the other.
3. **Explicit status mapping.** Contract: `CREATED, RUNNING, STOPPED, COMPLETED, CANCELLED`. DB adds `DRAFT, WAITING, FAILED`. Write a mapping function with tests; never cast enum ordinals. Decide and document what is written for unmapped states (usually nothing).
4. **Submission vs. confirmation.** Track tx hash, wait for the receipt, handle reverts, and expose the distinction (e.g. `submitted` / `confirmed` / `failed`). Retries must be idempotent: check on-chain state before resubmitting, and reconcile after crashes.
5. **Round and lineage consistency.** Round numbers, `prevModelHash`, `aggregatedModelHash`, and final model hash must be identical in DB and chain. The contract enforces one update per client per round and sequential rounds; reject conflicting duplicates in the API rather than overwriting.
6. **Integer-safe values.** Accuracy/score/learning rate are scaled integers (see `fl/sklearnexample/client_app.py`: accuracy×100, learning rate×1e6). Convert strings to `BigInt` with validation; never use `Number` for values that may exceed 2^53.
7. **Signer isolation.** The blockchain signing key is a server secret (config only), distinct from user sessions and Flower tokens. Never log it or place it in fixtures.
8. **Privacy.** On-chain data is limited to hashes, statuses, round numbers, scaled metrics, and addresses. No dataset names/paths or credentials.

## Changing the contract

1. Edit `FLRegistry.sol`, then update `FLRegistry.t.sol` (events, reverts, state transitions).
2. Regenerate artifacts via tooling (`forge build`); do not hand-edit `artifacts/`. Check how `@/artifacts` is consumed before changing ABI-dependent code.
3. Update `blockchain.service.ts` types/calls and its spec.
4. Note the need for redeployment/migration of existing on-chain data in the summary. Do not deploy.

## Verify

Use `.agent/workflows/verify-server.md` (includes `pnpm ct:test` when Foundry is installed). Integration tests need Docker/anvil; report if they cannot run.
