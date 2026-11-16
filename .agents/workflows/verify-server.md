---
description: Run focused validation for changes in server/ (NestJS API, Prisma, Solidity contract)
---

# Verify `server/`

Run all commands from `server/`. Start narrow, then broaden. Do not fix unrelated failures; report them.

1. Identify what changed.
   ```sh
   git --no-optional-locks status --short -- .
   ```

2. Run the unit tests for the touched module (substitute the real spec path).
   // turbo
   ```sh
   pnpm exec vitest run src/modules/<module>/<file>.spec.ts
   ```

3. Run all unit tests (mocked). Integration specs under `test/` need Docker/Postgres/anvil; if unavailable, say so instead of skipping silently.
   // turbo
   ```sh
   pnpm exec vitest run src
   ```

4. Type-check/compile.
   // turbo
   ```sh
   pnpm build
   ```

5. Lint **without** `--fix` (the `pnpm lint` script auto-fixes and may touch unrelated files).
   // turbo
   ```sh
   pnpm exec eslint "{src,apps,libs,test}/**/*.ts"
   ```

6. If `prisma/schema.prisma` changed: confirm a migration exists in `prisma/migrations/` and regenerate the client (`pnpm exec prisma generate`). Generated code in `prisma/generated` must not be hand-edited. See `prisma-schema-change.md`.

7. If `contracts/` changed and Foundry is installed:
   // turbo
   ```sh
   pnpm ct:test
   ```
   Never run `make deploy-contract` / `verify-contract` or broadcast transactions without explicit authorization.

8. Integration tests (only if the user confirms Docker is available; they use testcontainers):
   ```sh
   pnpm exec vitest run test/integration
   ```

Report exactly which commands ran and their results.
