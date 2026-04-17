import type { AuthProviderId } from "../config/providers.ts";

export type LinkedAccountProvider = {
  provider: AuthProviderId;
  label: string;
  isLinked: boolean;
  isCurrent: boolean;
  canLink: boolean;
  email: string | null;
  emailVerified: boolean | null;
  providerDisplayName: string | null;
  lastLoginAt: string | null;
};

export type LinkedAccountProvidersResponse = {
  providers: LinkedAccountProvider[];
  currentProvider: AuthProviderId;
};
