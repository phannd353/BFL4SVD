---
description: Review pending BFL4SVD changes against project rules (security, consistency, lifecycle, blockchain) before handoff
---

# Review pending changes

Use before finishing a task or when asked to review. Do not modify files during a review unless asked.

1. Inspect the changes. Ignore `fl1/` and unrelated pre-existing uncommitted work; many files in this repository may already show as modified or deleted.
   // turbo
   ```sh
   git --no-optional-locks status --short
   ```
   // turbo
   ```sh
   git --no-pager diff --stat
   ```
   Then read the diffs of only the files relevant to the task.

2. Check each area that applies. Flag problems with file/line references.

   **Contracts**
   - Every consumer of a changed payload/field updated (server DTO, Python services, client types/services, tests).
   - Units and scaling unchanged or updated everywhere; no missing metric turned into `0`.

   **Security and privacy**
   - No tokens, private keys, or real secrets committed, logged, put in URLs, or shown to unauthorized users.
   - Authorization enforced in the API; no trust in caller-supplied job ID, client address, or round number.
   - No shell string built from untrusted values; Docker commands quote paths, use read-only dataset mounts, and avoid privileged mode.
   - No dataset content, credentials, or local paths on-chain.

   **Lifecycle and reliability**
   - Scheduled work claims jobs atomically, handles failure/timeouts/restarts, no duplicate launch.
   - Scheduled vs actual timestamps distinct; UTC persisted.
   - Callbacks idempotent; conflicting duplicates rejected.

   **Blockchain**
   - Distinguishes submitted from confirmed; DB IDs vs chain IDs and status enums mapped explicitly.

   **Tests and docs**
   - Focused regression tests added for changed behavior; relevant `AGENTS.md` or skill updated if conventions changed.

3. Confirm validation was actually run (`verify-server.md`, `verify-fl.md`, `verify-client.md`) and results are accurately reported.

4. Output findings ordered by severity (blocking, should-fix, nit), followed by any gaps that could not be verified.
