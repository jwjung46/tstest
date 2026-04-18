# tstest

Cloudflare Worker auth/session boundary for an application with internal `users` + `user_identities`, provider linking, merge foundations, personal notes, and a Stage 2 Toss one-time payment integration built around internal-user billing ownership.

## Current Scope

- Public route: `/`
- Protected routes: `/app`, `/app/account`, `/app/subscription`
- Worker-owned routes: `/auth/*`, `/api/*`
- Auth providers: Google, Kakao, Naver
- Canonical account model: internal user + linked identities
- Current protected shell:
  - `/app`: header-only protected home with blank body
  - `/app/account`: account/session summary plus linked-provider management
  - `/app/subscription`: Toss billing and checkout state
  - shared header overlays use body-level fixed portal popovers to avoid stacking conflicts with the shell panels

## Architecture

- `src/pages`: route entry points only
- `src/features`: feature-owned UI, state, services, and validation
- `src/platform`: shared API/session boundaries
- `worker/src`: OAuth, session, account linking, billing, notes, and D1 integration

Feature modules are composed through the protected app shell. Billing and notes stay inside `src/features/*`, and page components do not own billing or notes domain logic.

## Internal Account Model

- `users` is the canonical app account table.
- `user_identities` stores linked provider identities.
- Session `user.id` is an internal user id, not a provider id.
- `notes.user_id` means internal-user ownership.
- Billing ownership is internal-user-based only through `billing_customers.user_id`.
- Linking is explicit and only allowed while signed in.
- Automatic email linking, unlink UI, and end-user merge UI are intentionally not shipped yet.

## Billing Stage 2

Stage 2 keeps the Stage 1 schema and internal ownership model intact, then attaches real Toss one-time payment flow on top:

- `pro_monthly` currently means a one-time 30-day paid access contract
- successful one-time payment sets `current_period_start = payment success time`
- successful one-time payment sets `current_period_end = success time + 30 days`
- entitlements remain the final feature-access layer
- Toss `customerKey` is a short deterministic internal-user-derived key, while ownership still stays anchored by `billing_customers.user_id`
- payment webhooks are durably recorded in `billing_events` before reconciliation, with delivery identity derived from `tosspayments-webhook-transmission-id`
- `billing_events.processing_status` now distinguishes `processed`, `failed`, and `ignored` for accepted-but-not-acted-on webhook deliveries
- recurring charge approval, billing keys, and scheduler-driven renewal are not implemented yet

The Worker billing domain lives under `worker/src/billing`:

- `repository.ts`: D1 access only
- `service.ts`: checkout, confirm, reconciliation, subscription lifecycle, and entitlement updates
- `entitlements.ts`: entitlement recomputation and access queries
- `toss-client.ts`: real Toss HTTP client, payload normalization, and typed billing errors
- `api.ts`: Worker route handlers

### Billing API

- `POST /api/billing/customer/bootstrap`
- `POST /api/billing/checkout/session`
- `POST /api/billing/checkout/confirm`
- `GET /api/billing/checkout/result`
- `GET /api/billing/subscription`
- `GET /api/billing/entitlements`
- `GET /api/billing/history`
- `POST /api/billing/subscriptions/:id/cancel`
- `POST /api/webhooks/toss`

Authenticated billing endpoints derive the current internal user from the session. The webhook endpoint does not depend on a logged-in user.

### Checkout, Confirm, and Webhook Flow

1. Signed-in internal user chooses `pro_monthly` in the protected billing UI.
2. `POST /api/billing/checkout/session` creates a pending `subscription_cycles` record with a unique `toss_order_id`.
3. The frontend opens Toss Payments with the Worker-issued client key, amount, order id, and redirect URLs.
4. Toss redirects back to `/app/subscription` on success or fail.
5. On success, the frontend calls `POST /api/billing/checkout/confirm`.
6. The Worker confirms with Toss using the secret key, validates `paymentKey`, `orderId`, and `amount`, then marks the cycle paid and the subscription active.
7. Entitlements are recomputed from the internal subscription state.
8. `POST /api/webhooks/toss` reads the raw body plus Toss delivery headers, derives the durable webhook identity from `tosspayments-webhook-transmission-id`, stores a `billing_events` row first, then dedupes and reconciles supported payment events.
9. Supported `PAYMENT_STATUS_CHANGED` events reconcile against the existing internal cycle and subscription records without changing ownership semantics.
10. Accepted but currently-unused webhook deliveries are persisted with `processing_status = ignored` instead of failing delivery.

### Toss Environment Keys

Required Worker env/secrets:

- `TOSS_PAYMENTS_CLIENT_KEY`
- `TOSS_PAYMENTS_SECRET_KEY`
- `TOSS_PAYMENTS_ENVIRONMENT`
- `TOSS_PAYMENTS_API_BASE_URL` optional override, defaults to `https://api.tosspayments.com`

`TOSS_PAYMENTS_CLIENT_KEY` is only exposed to the frontend through the authenticated checkout-session response. `TOSS_PAYMENTS_SECRET_KEY` stays Worker-only.

### Cloudflare Local and Deployment Setup

Add the Toss keys to the same Worker environment that already owns `/auth/*` and `/api/*`.

Local `.dev.vars` example:

```bash
AUTH_COOKIE_SECRET=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
KAKAO_OAUTH_CLIENT_ID=...
KAKAO_OAUTH_CLIENT_SECRET=...
NAVER_OAUTH_CLIENT_ID=...
NAVER_OAUTH_CLIENT_SECRET=...
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
TOSS_PAYMENTS_ENVIRONMENT=test
```

If the Toss client key or secret key is missing, checkout/session and confirm requests fail with a clear billing configuration error instead of silently starting a broken flow.

## Notes Feature

The notes module currently includes:

- signed-in user scoped notes list
- two-pane list/editor workspace
- first-note auto-selection
- manual save only
- hard delete only
- loading, empty, fetch-error, save-error, delete-error states

The notes feature code still exists under `src/features/notes`, but it is not currently mounted in the default protected home UI.

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
- `worker/migrations/0004_billing_event_processing_ignored.sql`

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

## Still Deferred

- real recurring billing approval
- Toss billing-key lifecycle
- scheduler-driven renewals
- recurring cancel/resume semantics
- broader webhook source hardening beyond the current Toss payment delivery contract, which exposes transmission-id headers for payment webhooks but not the payout/seller signature header
- durable session persistence beyond the current signed-cookie session boundary

## Project Docs

Before making structural changes, read:

1. `AGENTS.md`
2. `docs/progress-memory.md`
3. `docs/modular-architecture-guidelines.md`
