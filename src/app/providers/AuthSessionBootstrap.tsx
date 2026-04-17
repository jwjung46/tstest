import { useEffect } from "react";
import { initializeSessionSnapshot } from "../../platform/session/session.ts";

export default function AuthSessionBootstrap() {
  useEffect(() => {
    void initializeSessionSnapshot();
  }, []);

  return null;
}
