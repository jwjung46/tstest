import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../../platform/api/client.ts";
import { getAuthProviderLabel } from "../config/providers.ts";
import { getLinkedProviderCardViewModel } from "../model/account-ui.ts";
import { getAccountLinkFeedback } from "../model/auth.ts";
import { fetchLinkedAccountProviders } from "../services/account-api.ts";
import type { LinkedAccountProvider } from "../types/account.ts";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Linked login methods could not be loaded.";
}

export function LinkedProviderCard({
  provider,
}: {
  provider: LinkedAccountProvider;
}) {
  const card = getLinkedProviderCardViewModel(provider);

  return (
    <article className="linked-provider-card">
      <div className="linked-provider-card__top">
        <div className="linked-provider-card__headline">
          <strong>{card.label}</strong>
          <p className="linked-provider-card__status">{card.statusText}</p>
        </div>
        <div
          className="linked-provider-card__badges"
          aria-label="Provider status"
        >
          {card.badges.map((badge) => (
            <span
              className={
                badge === "Linked" || badge === "Current provider"
                  ? "linked-provider-card__badge linked-provider-card__badge--linked"
                  : "linked-provider-card__badge"
              }
              key={badge}
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="linked-provider-card__body">
        {card.helperText ? (
          <p className="linked-provider-card__helper">{card.helperText}</p>
        ) : null}

        {card.detailRows.length > 0 ? (
          <dl className="linked-provider-card__meta">
            {card.detailRows.map((row) => (
              <div className="linked-provider-card__meta-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <div className="linked-provider-card__actions">
        {card.cta.kind === "link" ? (
          <a
            className="notes-button notes-button--primary"
            href={card.cta.href}
          >
            {card.cta.label}
          </a>
        ) : (
          <button className="notes-button" type="button" disabled>
            {card.cta.label}
          </button>
        )}
      </div>
    </article>
  );
}

export default function LinkedLoginMethodsPanel() {
  const [providers, setProviders] = useState<LinkedAccountProvider[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const feedback = getAccountLinkFeedback({
    accountLinkError: searchParams.get("accountLinkError"),
    accountLinkSuccess: searchParams.get("accountLinkSuccess"),
    accountLinkProviderLabel:
      getAuthProviderLabel(
        searchParams.get("accountLinkProvider") ??
          searchParams.get("accountLinkSuccess") ??
          "",
      ) ?? null,
  });

  useEffect(() => {
    let isActive = true;

    async function load() {
      setStatus("loading");
      setErrorMessage(null);

      try {
        const nextProviders = await fetchLinkedAccountProviders();

        if (!isActive) {
          return;
        }

        setProviders(nextProviders);
        setStatus("ready");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatus("error");
        setErrorMessage(getErrorMessage(error));
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="linked-login-methods" aria-label="Linked login methods">
      <div className="linked-login-methods__header">
        <div>
          <p className="eyebrow">Account</p>
          <h2 className="linked-login-methods__title">Linked login methods</h2>
        </div>
        <p className="hint">
          Keep one account and one notes workspace while adding extra sign-in
          providers.
        </p>
      </div>

      {feedback ? (
        <p className="notes-feedback" role="status">
          {feedback}
        </p>
      ) : null}

      {status === "error" ? (
        <p className="notes-feedback notes-feedback--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="linked-login-methods__grid">
        {providers.map((provider) => (
          <LinkedProviderCard key={provider.provider} provider={provider} />
        ))}
      </div>
    </section>
  );
}
