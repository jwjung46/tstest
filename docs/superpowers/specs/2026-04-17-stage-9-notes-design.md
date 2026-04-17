# Stage 9 Notes Design

## Scope

Stage 9 adds the first real protected feature module: personal notes. The feature lives inside `/app`, uses Cloudflare D1, and preserves the existing Worker-based auth/session boundary. No separate note detail route, no autosave, no collaboration, and no notes-specific logic in page components.

## Architecture

- `src/pages/AppPage.tsx` remains a composition entry point only.
- `src/features/notes` owns note types, services, model logic, and UI.
- `src/platform/api` provides a small generic JSON request helper for frontend API access.
- `worker/src/notes` owns note validation, D1 access, response shaping, and route handlers.
- Worker auth/session remains the source of truth for the current user; notes APIs derive `user_id` from the signed session only.

## Fixed Decisions

- IDs are server-generated UUID strings via `crypto.randomUUID()`.
- `createdAt` and `updatedAt` cross the API boundary as UTC ISO-8601 strings.
- Empty title is allowed, but list/header display falls back to `Untitled`.
- Empty note rejection means: trimmed title is empty and trimmed content is empty, or content is whitespace-only.
- The editor keeps a local draft separate from the last server snapshot so failed saves do not destroy input.
- Switching selection or starting a new note with unsaved changes prompts for confirmation.

## Frontend Data Flow

1. Notes list loads on workspace mount.
2. Notes are normalized and sorted by `updatedAt desc`.
3. The first note auto-selects after a successful list load when no selection exists.
4. The right pane edits either:
   - an existing note draft, or
   - a new-note draft.
5. Save updates local list state from the server response and re-selects the saved note.
6. Delete removes the note locally and re-selects next or previous note based on prior list order.

## Worker Data Flow

1. Resolve current session from the signed cookie.
2. Reject unauthenticated access with `{ error: { code, message } }`.
3. For single-note operations, look up by both `id` and `user_id`.
4. Persist to D1 with `created_at` / `updated_at` ISO strings.
5. Return consistent JSON shapes:
   - list: `{ notes }`
   - single: `{ note }`
   - delete: `{ ok: true }`
   - error: `{ error: { code, message } }`

## Testing

- Pure logic tests cover validation, sorting, default selection, and post-delete selection.
- Worker API tests cover auth requirement, owner scoping, CRUD behavior, and empty-note rejection.
