import { useBillingOverview } from "../model/useBillingOverview.ts";

function formatPrice(currency: string, amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BillingOverviewPanel() {
  const billing = useBillingOverview();

  if (billing.status === "loading") {
    return (
      <section className="billing-panel">
        <div className="billing-panel__header">
          <p className="eyebrow">Billing</p>
          <h2 className="billing-panel__title">Subscription foundation</h2>
          <p className="hint">Loading your internal billing state.</p>
        </div>
      </section>
    );
  }

  if (billing.status === "error") {
    return (
      <section className="billing-panel">
        <div className="billing-panel__header">
          <p className="eyebrow">Billing</p>
          <h2 className="billing-panel__title">Subscription foundation</h2>
          <p className="hint">{billing.error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="billing-panel">
      <div className="billing-panel__header">
        <div>
          <p className="eyebrow">Billing</p>
          <h2 className="billing-panel__title">Internal subscription state</h2>
        </div>
        <p className="hint">
          Stage 1 exposes the internal billing contract and entitlement layer.
          Real Toss checkout and billing-key setup attach in Stage 2.
        </p>
      </div>

      <div className="billing-grid">
        <article className="billing-card">
          <div className="billing-card__header">
            <div>
              <p className="eyebrow">Current Subscription</p>
              <h3>
                {billing.subscription
                  ? billing.subscription.plan.name
                  : "No paid subscription yet"}
              </h3>
            </div>
            <span className="billing-badge">
              {billing.subscription?.status ?? "free"}
            </span>
          </div>
          <dl className="billing-meta">
            <div className="billing-meta__row">
              <dt>Billing customer</dt>
              <dd>{billing.customer?.customerKey ?? "-"}</dd>
            </div>
            <div className="billing-meta__row">
              <dt>Ownership</dt>
              <dd>{billing.customer?.userId ?? "-"}</dd>
            </div>
            <div className="billing-meta__row">
              <dt>Current period</dt>
              <dd>
                {billing.subscription?.currentPeriodStart
                  ? `${billing.subscription.currentPeriodStart} -> ${billing.subscription.currentPeriodEnd}`
                  : "No contract period yet"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="billing-card">
          <div className="billing-card__header">
            <div>
              <p className="eyebrow">Entitlements</p>
              <h3>Feature access source of truth</h3>
            </div>
          </div>
          <ul className="billing-list">
            {billing.entitlements.map((entitlement) => (
              <li className="billing-list__item" key={entitlement.featureKey}>
                <strong>{entitlement.featureKey}</strong>
                <span>
                  {entitlement.status} via {entitlement.sourceType}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="billing-grid">
        <article className="billing-card">
          <div className="billing-card__header">
            <div>
              <p className="eyebrow">Available Plans</p>
              <h3>Stage 1 catalog</h3>
            </div>
          </div>
          <ul className="billing-list">
            {billing.availablePlans.map((plan) => (
              <li className="billing-list__item" key={plan.id}>
                <strong>{plan.name}</strong>
                <span>
                  {plan.planCode} · {formatPrice(plan.currency, plan.amount)}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="billing-card billing-card--placeholder">
          <div className="billing-card__header">
            <div>
              <p className="eyebrow">Stage 2 Attachment Point</p>
              <h3>Payment method setup and checkout</h3>
            </div>
          </div>
          <p className="hint">
            Toss billing-key registration, checkout entry, and real recurring
            charge confirmation plug in here without replacing the Stage 1
            domain model.
          </p>
          <button className="notes-button" disabled type="button">
            Stage 2 checkout entry
          </button>
        </article>
      </div>
    </section>
  );
}
