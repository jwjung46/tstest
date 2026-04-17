export type SessionUser = {
  id: string;
  name: string;
  email?: string;
  provider: string;
};

export type Session = {
  user: SessionUser;
};

export type SessionSnapshot =
  | {
      status: "loading";
      session: null;
    }
  | {
      status: "authenticated";
      session: Session;
    }
  | {
      status: "unauthenticated";
      session: null;
    };

type SessionSnapshotResponse = {
  session: Session | null;
};

const LOADING_SNAPSHOT: SessionSnapshot = {
  status: "loading",
  session: null,
};

let currentSnapshot: SessionSnapshot = LOADING_SNAPSHOT;
let sessionBootstrapPromise: Promise<SessionSnapshot> | null = null;
const listeners = new Set<() => void>();

function emitSessionSnapshotChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setSessionSnapshot(snapshot: SessionSnapshot) {
  currentSnapshot = snapshot;
  emitSessionSnapshotChange();
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    (candidate.email === undefined || typeof candidate.email === "string") &&
    typeof candidate.provider === "string"
  );
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isSessionUser(candidate.user);
}

export function resolveSessionSnapshotResponse(
  payload: unknown,
): SessionSnapshot {
  if (!payload || typeof payload !== "object") {
    return {
      status: "unauthenticated",
      session: null,
    };
  }

  const candidate = payload as Partial<SessionSnapshotResponse>;

  if (candidate.session === null) {
    return {
      status: "unauthenticated",
      session: null,
    };
  }

  if (isSession(candidate.session)) {
    return {
      status: "authenticated",
      session: candidate.session,
    };
  }

  return {
    status: "unauthenticated",
    session: null,
  };
}

export function getSessionSnapshot(): SessionSnapshot {
  return currentSnapshot;
}

export function subscribeToSessionSnapshot(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export async function initializeSessionSnapshot(): Promise<SessionSnapshot> {
  if (sessionBootstrapPromise) {
    return sessionBootstrapPromise;
  }

  sessionBootstrapPromise = (async () => {
    try {
      const response = await fetch("/api/session", {
        credentials: "include",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        const snapshot = {
          status: "unauthenticated",
          session: null,
        } satisfies SessionSnapshot;

        setSessionSnapshot(snapshot);
        return snapshot;
      }

      const snapshot = resolveSessionSnapshotResponse(await response.json());
      setSessionSnapshot(snapshot);
      return snapshot;
    } catch {
      const snapshot = {
        status: "unauthenticated",
        session: null,
      } satisfies SessionSnapshot;

      setSessionSnapshot(snapshot);
      return snapshot;
    } finally {
      sessionBootstrapPromise = null;
    }
  })();

  return sessionBootstrapPromise;
}
