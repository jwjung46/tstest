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

On the first successful sign-in for a new provider identity, the Worker creates the canonical `users` row immediately from confirmed provider profile data, links the `user_identities` row, and issues a session for that internal user. Later sign-ins update identity-side provider metadata only and do not auto-overwrite canonical `users.display_name` or `users.primary_email`.

## Account Model

- `users` is the canonical app account table.
- `user_identities` stores one linked provider identity per provider for each user.
- Session `user.id` is an internal user id, not a provider id.
- `notes.user_id` now means internal user ownership.
- Pre-launch account initialization assumes a resettable D1 database and a clean first-sign-in path. Imported placeholder canonical-profile uplift is not part of the supported runtime.
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

## D1 Reset And Reapply

This repo now assumes a pre-launch reset-based account initialization flow. The intended remote reset path is:

1. Delete the current remote D1 database.

```bash
npx wrangler d1 delete tstest-notes
```

2. Create a fresh remote D1 database and capture the new `database_id`.

```bash
npx wrangler d1 create tstest-notes
```

3. Update `wrangler.jsonc` so `d1_databases[0].database_id` points at the new database.

4. Apply the checked-in migrations to the fresh database.

```bash
npx wrangler d1 migrations apply DB --remote
```

5. Deploy after the migrations have been applied to the target database.

```bash
npx wrangler deploy
```

6. Verify the reset flow against the deployed app:

- Sign in with one provider on the fresh database and confirm the new account shows the provider display name and provider email immediately.
- Sign out and sign back in with the same provider after changing provider-side profile data in the test fixture or provider mock path; confirm the canonical summary does not get overwritten on later sign-ins.
- While signed in, link a second provider and confirm both login methods appear under the same account.
- Create a note, refresh, and confirm the note still appears for the same internal account.
- Sign in with a different account and confirm that note does not appear there.

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
