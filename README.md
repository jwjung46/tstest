# tstest

Cloudflare Worker auth/session boundary on top of a feature-closed protected app. The current repo includes internal `users` + `user_identities`, provider linking, merge foundations, personal notes, and a Stage 1 Toss subscription foundation built around internal-user billing ownership.

## Current Scope

- Public route: `/`
- Protected route: `/app`
- Worker-owned routes: `/auth/*`, `/api/*`
- Auth providers: Google, Kakao, Naver
- Canonical account model: internal user + linked identities
- Current `/app` scope: account/session surfaces, billing overview, and personal notes

## Architecture

- `src/pages`: route entry points only
- `src/features`: feature-owned UI, state, services, and validation
- `src/platform`: shared API/session boundaries
- `worker/src`: OAuth, session, account linking, billing, notes, and D1 integration

The protected app shell composes feature modules. Billing and notes stay inside `src/features/*`, and page components do not own billing or notes domain logic.

## Internal Account Model

- `users` is the canonical app account table.
- `user_identities` stores linked provider identities.
- Session `user.id` is an internal user id, not a provider id.
- `notes.user_id` means internal-user ownership.
- Billing ownership is internal-user-based only through `billing_customers.user_id`.
- Linking is explicit and only allowed while signed in.
- Automatic email linking, unlink UI, and end-user merge UI are intentionally not shipped yet.

## Billing Stage 1

Stage 1 adds the durable internal billing foundation so Stage 2 can attach real Toss integration without redesign:

- `billing_customers`: internal user to external billing customer mapping
- `billing_payment_methods`: billing-key and payment-method lifecycle storage
- `subscription_plans`: seeded plan catalog including `free` and `pro_monthly`
- `subscriptions`: internal subscription contracts
- `subscription_cycles`: recurring billing period records
- `billing_events`: idempotent event log for API/webhook processing
- `entitlements`: app-level feature access source of truth
- `manual_entitlement_overrides`: future-safe operational overrides

The Worker billing domain lives under `worker/src/billing`:

- `repository.ts`: D1 access only
- `service.ts`: billing orchestration and subscription lifecycle
- `entitlements.ts`: entitlement recomputation and access queries
- `toss-client.ts`: stable Toss abstraction for Stage 2
- `api.ts`: Worker route handlers

### Billing API

- `POST /api/billing/customer/bootstrap`
- `GET /api/billing/subscription`
- `GET /api/billing/entitlements`
- `GET /api/billing/history`
- `POST /api/billing/subscriptions`
- `POST /api/billing/subscriptions/:id/cancel`
- `POST /api/webhooks/toss`

Authenticated billing endpoints derive the current internal user from the session. The webhook endpoint does not depend on a logged-in user.

## Notes Feature

The notes module currently includes:

- signed-in user scoped notes list
- two-pane list/editor workspace
- first-note auto-selection
- manual save only
- hard delete only
- loading, empty, fetch-error, save-error, delete-error states

Not in scope yet:

- search
- tags
- sharing/collaboration
- attachments
- rich text / markdown
- separate note detail route
- premium gating of notes through entitlements

## D1 Migrations

- `worker/migrations/0001_notes.sql`
- `worker/migrations/0002_account_linking.sql`
- `worker/migrations/0003_billing_core.sql`

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

## Stage 2 Still Required

Stage 1 does not yet include:

- real Toss client key / secret wiring
- billing-key registration and authKey confirmation
- real recurring charge approval
- real webhook signature and payload verification
- recurring charge scheduling
- production payment-method UX

## Project Docs

Before making structural changes, read:

1. `AGENTS.md`
2. `docs/progress-memory.md`
3. `docs/modular-architecture-guidelines.md`
