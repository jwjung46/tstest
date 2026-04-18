import type { SessionUser } from "../../../platform/session/session.ts";
import type { LinkedAccountProvider } from "../types/account.ts";
import { getAuthProviderLabel } from "../config/providers.ts";
import { buildAccountLinkStartPath } from "./auth.ts";

export function getAuthenticatedUserSummaryDetails(user: SessionUser) {
  return {
    name: user.name,
    providerLabel: getAuthProviderLabel(user.provider) ?? user.provider,
    email: user.email ?? null,
  };
}

export function getLinkedProviderCardViewModel(
  provider: LinkedAccountProvider,
) {
  if (!provider.isLinked) {
    return {
      label: provider.label,
      statusText: "Not linked",
      badges: ["Available"],
      helperText: `Add ${provider.label} as another sign-in option for this account.`,
      detailRows: [],
      cta: {
        kind: "link" as const,
        label: `Link ${provider.label}`,
        href: buildAccountLinkStartPath(provider.provider, "/app/account"),
      },
    };
  }

  const badges = ["Linked"];

  if (provider.isCurrent) {
    badges.push("Current provider");
  }

  const detailRows = [
    {
      label: "Profile",
      value: provider.providerDisplayName ?? provider.label,
    },
  ];

  if (provider.email) {
    detailRows.push({
      label: "Email",
      value: provider.email,
    });
  }

  if (provider.lastLoginAt) {
    detailRows.push({
      label: "Last login",
      value: provider.lastLoginAt,
    });
  }

  return {
    label: provider.label,
    statusText: "Linked",
    badges,
    helperText: null,
    detailRows,
    cta: {
      kind: "disabled" as const,
      label: "Already linked",
    },
  };
}
