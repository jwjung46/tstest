import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../../platform/api/client.ts";
import { getAuthProviderLabel } from "../config/providers.ts";
import {
  buildAccountLinkStartPath,
  getAccountLinkFeedback,
} from "../model/auth.ts";
import { fetchLinkedAccountProviders } from "../services/account-api.ts";
import type { LinkedAccountProvider } from "../types/account.ts";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Linked login methods could not be loaded.";
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
          Link additional providers to the same internal account without
          splitting notes by provider.
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
          <article className="linked-provider-card" key={provider.provider}>
            <div className="linked-provider-card__top">
              <div>
                <strong>{provider.label}</strong>
                <p className="hint">
                  {provider.isLinked ? "Linked" : "Not linked"}
                  {provider.isCurrent ? " · Current session" : ""}
                </p>
              </div>
              <span
                className={
                  provider.isLinked
                    ? "linked-provider-card__badge linked-provider-card__badge--linked"
                    : "linked-provider-card__badge"
                }
              >
                {provider.isLinked ? "Linked" : "Available"}
              </span>
            </div>

            <div className="linked-provider-card__meta">
              <span>
                Provider name: {provider.providerDisplayName ?? "Not linked"}
              </span>
              <span>Email: {provider.email ?? "Not available"}</span>
              <span>
                Last login:{" "}
                {provider.lastLoginAt ? provider.lastLoginAt : "Never"}
              </span>
            </div>

            {provider.canLink ? (
              <a
                className="notes-button notes-button--primary"
                href={buildAccountLinkStartPath(provider.provider, "/app")}
              >
                Link {provider.label}
              </a>
            ) : (
              <button className="notes-button" type="button" disabled>
                Already linked
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
