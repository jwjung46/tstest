import type { OAuthProviderId } from "../oauth/providers.ts";

export type UserStatus = "active" | "merged" | "disabled";

export type AccountUserRecord = {
  id: string;
  display_name: string;
  primary_email: string | null;
  created_at: string;
  updated_at: string;
  status: UserStatus;
  merged_into_user_id: string | null;
};

export type UserIdentityRecord = {
  id: string;
  user_id: string;
  provider: OAuthProviderId;
  provider_user_id: string;
  email: string | null;
  email_verified: number | null;
  provider_display_name: string;
  created_at: string;
  last_login_at: string;
};

export type NormalizedIdentityPayload = {
  provider: OAuthProviderId;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean | null;
  displayName: string;
};

export type AccountResolutionResult = {
  user: AccountUserRecord;
  activeProvider: OAuthProviderId;
};

export type LinkIdentityResult =
  | {
      ok: true;
      user: AccountUserRecord;
      activeProvider: OAuthProviderId;
    }
  | {
      ok: false;
      code:
        | "provider_already_linked"
        | "identity_already_linked"
        | "identity_linked_to_other_user"
        | "link_session_required";
    };

export type MergeUsersResult = {
  mergedUserId: string;
  sourceUserId: string;
  targetUserId: string;
  movedIdentityCount: number;
  skippedIdentityProviders: OAuthProviderId[];
};
