---
description: Run focused validation for changes in client/ (Next.js web UI)
---

# Verify `client/`

Run from `client/` with `pnpm`. Before editing Next.js code, read the relevant docs in `client/node_modules/next/dist/docs/` as required by `client/AGENTS.md`.

1. Lint.
   // turbo
   ```sh
   pnpm lint
   ```

2. Type-check without emitting.
   // turbo
   ```sh
   pnpm exec tsc --noEmit
   ```

3. Production build (may need environment variables such as the API URL, and can fail on network-fetched resources such as fonts; report that rather than altering unrelated code).
   ```sh
   pnpm build
   ```

4. Manually confirm, when UI behavior changed (and a dev server is available), that the page handles loading, empty, error, and terminal job states, and that metrics are labeled with round/units and never default to zero.

5. Confirm API types in `src/types` and `src/interfaces` still match server DTOs (see `api-contract-change`).

Do not leave `pnpm dev` running in a blocking terminal call.
