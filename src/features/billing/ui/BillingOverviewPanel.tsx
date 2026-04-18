import { useBillingOverview } from "../model/useBillingOverview.ts";
import {
  getBillingCustomerDisplayLabel,
  getBillingOwnershipDisplayLabel,
} from "../model/customer-display.ts";

function formatPrice(currency: string, amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getResultCopy(
  result: ReturnType<typeof useBillingOverview>["checkoutResult"],
) {
  if (!result) {
    return null;
  }

  if (result.status === "success") {
    return {
      tone: "success",
      title: "Payment confirmed",
      description:
        "Your 30-day pro_monthly access was confirmed on the server and entitlement state was refreshed.",
    } as const;
  }

  if (result.status === "fail") {
    return {
      tone: "error",
      title: result.code,
      description: result.message,
    } as const;
  }

  return {
    tone: "neutral",
    title: "Payment pending",
    description:
      "The checkout return was received, but the final billing state is still pending.",
  } as const;
}

export default function BillingOverviewPanel() {
  const billing = useBillingOverview();
  const resultCopy = getResultCopy(billing.checkoutResult);

  if (billing.status === "loading") {
    return (
      <section className="billing-panel">
        <div className="billing-panel__header">
          <p className="eyebrow">Billing</p>
          <h2 className="billing-panel__title">Toss Payments Stage 2</h2>
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
          <h2 className="billing-panel__title">Toss Payments Stage 2</h2>
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
          <h2 className="billing-panel__title">
            One-time Toss payment testing
          </h2>
        </div>
        <p className="hint">
          pro_monthly currently means one successful payment grants 30 days of
          paid access. Auto-renew and billing keys are not enabled in this
          stage.
        </p>
      </div>

      {resultCopy ? (
        <div
          className={`billing-feedback billing-feedback--${resultCopy.tone}`}
        >
          <strong>{resultCopy.title}</strong>
          <span>{resultCopy.description}</span>
        </div>
      ) : null}

      {billing.error ? (
        <div className="billing-feedback billing-feedback--error">
          <strong>Billing action failed</strong>
          <span>{billing.error}</span>
        </div>
      ) : null}

      <div className="billing-grid">
        <article className="billing-card">
          <div className="billing-card__header">
            <div>
              <p className="eyebrow">Current Subscription</p>
              <h3>
                {billing.subscription
                  ? billing.subscription.plan.name
                  : "No paid contract yet"}
              </h3>
            </div>
            <span className="billing-badge">
              {billing.subscription?.status ?? "free"}
            </span>
          </div>
          <dl className="billing-meta">
            <div className="billing-meta__row">
              <dt>Billing customer</dt>
              <dd>
                {getBillingCustomerDisplayLabel(
                  billing.customer?.customerKey ?? null,
                )}
              </dd>
            </div>
            <div className="billing-meta__row">
              <dt>Ownership</dt>
              <dd>
                {getBillingOwnershipDisplayLabel(
                  billing.customer?.userId ?? null,
                )}
              </dd>
            </div>
            <div className="billing-meta__row">
              <dt>Current period</dt>
              <dd>
                {billing.subscription?.currentPeriodStart
                  ? `${formatDate(billing.subscription.currentPeriodStart)} -> ${formatDate(billing.subscription.currentPeriodEnd)}`
                  : "No paid access period yet"}
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
              <p className="eyebrow">Plans</p>
              <h3>Real Toss checkout entry</h3>
            </div>
          </div>
          <div className="billing-plan-grid">
            {billing.availablePlans.map((plan) => {
              const isPaidPlan = plan.planCode === "pro_monthly";
              const isBusy = billing.actionStatus !== "idle";

              return (
                <div className="billing-plan-card" key={plan.id}>
                  <div className="billing-plan-card__copy">
                    <strong>{plan.name}</strong>
                    <span>{plan.planCode}</span>
                    <p className="hint">
                      {isPaidPlan
                        ? "One-time payment. Server confirm activates 30 days of pro access."
                        : "Default fallback entitlement set for signed-in users."}
                    </p>
                  </div>
                  <div className="billing-plan-card__footer">
                    <strong>{formatPrice(plan.currency, plan.amount)}</strong>
                    {isPaidPlan ? (
                      <button
                        className="notes-button notes-button--primary"
                        disabled={isBusy}
                        onClick={() => {
                          void billing.startCheckout(plan.planCode);
                        }}
                        type="button"
                      >
                        {billing.actionStatus === "starting"
                          ? "Opening Toss..."
                          : billing.actionStatus === "confirming"
                            ? "Confirming..."
                            : "Pay with Toss"}
                      </button>
                    ) : (
                      <button className="notes-button" disabled type="button">
                        Included
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="billing-card">
          <div className="billing-card__header">
            <div>
              <p className="eyebrow">Checkout</p>
              <h3>Latest checkout request</h3>
            </div>
          </div>
          <dl className="billing-meta">
            <div className="billing-meta__row">
              <dt>Order ID</dt>
              <dd>{billing.checkoutSession?.orderId ?? "-"}</dd>
            </div>
            <div className="billing-meta__row">
              <dt>Amount</dt>
              <dd>
                {billing.checkoutSession
                  ? formatPrice(
                      billing.checkoutSession.currency,
                      billing.checkoutSession.amount,
                    )
                  : "-"}
              </dd>
            </div>
            <div className="billing-meta__row">
              <dt>Flow rule</dt>
              <dd>
                Browser redirect is UX only. Worker confirm is final truth.
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="billing-grid">
        <article className="billing-card">
          <div className="billing-card__header">
            <div>
              <p className="eyebrow">Cycle History</p>
              <h3>Internal payment cycles</h3>
            </div>
          </div>
          <ul className="billing-list">
            {billing.historyStatus === "loading" ? (
              <li className="billing-list__item">
                <strong>Loading cycle history</strong>
                <span>Recent payment cycles are being fetched separately.</span>
              </li>
            ) : billing.historyError ? (
              <li className="billing-list__item">
                <strong>History unavailable</strong>
                <span>{billing.historyError}</span>
              </li>
            ) : billing.cycles.length === 0 ? (
              <li className="billing-list__item">
                <strong>No billing cycle yet</strong>
                <span>
                  Start a Toss checkout to create the first pending cycle.
                </span>
              </li>
            ) : (
              billing.cycles.map((cycle) => (
                <li className="billing-list__item" key={cycle.id}>
                  <strong>
                    #{cycle.cycleIndex} {cycle.status}
                  </strong>
                  <span>
                    {cycle.tossOrderId} /{" "}
                    {formatPrice(cycle.currency, cycle.scheduledAmount)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="billing-card">
          <div className="billing-card__header">
            <div>
              <p className="eyebrow">Billing Events</p>
              <h3>Confirm and webhook log</h3>
            </div>
          </div>
          <ul className="billing-list">
            {billing.historyStatus === "loading" ? (
              <li className="billing-list__item">
                <strong>Loading billing events</strong>
                <span>
                  Confirm and webhook logs will appear after history loads.
                </span>
              </li>
            ) : billing.historyError ? (
              <li className="billing-list__item">
                <strong>Event log unavailable</strong>
                <span>{billing.historyError}</span>
              </li>
            ) : billing.events.length === 0 ? (
              <li className="billing-list__item">
                <strong>No event yet</strong>
                <span>Confirm and webhook events will be stored here.</span>
              </li>
            ) : (
              billing.events.map((event) => (
                <li className="billing-list__item" key={event.id}>
                  <strong>{event.eventType}</strong>
                  <span>
                    {event.sourceType} / {event.processingStatus} /{" "}
                    {formatDate(event.receivedAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}
