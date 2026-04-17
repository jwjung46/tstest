# tstest

Cloudflare Worker auth/session boundary 위에 쌓는 재사용형 authenticated app base다. 현재는 Stage 9까지 진행되어 공개 `/` 랜딩, 보호된 `/app` 영역, Worker 기반 OAuth/session 흐름, 그리고 D1-backed personal notes feature를 포함한다.

## Current Scope

- Public route: `/`
- Protected route: `/app`
- Worker-owned routes: `/auth/*`, `/api/*`
- Auth providers: Google, Kakao, Naver
- First protected feature: personal notes inside `/app`

## Architecture

- `src/pages`: 라우트 진입점만 둔다.
- `src/features`: 기능별 UI, 상태, 서비스, 검증을 닫는다.
- `src/platform`: API/session 같은 인프라 경계를 둔다.
- `worker/src`: OAuth, session, notes API, D1 integration을 둔다.

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
- Endpoints:
  - `GET /api/session`
  - `GET /api/notes`
  - `POST /api/notes`
  - `GET /api/notes/:id`
  - `PATCH /api/notes/:id`
  - `DELETE /api/notes/:id`

All notes endpoints derive the owner from the current signed session. The frontend never sends `userId`.

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
