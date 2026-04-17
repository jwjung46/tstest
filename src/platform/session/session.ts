export type SessionUser = {
  id: string;
  name: string;
  email?: string;
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

export function getSessionSnapshot(): SessionSnapshot {
  return {
    status: "unauthenticated",
    session: null,
  };
}
