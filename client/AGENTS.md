<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Web UI Agent Guide

Applies to `client/` in addition to [the root guide](../AGENTS.md). Paths below are relative to this directory. Preserve the generated Next.js rules above.

## Ownership and implementation map

This component is the administrator/participant web UI, not a Flower training client. It presents API-backed job management, participation, participant Docker commands, and job/round statistics.

- `src/app/`: Next.js routes and layouts.
- `src/components/`: reusable UI components, including existing Tailwind/shadcn patterns.
- `src/services/`: API wrappers, including `training-job.service.ts`; reuse shared fetching/auth behavior.
- `src/types/` and `src/interfaces/`: shared frontend data contracts.
- `src/hooks/`, `src/lib/`, and `src/utils/`: reusable client-side logic.
- `src/i18n/` and `src/localization/`: localization infrastructure.

## Next.js and UI conventions

- Read the relevant locally installed Next.js documentation as required above before changing Next.js code. Respect server/client component and server-action boundaries.
- Reuse existing forms, validation, data fetching, localization, and UI components rather than introducing parallel patterns or dependencies.
- Use authoritative API state for job status, participation, rounds, logs, metrics, and traceability. Do not make browser activity responsible for scheduled publication or training starts.
- Show loading, empty, error, and terminal-job states. Refresh/invalidate relevant job and round data after mutations.
- Keep statistics labeled with the correct round, metric, units, and aggregation semantics. Do not fabricate values or treat missing metrics as zero.
- Keep scheduled and actual execution timestamps distinct. Use timezone-aware boundary values and display dates in the user's timezone.
- Reflect restrictions on modifying/deleting published jobs and joining/leaving jobs, while retaining API-side validation as the security boundary.
- Hide unauthorized controls where appropriate, but never treat UI visibility as authorization. Update API permissions when the feature requires enforcement.

## API contracts and participant credentials

- Keep frontend request/response types and forms aligned with API DTOs. Reuse service wrappers rather than bypassing shared authentication and error handling.
- Distinguish operational database state from confirmed blockchain traceability; do not imply that a submitted transaction is confirmed.
- Show participant tokens and credential-bearing Docker commands only to an authorized recipient. Do not expose them through URLs, analytics, browser logs, or error messages.
- Preserve safely quoted dataset paths, including spaces, in Docker command presentation/configuration. Prefer read-only mounts and coordinate loader changes in `fl/` when adding dataset-directory support; an unused mount is not a complete feature.

## Commands and validation

Run from `client/` using `pnpm`.

| Command      | Purpose / caveat                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `pnpm lint`  | Run frontend ESLint checks.                                                                        |
| `pnpm build` | Build/type-check the Next.js application; may need environment configuration or network resources. |

For behavior changes, add focused regression coverage where supported for frontend/API compatibility, form validation, permission-dependent controls, loading/error/empty states, job/round metric semantics, mutation refresh, and dataset-path/Docker command handling. Report validation blockers rather than claiming checks passed.
