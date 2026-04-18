import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initializeSessionSnapshot } from "../../platform/session/session.ts";
import { prefetchBillingSummaryQuery } from "../../features/billing/model/billing-queries.ts";

export default function AuthSessionBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const snapshot = await initializeSessionSnapshot();

      if (!isActive || snapshot.status !== "authenticated") {
        return;
      }

      await prefetchBillingSummaryQuery(queryClient);
    })();

    return () => {
      isActive = false;
    };
  }, [queryClient]);

  return null;
}
