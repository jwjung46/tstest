export type SessionUser = {
  id: string;
  name: string;
  email?: string;
};

export type Session = {
  user: SessionUser;
};

export function getStoredSession(): Session | null {
  return null;
}
