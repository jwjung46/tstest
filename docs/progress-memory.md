# Project Progress Memory

## Current status

- Current stage: Phase 5 OAuth integration completed with a focused cleanup pass.
- Verified state: The app has a public `/` route, a protected `/app` route, a Worker boundary for `/auth/*` and `/api/*`, Google/Kakao/Naver OAuth start and callback flows, and a tri-state auth structure already attached to the real session boundary.

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

## Decisions fixed so far

- Language: TypeScript.
- UI framework: React.
- Local dev environment: Vite dev server.
- Routing: React Router with `createBrowserRouter`.
- Formatting tool: Prettier.
- Lint tool: ESLint.
- Commit hook tool: Husky.
- Staged-file runner: lint-staged.
- Local secret file convention: `.dev.vars`.

## Not done yet

- Durable session persistence beyond the current signed-cookie session boundary.
- Logout UX and richer authenticated account controls.
- Protected app internal modules and feature screens.

## Next planned stage

- Keep the current Worker-based auth/session boundary and move to richer protected-app features or more durable session/account capabilities in a later phase.
