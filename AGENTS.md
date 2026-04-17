# AGENTS.md

This file defines the implementation rules for this repository.
Any coding agent working in this repo must read and follow this file before making changes.

## 1. Project goal

This project is a single web app built with React + TypeScript + Vite and intended to run with Cloudflare infrastructure later.
It is not a throwaway prototype. Build decisions should favor long-term maintainability, modularity, and clear boundaries.

## 2. Current development strategy

The project follows this development style:

- First, build the full visible UI skeleton.
- After that, implement real features one by one as isolated modules.
- Do not mix unfinished feature logic into unrelated areas.
- Do not add fake flows that will be discarded later unless explicitly requested.

The user prefers:

- calm, stable, non-hacky implementation
- no unnecessary abstraction
- no temporary code that will obviously be thrown away
- code that can remain in the real product

## 3. Current project phase

At the time this file was created:

- project scaffold is complete
- dev environment is complete
- public route `/` and protected route `/app` already exist
- current auth check is temporary
- real OAuth/session is not implemented yet

Current expected next work:

- build real UI skeleton for `/` and `/app`
- keep auth temporary until explicit auth/session implementation phase

## 4. Architecture rules

These rules are mandatory.

### 4.1 Feature boundary rule

A feature must not directly depend on another feature's internal files.

Allowed:

- feature -> shared
- feature -> platform
- page/route -> feature

Not allowed:

- feature A -> feature B internal component/hook/state/service

If cross-feature interaction is needed, use a shared interface, platform layer, or a higher composition layer.

### 4.2 Shared vs feature code

Use these categories:

- `shared/ui`: truly reusable presentational components
- `shared/lib`: pure utility functions
- `shared/types`: globally shared types only
- `platform`: auth, session, API client, storage, environment access, infrastructure concerns
- `features/*`: feature-specific UI, state, logic, services
- `pages/*` or route-level files: page composition only

Do not put feature-specific code into `shared`.
Do not put infrastructure concerns inside feature UI components.

### 4.3 Route rule

Routes are entry points, not feature containers.

- `/` is public
- `/app` is protected
- protected logic must stay centralized
- route files should compose modules rather than own business logic

### 4.4 Auth and session rule

Auth/session access must stay behind a clear boundary.

Do not scatter session access across arbitrary components.
Keep auth/session logic in a dedicated platform-level place.

Preferred direction:

- `getSession()`
- `getCurrentUser()`
- `requireAuth()` or equivalent guard

### 4.5 API rule

Do not place raw fetch logic everywhere.

API access should be centralized either in:

- platform API client, or
- feature-local service modules

UI components should not directly own networking details when avoidable.

### 4.6 State rule

State should live at the narrowest level that makes sense.

- local UI state stays local
- feature state stays inside the feature
- app-wide state is only for truly global concerns

Do not introduce large global state prematurely.

### 4.7 Styling rule

Prioritize clarity and stability over visual polish.

- keep styles simple
- avoid unnecessary animation
- avoid duplicate spacing/color definitions when common tokens are enough
- extract reusable layout primitives only when reuse is clear

Prefer reusable structure, not premature design systems.

## 5. Reusability policy

Reusability matters, but over-abstraction is forbidden.

Create shared components only when one of these is true:

1. the same structure is already repeated
2. the component is almost certain to be reused soon
3. the component represents a layout primitive or app shell primitive

Good examples of early reusable components:

- page container
- auth button
- app shell
- empty state

Bad examples of early reusable components:

- landing-page-only content sections
- one-off marketing blocks
- overly generic wrappers without proven reuse

## 6. Implementation constraints

Unless explicitly requested, do not:

- implement real OAuth before the auth phase
- add mock login flows that distort the final architecture
- add large libraries just for convenience
- introduce state libraries too early
- over-generalize components
- collapse page composition and platform/auth logic into one place

## 7. Quality requirements

Before considering a task complete, run:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Any implementation report should include:

1. changed files
2. why the structure was chosen
3. what was intentionally kept unabstracted
4. validation results

## 8. Coding style expectations

- Prefer readable code over clever code.
- Keep files easy for a beginner to revisit later.
- Use clear names.
- Avoid hidden side effects.
- Do not use `any` unless there is a strong reason.
- Keep TypeScript strictness intact.

## 9. If unsure

If a decision would trade off between speed and architectural stability, choose architectural stability.
If a proposed abstraction feels premature, do not add it.
If a task risks crossing phase boundaries, stop at the current phase boundary.

## 10. Working instruction for coding agents

Before implementing anything:

1. identify the current phase
2. stay inside that phase
3. preserve module boundaries
4. avoid temporary architecture
5. prefer code that can remain in production

If additional project memory documents exist under `docs/`, read them and follow them as secondary guidance.
