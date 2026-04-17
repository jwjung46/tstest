import { useAuthState } from "../model/useAuthState.ts";
import AuthenticatedUserSummary from "./AuthenticatedUserSummary.tsx";
import LinkedLoginMethodsPanel from "./LinkedLoginMethodsPanel.tsx";

export default function AuthenticatedSessionPanel() {
  const authState = useAuthState();

  if (authState.status !== "authenticated") {
    return null;
  }

  return (
    <>
      <AuthenticatedUserSummary user={authState.user} />
      <LinkedLoginMethodsPanel />
    </>
  );
}
