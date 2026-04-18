import { useQuery, type QueryClient } from "@tanstack/react-query";
import { fetchLinkedAccountProviders } from "../services/account-api.ts";
import { accountQueryKeys } from "./account-query-keys.ts";

export function prefetchLinkedAccountProvidersQuery(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: accountQueryKeys.linkedProviders,
    queryFn: fetchLinkedAccountProviders,
  });
}

export function useLinkedAccountProvidersQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: accountQueryKeys.linkedProviders,
    queryFn: fetchLinkedAccountProviders,
    enabled: options?.enabled,
  });
}
