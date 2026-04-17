# tstest

Cloudflare Worker auth/session boundary 위에 쌓는 재사용형 authenticated app base다. 현재는 Stage 9 notes feature 이후 내부 `users` + `user_identities` 계정 모델, provider linking, recent-login provider hint, merge foundation까지 포함한다.

## Current Scope

- Public route: `/`
- Protected route: `/app`
- Worker-owned routes: `/auth/*`, `/api/*`
- Auth providers: Google, Kakao, Naver
- Canonical account model: internal user + linked identities
- First protected feature: personal notes inside `/app`

## Architecture

- `src/pages`: 라우트 진입점만 둔다.
- `src/features`: 기능별 UI, 상태, 서비스, 검증을 닫는다.
- `src/platform`: API/session 같은 인프라 경계를 둔다.
- `worker/src`: OAuth, session, account linking, notes API, D1 integration을 둔다.

현재 기준에서 `AppPage`는 notes 비즈니스 로직을 직접 소유하지 않고 `NotesWorkspace`를 조합만 한다.

## Notes Feature

현재 notes 모듈은 다음을 지원한다.

- signed-in user scoped notes list
- two-pane list/editor workspace
- first-note auto-selection
- manual save only
- hard delete only
- loading, empty, fetch-error, save-error, delete-error states

현재 stage 범위 밖:

- search
- tags
- sharing/collaboration
- attachments
- rich text / markdown
- separate note detail route

## Data / API

- Storage: Cloudflare D1
- Migration: `worker/migrations/0001_notes.sql`
- Account migrations: `worker/migrations/0002_account_linking.sql`
- Endpoints:
  - `GET /api/session`
  - `GET /api/account/providers`
  - `GET /api/notes`
  - `POST /api/notes`
  - `GET /api/notes/:id`
  - `PATCH /api/notes/:id`
  - `DELETE /api/notes/:id`

`/api/session` now returns an internal-user-backed session snapshot plus a browser-local recent login provider hint. OAuth callbacks resolve provider identities into internal users before issuing sessions, and all notes endpoints derive ownership from the internal session user id. The frontend never sends `userId`.

On successful sign-in, legacy imported placeholder canonical names such as `Imported Google User` can now be normalized once from confirmed provider profile data. The normal signed-in summary no longer exposes the raw internal user id, and linked login methods now render with cleaner provider-status-driven cards.

## Account Model

- `users` is the canonical app account table.
- `user_identities` stores one linked provider identity per provider for each user.
- Session `user.id` is an internal user id, not a provider id.
- `notes.user_id` now means internal user ownership.
- Linking is explicit and only allowed while signed in.
- Automatic email-based linking or merging is intentionally not implemented.
- Server-side merge foundations exist so future merge UI can stay additive.
- The raw internal session user id remains internal data and is not shown in the normal end-user summary UI.

## Local Development

- App UI: Vite
- Worker/dev boundary: Wrangler

```bash
npm run dev
npm run dev:cf
```

## Validation

```bash
npm run format
npm run lint
npm run typecheck
npm run build
node --test tests/auth-session.test.mjs tests/oauth-worker.test.mjs tests/notes-model.test.mjs tests/notes-worker.test.mjs
```

## Project Docs

Before making structural changes, read:

1. `AGENTS.md`
2. `docs/progress-memory.md`
3. `docs/modular-architecture-guidelines.md`
