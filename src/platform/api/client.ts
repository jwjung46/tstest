export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function requestJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : null),
      ...init?.headers,
    },
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorPayload
    | null;

  if (!response.ok) {
    const errorPayload =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object"
        ? (payload as ApiErrorPayload).error
        : null;

    throw new ApiError(
      response.status,
      errorPayload?.code ?? "request_failed",
      errorPayload?.message ?? "The request could not be completed.",
    );
  }

  return payload as T;
}
