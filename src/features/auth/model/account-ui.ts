import type { SessionUser } from "../../../platform/session/session.ts";
import { getAuthProviderLabel } from "../config/providers.ts";

export function getAuthenticatedUserSummaryDetails(user: SessionUser) {
  return {
    name: user.name,
    providerLabel: getAuthProviderLabel(user.provider) ?? user.provider,
    email: user.email ?? null,
  };
}
