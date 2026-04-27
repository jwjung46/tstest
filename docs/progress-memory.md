# Project Progress Memory

## Current status

- Current stage: Blank protected app shell baseline.
- Verified state: The app has a public `/` route; a protected `/app` route; a Worker boundary for `/auth/*`, `/auth/sign-out`, and `/api/session`; Google/Kakao/Naver OAuth start and callback flows; Worker-handled sign-out; internal `users` plus `user_identities`; internal-user-backed sessions; and browser-local recent-login provider hinting. The protected shell uses a shared header with theme selection plus a user menu, and `/app` is intentionally blank below the header.
- Operating rule: The current app has no product feature mounted in the protected app body. New product features must be added only through an explicitly scoped cycle that defines the feature boundary, implementation location, validation, and documentation update.
- Verification gate: `npm run verify` is the standard completion gate for cleanup and feature cycles. It runs format checking, linting, type checking, and build only.

## Next product domain

The first product domain will be `work-items`.

A `WorkItem` means a human-managed patent work unit shared between a requester and a worker. It is not an AI job, not a legal case record, and not a generic task.

The requester creates the work item, reviews the result, reports it externally, and finalizes the work. The worker handles the assigned work and marks it complete when the work output is ready.

Initial work item types:

- `oa_response`: OA 검토의견서 작성
- `prior_art_search`: 선행기술조사 보고서 작성
- `translation_review`: 번역 검수

Initial work item statuses:

- `processing`: 업무 등록 후 처리 중
- `completed`: 작업자가 처리 완료
- `reported`: 요청자가 외부 보고 완료
- `closed`: 업무 종료

A newly created work item starts in `processing`.

Out of scope for the first work-item implementation slice:

- file attachments
- AI jobs
- activity logs
- user acknowledgement badges
- result file upload
- status transition UI beyond displaying the current status

## Completed work

### 1. Git repository

- What: Created the Git repository and prepared the workspace for this web app.
- Why: A clean repository is the starting point for version history, rollback, and continuous progress tracking.

### 2. Initial app setup

- What: Created the initial React + TypeScript + Vite application and confirmed that the default screen renders in the browser.
- Why: This establishes a real executable app foundation before route, login, and Worker-boundary work begins.

### 3. Local development server

- What: Started the local dev server and verified that the app opens correctly at a localhost URL.
- Why: Modern web app development needs a local server for module loading, hot reload, and browser-side execution during development.

### 4. ESLint baseline check

- What: Ran the existing `npm run lint` command and confirmed it completes without errors.
- Why: This confirms that the initial codebase already passes the base lint rules before extra tooling is added.

### 5. Prettier installation

- What: Installed Prettier and added the project-level Prettier config files.
- Why: Prettier gives the project a single automatic formatting standard from the beginning.

### 6. Husky installation and initialization

- What: Installed Husky and initialized Git hook support for the repository.
- Why: Husky allows quality checks to run automatically at commit time instead of relying on manual discipline.

### 7. lint-staged installation

- What: Installed `lint-staged` and configured it to run on staged files only.
- Why: This keeps pre-commit checks faster and limited to the files that are actually being committed.

### 8. ESLint and Prettier integration

- What: Installed `eslint-config-prettier` and updated the ESLint config to avoid rule conflicts with Prettier.
- Why: ESLint should handle code-quality rules while Prettier handles formatting, without the two tools fighting each other.

### 9. package.json scripts

- What: Updated `package.json` to include `typecheck`, `lint`, `lint:fix`, `format`, and `format:check` scripts.
- Why: Standardized scripts make project checks repeatable and easy to run at any time.

### 10. Pre-commit hook

- What: Changed `.husky/pre-commit` to run `./node_modules/.bin/lint-staged`.
- Why: This ensures code quality and formatting checks happen automatically before a commit is created.

### 11. Local secret policy

- What: Chose `.dev.vars` as the single local secret file strategy and excluded secret-related files from Git.
- Why: Secrets must stay out of version control, and one clear local convention reduces confusion later.

### 12. .gitignore update

- What: Updated `.gitignore` to ignore `.dev.vars*`, `.env*`, and `.wrangler`.
- Why: These files can contain local secrets or machine-specific data that should not be committed.

### 13. Validation run

- What: Successfully ran `npm run typecheck`, `npm run lint`, `npm run format`, and `npm run format:check`.
- Why: This confirms that the current development environment is functioning correctly before moving on to app structure work.

### 14. Step 2 route skeleton

- What: Added `react-router-dom`, split the app into route-specific pages, and created a guarded `/app` route backed by an early auth boundary.
- Why: This gives the project a production-oriented route boundary now, while keeping real authentication implementation for the next step.

### 15. Phase 3 public and protected route surfaces

- What: Introduced the public and protected route surfaces that later anchored the Worker-backed auth flow.
- Why: This established page-level route surfaces before real authentication and product features were added.

### 16. Phase 4 session boundary refactor

- What: Replaced the boolean-style auth helper with `getSession()`, `getCurrentUser()`, and `isAuthenticated()` over a session boundary.
- Why: This moved route protection to a session-shaped contract so real authentication can be attached later without rewriting route composition.

### 17. Phase 4 stability pass

- What: Added tri-state auth interpretation (`loading`, `authenticated`, `unauthenticated`), preserved full redirect targets, and separated platform session snapshots from auth interpretation.
- Why: This reduces route churn in the next authentication phase and makes the current boundary safer to extend.

### 18. Phase 5 OAuth provider integration

- What: Added real Google / Kakao / Naver OAuth start and callback flows behind the Worker auth boundary, created signed OAuth state handling, and issued signed session cookies from the callback flow.
- Why: This attaches real provider login to the existing auth/session contract without pushing provider-specific logic into page components.

### 19. Worker routing fix for auth and session APIs

- What: Updated `wrangler.jsonc` so `/auth/*` and `/api/*` hit the Worker before the SPA fallback route.
- Why: OAuth callbacks and session reads must execute at the Worker boundary instead of being swallowed by the client-side `/app` entry.

### 20. Phase 6 authenticated route experience

- What: Added a Worker-handled sign-out route, surfaced the signed-in user name and provider in the protected app area, redirected authenticated home visits to `/app`, and centralized public auth error messaging.
- Why: This adds the first useful post-login experience without changing the existing Worker-based OAuth/session architecture.

### 21. Phase 7 and Phase 8 completion pass

- What: Kept the Worker-based OAuth/session mechanics intact while moving protected-route composition into `app/router`, keeping auth-specific UI and auth-specific page interpretation inside `features/auth`, and reducing page-layer logic so `/` and `/app` act as composition entry points only.
- Why: This locked the auth/session structure into stable route and feature boundaries.

### 23. Account linking and merge foundation

- What: Replaced the effective provider-scoped account model with internal `users` plus `user_identities`, routed OAuth callbacks through identity resolution, added explicit signed linking intent, exposed linked login methods in the protected auth area, recorded a recent-login provider hint for `/`, and added a real `mergeUsers(sourceUserId, targetUserId)` server foundation.
- Why: This removes the structural limitation where each provider behaved like a separate app user and makes future merge or unlink work additive instead of redesign-heavy.

### 24. Account summary cleanup and linked-provider presentation

- What: Removed raw internal user ids from the normal signed-in summary and tightened the linked login methods cards so linked vs unlinked provider states read cleanly with aligned button-like CTAs.
- Why: This keeps the internal account model intact while making the account area feel intentional instead of transitional.

### 25. Reset-based account initialization cleanup

- What: Rewrote the account-linking migration to create structure only, removed temporary canonical-profile uplift logic from runtime sign-in, and kept first successful sign-in as the only normal canonical profile initialization path.
- Why: The project is still pre-launch and the database can be reset, so the supported path should be a clean internal-user model from the first successful sign-in instead of preserving temporary normalization branches.

### 26. Stage 1 Toss subscription foundation

- What: Added a durable internal billing schema and Worker billing domain under `worker/src/billing`, including internal-user-owned billing customers, plan catalog, internal subscription contracts, recurring cycle records, idempotent billing event logging, entitlement recomputation, and the initial billing surface under `src/features/billing`.
- Why: Stage 2 needs to attach real Toss billing-key setup, recurring charge approval, and webhook validation without redesigning billing ownership or feature-access structure, so the internal subscription and entitlement model must exist first.

### 27. Stage 2 Toss one-time payment integration

- What: Added real Toss one-time payment checkout/session, frontend checkout launch, success redirect confirm, fail/result handling, webhook normalization and idempotent reconciliation, cycle-to-order/payment linkage, 30-day `pro_monthly` activation rules, billing history updates, and a usable protected billing UI for end-to-end testing in the Worker environment.
- Why: The product now needs real payment confirmation and entitlement updates without breaking the Stage 1 internal-user billing foundation or binding ownership to provider identity, while still leaving recurring billing approval as future work.

### 28. Stage 2 webhook durability correction

- What: Reworked Toss payment webhook ingestion so `/api/webhooks/toss` preserves raw body plus delivery headers, derives durable webhook identity from `tosspayments-webhook-transmission-id`, creates `billing_events` rows before reconciliation, safely dedupes retries, and records accepted-but-unsupported deliveries with `processing_status = ignored`.
- Why: Real Toss payment webhooks do not reliably expose a durable event id in the JSON body, so production-safe Stage 2 behavior must key persistence from the actual delivery contract and must not silently lose webhook deliveries before billing-event storage.

### 29. Protected app shell split and UI relocation

- What: Removed page-specific placeholder content from `app/layout`, kept `pages` as route-entry composition only, added a shared protected header with theme selection and a user dropdown, moved the existing account UI to `/app/account`, moved the existing billing UI to `/app/subscription`, left `/app` intentionally blank below the header, and updated account-linking plus Toss checkout return paths to match the new route structure.
- Why: The protected shell now matches the repo architecture rulebook instead of mixing route-local placeholders into layout, and the account/billing surfaces can evolve independently without turning `/app` into a composite dashboard again.

### 30. Protected shell overlay hardening and billing type alignment

- What: Moved the protected user menu popover to a body-level fixed portal so it no longer sits underneath shell cards, finalized `/app` with a true blank-content shell variant while keeping `/app/account` and `/app/subscription` unchanged, and aligned the frontend billing event type with the Worker's accepted `ignored` processing status.
- Why: This closes the remaining protected-shell UI regressions without widening scope, keeps the shell/layout boundary clean, and removes a frontend-vs-Worker billing contract mismatch.

### 31. Verification baseline

- What: Added `npm run verify` as the standard completion gate, documented it in README validation instructions, and added a GitHub Actions workflow that runs it on pull requests and pushes to `main`.
- Why: Cleanup and feature cycles now share one repeatable baseline without adding tests or git hooks yet.

### 32. Account-management surface cleanup

- What: Removed the active `/app/account` route, account menu link, account page, linked-provider UI, account-management frontend query/prefetch path, and account-management Worker API handler while preserving OAuth sign-in, session snapshots, sign-out, the protected shell, and internal account identity tables used by auth/session.
- Why: The protected app baseline should stay a clean blank shell until the next explicitly scoped product stage, without keeping account-management UI mounted as current app scope.

## Decisions fixed so far

- Language: TypeScript.
- UI framework: React.
- Local dev environment: Vite for the app UI and Wrangler dev for the Worker-based auth/session boundary.
- Routing: React Router with `createBrowserRouter`.
- Formatting tool: Prettier.
- Lint tool: ESLint.
- Commit hook tool: Husky.
- Staged-file runner: lint-staged.
- Local secret file convention: `.dev.vars`.

## Not done yet

- Durable session persistence beyond the current signed-cookie session boundary.

## Next planned stage

- Add the first product feature only through a small vertical slice cycle. The next cycle must keep the current auth/session, protected shell, theme selection, sign-out, and blank `/app` baseline intact unless the user explicitly changes the baseline.
