# Project Progress Memory

## Current status

- Current stage: Development environment completed, right before Step 2.
- Verified state: The Vite + React + TypeScript sample app runs successfully in the browser on localhost.

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

- What: Changed `.husky/pre-commit` to run `npx lint-staged`.
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

## Decisions fixed so far

- Language: TypeScript.
- UI framework: React.
- Local dev environment: Vite dev server.
- Formatting tool: Prettier.
- Lint tool: ESLint.
- Commit hook tool: Husky.
- Staged-file runner: lint-staged.
- Local secret file convention: `.dev.vars`.

## Not done yet

- Landing page implementation.
- Login UI implementation.
- Public/protected route structure.
- Google / Kakao / Naver OAuth integration.
- Session handling and protected page access control.
- Cloudflare deployment configuration for production.

## Next planned stage

- Step 2: Create the basic route structure for the public landing area and the protected app area.
