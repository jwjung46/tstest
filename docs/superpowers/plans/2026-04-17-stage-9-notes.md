# Stage 9 Notes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular personal notes feature inside `/app` with D1-backed owner-scoped CRUD and visible loading/error/empty states.

**Architecture:** Keep page composition thin, close the feature under `src/features/notes`, and keep Worker/D1 access behind the existing auth/session boundary. Use test-first changes for pure notes logic and Worker API behavior.

**Tech Stack:** React 19, TypeScript, Vite, Cloudflare Workers, Cloudflare D1, node:test

---

## Chunk 1: Tests First

### Task 1: Add notes pure-logic tests

**Files:**

- Create: `tests/notes-model.test.mjs`

- [ ] Step 1: Write failing tests for validation, sorting, default selection, and delete-selection transitions.
- [ ] Step 2: Run the test file and verify it fails because notes model modules do not exist yet.

### Task 2: Add notes Worker API tests

**Files:**

- Create: `tests/notes-worker.test.mjs`

- [ ] Step 1: Write failing tests for auth requirement, user scoping, CRUD, and empty-note rejection.
- [ ] Step 2: Run the test file and verify it fails for missing notes Worker modules or routes.

## Chunk 2: Worker Notes Backend

### Task 3: Add D1 schema and Worker notes modules

**Files:**

- Create: `worker/migrations/0001_notes.sql`
- Create: `worker/src/notes/*`
- Modify: `worker/src/index.ts`
- Modify: `worker/src/env.ts`
- Modify: `wrangler.jsonc`

- [ ] Step 1: Implement note validation and response helpers.
- [ ] Step 2: Implement D1 repository helpers with owner-scoped queries.
- [ ] Step 3: Implement `/api/notes` CRUD handlers.
- [ ] Step 4: Run notes Worker tests and make them pass.

## Chunk 3: Frontend Notes Feature

### Task 4: Add notes feature and API client

**Files:**

- Create: `src/platform/api/client.ts`
- Create: `src/features/notes/**`
- Modify: `src/pages/AppPage.tsx`
- Modify: `src/index.css`

- [ ] Step 1: Add note types, validation helpers, and state transition helpers.
- [ ] Step 2: Add notes API service functions.
- [ ] Step 3: Add notes workspace/list/editor UI with loading/error/empty/action states.
- [ ] Step 4: Keep `AppPage` composition-only by mounting the public notes workspace component.
- [ ] Step 5: Run notes model tests and app build/typecheck.

## Chunk 4: Full Verification

### Task 5: Project validation

**Files:**

- Modify: `docs/progress-memory.md`

- [ ] Step 1: Update progress memory for Stage 9 completion.
- [ ] Step 2: Run `npm run format`.
- [ ] Step 3: Run `npm run lint`.
- [ ] Step 4: Run `npm run typecheck`.
- [ ] Step 5: Run `npm run build`.
- [ ] Step 6: Run `node --test tests/auth-session.test.mjs tests/oauth-worker.test.mjs tests/notes-model.test.mjs tests/notes-worker.test.mjs`.
