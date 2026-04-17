# Project Progress Memory

## Current status

- Current stage: Stage 9 notes baseline plus account linking, merge foundation, and reset-based account initialization cleanup completed on top of the existing Worker auth/session boundary.
- Verified state: The app has a public `/` route, a protected `/app` route, a Worker boundary for `/auth/*` and `/api/*`, Google/Kakao/Naver OAuth start and callback flows, signed sign-in vs link state handling, internal `users` plus `user_identities`, internal-user-backed sessions, browser-local recent-login provider hinting, linked-provider lookup inside the protected app shell, merge foundations, and personal notes with internal-user D1 ownership. Canonical `users.display_name` and `users.primary_email` are now initialized from confirmed provider data on the first successful sign-in for a new identity, later sign-ins do not auto-overwrite canonical profile fields, the normal signed-in summary no longer shows raw internal user ids, and linked login methods render with cleaner provider-status-driven cards.

## Completed work

### 1. Git repository

- What: Created the Git repository and prepared it as the base workspace for this web app.
- Why: A clean repository is the starting point for version history, rollback, and continuous progress tracking.

### 2. Base app scaffold

- What: Created the initial React + TypeScript + Vite application scaffold and confirmed that the default sample screen renders in the browser.
- Why: This establishes a real executable app foundation before any landing page, login flow, or protected route work begins.

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

- What: Added `react-router-dom`, split the app into route-specific pages, and created a guarded `/app` route backed by a placeholder auth module.
- Why: This gives the project a production-oriented route boundary now, while keeping real authentication implementation for the next step.

### 15. Phase 3 public and protected UI skeleton

- What: Turned `/` into a landing page with disabled social-login entry UI and turned `/app` into an app-shell placeholder structure.
- Why: This established reusable page-level UI before real authentication and feature modules are added.

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
- Why: OAuth callbacks and session reads must execute at the Worker boundary instead of being swallowed by the client-side app shell.

### 20. Phase 6 first authenticated user experience

- What: Added a Worker-handled sign-out route, surfaced the signed-in user name and provider inside the protected app shell, redirected authenticated home visits to `/app`, and centralized public auth error messaging.
- Why: This adds the first useful post-login experience without changing the existing Worker-based OAuth/session architecture.

### 21. Phase 7 and Phase 8 completion pass

- What: Kept the Worker-based OAuth/session mechanics intact while moving protected-route composition into `app/router`, keeping auth-specific UI and auth-specific page interpretation inside `features/auth`, and reducing page-layer logic so `/` and `/app` act as composition entry points only.
- Why: This locks the repository into a reusable authenticated web-app base before any Stage 9 product module work begins.

### 22. Stage 9 personal notes feature

- What: Added a D1-backed `notes` schema plus owner-scoped Worker CRUD endpoints under `/api/notes`, then implemented the first feature-closed product module under `src/features/notes` with a two-pane list/editor workspace, manual save, hard delete, empty/loading/error states, and tests for pure notes logic plus Worker API behavior.
- Why: This turns the previously empty protected app base into the first reusable reference feature module without breaking the existing auth/session boundary or pushing notes logic into page components.

### 23. Account linking and merge foundation

- What: Replaced the effective provider-scoped account model with internal `users` plus `user_identities`, migrated `notes.user_id` semantics to internal users, routed OAuth callbacks through identity resolution, added explicit signed linking intent, exposed linked login methods in the protected auth area, recorded a recent-login provider hint for `/`, and added a real `mergeUsers(sourceUserId, targetUserId)` server foundation.
- Why: This removes the structural limitation where each provider behaved like a separate app user, keeps notes continuity under one internal account, and makes future merge or unlink work additive instead of redesign-heavy.

### 24. Account summary cleanup and linked-provider presentation

- What: Removed raw internal user ids from the normal signed-in summary and tightened the linked login methods cards so linked vs unlinked provider states read cleanly with aligned button-like CTAs.
- Why: This keeps the internal account model intact while making the account area feel intentional instead of transitional.

### 25. Reset-based account initialization cleanup

- What: Rewrote the account-linking migration to create structure only, removed imported placeholder canonical-profile uplift logic from runtime sign-in, kept first successful sign-in as the only normal canonical profile initialization path, and preserved notes ownership under internal user ids.
- Why: The project is still pre-launch and the database can be reset, so the supported path should be a clean internal-user model from the first successful sign-in instead of preserving temporary placeholder normalization branches.

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
- End-user merge wizard UI, unlink UI, automatic email-based linking, role systems, refresh-token rotation, or richer profile/settings flows.
- Any Stage 10+ expansion beyond the initial personal notes module, such as search, sharing, tags, attachments, or separate note detail routes.

## Next planned stage

- Expand beyond the current notes-plus-account foundation only after preserving the same feature-closed structure, Worker auth/session boundary, internal-user ownership rules, and explicit linking/merge policies established here.
