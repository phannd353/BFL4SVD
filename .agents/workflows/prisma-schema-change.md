---
description: Change the Prisma schema safely, with migration, client regeneration, and consumer updates
---

# Prisma schema change

Run from `server/`. Never reset or drop a database, and never run `prisma migrate reset`, without explicit user authorization. Inspect `prisma.config.ts` and `.env` handling first: the datasource URL comes from `DATABASE_URL`.

1. Read `prisma/schema.prisma` and the services that use the affected models (`training-jobs`, `training-rounds`, `model-updates`, `models`, `auth`). Note existing constraints, e.g. `@@unique([jobId, roundNumber])` and `@@unique([trainingRoundId, clientAddress])`, which protect idempotency and provenance.

2. Edit the schema. Prefer additive, nullable/defaulted columns for existing data. Consider indexes for new query paths and keep `@@map` naming consistent.

3. Create the migration. This needs a reachable development database; confirm with the user which one is used.

   ```sh
   pnpm exec prisma migrate dev --name <short_description>
   ```

   Review the generated SQL in `prisma/migrations/` for destructive statements (drops, type changes, NOT NULL on existing rows) and call them out.

4. Regenerate the client (never hand-edit `prisma/generated`). `pnpm prisma:generate` also runs `pnpm dlx auth@latest generate` for Better Auth; inspect before using it, and use this when only app models changed:

   ```sh
   pnpm exec prisma generate
   ```

   If Better Auth tables (`user`, `session`, `account`, `verification`) changed, check `src/lib/auth-simplified.mjs` and the auth generation script.

5. Update consumers together: services, DTOs, mapping to/from the blockchain (`blockchain-traceability` skill), Python payloads, client types (`api-contract-change` skill), and test fixtures.

6. Validate with `verify-server.md`.

Summarize the migration name, any destructive or backfill concerns, and whether a deployment step is required.
