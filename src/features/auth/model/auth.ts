import type {
  Session,
  SessionSnapshot,
  SessionUser,
} from "../../../platform/session/session.ts";
import { getSessionSnapshot } from "../../../platform/session/session.ts";
import type { AuthProviderId } from "../config/providers.ts";

export type AuthState =
  | {
      status: "loading";
      session: null;
      user: null;
      recentLoginProvider: string | null;
    }
  | {
      status: "authenticated";
      session: Session;
      user: SessionUser;
      recentLoginProvider: string | null;
    }
  | {
      status: "unauthenticated";
      session: null;
      user: null;
      recentLoginProvider: string | null;
    };

type RedirectTargetParts = {
  pathname: string;
  search?: string;
  hash?: string;
};

type RequireAuthResult =
  | {
      allowed: true;
      reason: "authenticated";
    }
  | {
      allowed: false;
      reason: "loading" | "unauthenticated";
    };

type HomeRouteBehavior =
  | {
      kind: "pending";
    }
  | {
      kind: "render";
    }
  | {
      kind: "redirect";
      to: "/app";
    };

const DEFAULT_AUTH_ERROR_MESSAGE =
  "Login could not be completed. Please try again.";

const AUTH_ERROR_MESSAGES = {
  access_denied: "Login was canceled before it completed.",
  invalid_state: "Your login session expired. Please try again.",
  oauth_callback_failed: DEFAULT_AUTH_ERROR_MESSAGE,
  token_exchange_failed: DEFAULT_AUTH_ERROR_MESSAGE,
  userinfo_fetch_failed:
    "Your account information could not be loaded. Please try again.",
} as const satisfies Record<string, string>;

export function resolveAuthState(snapshot: SessionSnapshot): AuthState {
  if (snapshot.status === "authenticated") {
    return {
      status: "authenticated",
      session: snapshot.session,
      user: snapshot.session.user,
      recentLoginProvider: snapshot.recentLoginProvider,
    };
  }

  if (snapshot.status === "loading") {
    return {
      status: "loading",
      session: null,
      user: null,
      recentLoginProvider: snapshot.recentLoginProvider,
    };
  }

  return {
    status: "unauthenticated",
    session: null,
    user: null,
    recentLoginProvider: snapshot.recentLoginProvider,
  };
}

export function getAuthState(): AuthState {
  return resolveAuthState(getSessionSnapshot());
}

export function getSession(): Session | null {
  return getAuthState().session;
}

export function getCurrentUser(): SessionUser | null {
  return getAuthState().user;
}

export function isAuthenticated(): boolean {
  return getAuthState().status === "authenticated";
}

export function requireAuth(authState: AuthState): RequireAuthResult {
  if (authState.status === "authenticated") {
    return {
      allowed: true,
      reason: "authenticated",
    };
  }

  return {
    allowed: false,
    reason: authState.status,
  };
}

export function buildAuthRedirectTarget({
  pathname,
  search = "",
  hash = "",
}: RedirectTargetParts): string {
  return `${pathname}${search}${hash}`;
}

export function buildOAuthStartPath(
  provider: AuthProviderId,
  redirectTo: string,
): string {
  const params = new URLSearchParams({
    redirectTo,
  });

  return `/auth/${provider}/start?${params.toString()}`;
}

export function buildSignOutPath() {
  return "/auth/sign-out";
}

export function getDefaultPostAuthRedirectTarget(state: unknown): string {
  if (
    state &&
    typeof state === "object" &&
    typeof (state as { from?: unknown }).from === "string"
  ) {
    return (state as { from: string }).from;
  }

  return "/app";
}

export function getHomeRouteBehavior(authState: AuthState): HomeRouteBehavior {
  if (authState.status === "authenticated") {
    return {
      kind: "redirect",
      to: "/app",
    };
  }

  if (authState.status === "loading") {
    return {
      kind: "pending",
    };
  }

  return {
    kind: "render",
  };
}

export function getAuthErrorMessage(authError: string): string {
  return (
    AUTH_ERROR_MESSAGES[authError as keyof typeof AUTH_ERROR_MESSAGES] ??
    DEFAULT_AUTH_ERROR_MESSAGE
  );
}

export function getPublicAuthFeedback({
  authError,
  authProviderLabel,
}: {
  authError: string | null;
  authProviderLabel: string | null;
}): string | null {
  if (!authError) {
    return null;
  }

  return `${getAuthErrorMessage(authError)} ${
    authProviderLabel ? `Provider: ${authProviderLabel}.` : ""
  }`.trim();
}
