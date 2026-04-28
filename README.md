# tstest

Cloudflare Worker auth/session boundary for an application with internal `users` + `user_identities`, OAuth sign-in, and a protected app shell.

## Current Scope

- Public route: `/`
- Protected route: `/app`
- Worker-owned routes: `/auth/*`, `/api/session`, `/api/work-items`
- Auth providers: Google, Kakao, Naver
- Canonical account model: internal user + provider identities
- Current protected shell:
  - `/app`: protected work item list plus in-panel work item creation UI in the shell body
  - shared header overlays use body-level fixed portal popovers to avoid stacking conflicts with the shell panels

## Architecture

- `src/pages`: route entry points only
- `src/features`: feature-owned UI, state, services, and validation
- `src/platform`: shared API/session boundaries
- `worker/src`: OAuth, session, account identity, WorkItems, and D1 integration

Feature modules are composed through the protected app shell. Page components remain route entry points and do not own feature domain logic.

## Internal Account Model

- `users` is the canonical app account table.
- `user_identities` stores provider identities for session resolution.
- Session `user.id` is an internal user id, not a provider id.

## Cloudflare Local and Deployment Setup

Local `.dev.vars` example:

```bash
AUTH_COOKIE_SECRET=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
KAKAO_OAUTH_CLIENT_ID=...
KAKAO_OAUTH_CLIENT_SECRET=...
NAVER_OAUTH_CLIENT_ID=...
NAVER_OAUTH_CLIENT_SECRET=...
```

## D1 Migrations

- `worker/migrations/0002_account_linking.sql`
- `worker/migrations/0003_work_items.sql`

## Local Development

- App UI: Vite
- Worker/dev boundary: Wrangler

```bash
npm run dev
npm run dev:cf
```

## Validation

```bash
npm run test
npm run verify
```

`npm run test` runs the current automated test suite.
`npm run verify` is the standard completion gate for cleanup and feature cycles.
It runs `format:check`, `lint`, `typecheck`, `test`, and `build`.

## Still Deferred

- durable session persistence beyond the current signed-cookie session boundary

## Project Docs

Before making structural changes, read:

1. `AGENTS.md`
2. `docs/progress-memory.md`
3. `docs/modular-architecture-guidelines.md`
