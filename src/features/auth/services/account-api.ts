import { requestJson } from "../../../platform/api/client.ts";
import type { LinkedAccountProvidersResponse } from "../types/account.ts";

export async function fetchLinkedAccountProviders() {
  const payload = await requestJson<LinkedAccountProvidersResponse>(
    "/api/account/providers",
  );
  return payload.providers;
}
