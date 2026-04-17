import type { WorkerEnv } from "../env.ts";
import {
  BILLING_PROVIDER_ID,
  type BillingProviderId,
  type TossConfig,
  type TossNormalizedPayment,
  type TossNormalizedWebhookEvent,
} from "./types.ts";

const DEFAULT_TOSS_API_BASE_URL = "https://api.tosspayments.com";

export class TossBillingError extends Error {
  code: string;
  status: number;

  constructor(
    code: string,
    message: string,
    {
      status = 400,
    }: {
      status?: number;
    } = {},
  ) {
    super(message);
    this.name = "TossBillingError";
    this.code = code;
    this.status = status;
  }
}

export type TossBillingClient = {
  providerId: BillingProviderId;
  createOrReuseCustomerKey(userId: string): string;
  getConfig(env: WorkerEnv): TossConfig;
  ensureBillingCustomer(userId: string): Promise<{
    provider: BillingProviderId;
    customerKey: string;
  }>;
  confirmOneTimePayment(
    env: WorkerEnv,
    input: {
      paymentKey: string;
      orderId: string;
      amount: number;
    },
  ): Promise<TossNormalizedPayment>;
  fetchPaymentByPaymentKey(
    env: WorkerEnv,
    paymentKey: string,
  ): Promise<TossNormalizedPayment>;
  fetchPaymentByOrderId(
    env: WorkerEnv,
    orderId: string,
  ): Promise<TossNormalizedPayment>;
  cancelPayment(
    env: WorkerEnv,
    input: {
      paymentKey: string;
      cancelReason: string;
    },
  ): Promise<TossNormalizedPayment>;
  normalizeWebhookPayload(payload: unknown): TossNormalizedWebhookEvent;
};

function assertNonEmptyString(value: unknown, code: string, message: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TossBillingError(code, message);
  }

  return value;
}

function assertNumber(value: unknown, code: string, message: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new TossBillingError(code, message);
  }

  return value;
}

function buildBasicAuthorization(secretKey: string) {
  const encoder =
    typeof btoa === "function"
      ? btoa
      : (value: string) => Buffer.from(value, "utf8").toString("base64");
  return `Basic ${encoder(`${secretKey}:`)}`;
}

async function parseJsonResponse(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new TossBillingError(
      "toss_invalid_json",
      "Toss Payments returned an invalid JSON response.",
      {
        status: 502,
      },
    );
  }
}

function normalizePayment(raw: unknown): TossNormalizedPayment {
  if (!raw || typeof raw !== "object") {
    throw new TossBillingError(
      "toss_invalid_payload",
      "Toss Payments returned an invalid payment payload.",
      {
        status: 502,
      },
    );
  }

  const payload = raw as Record<string, unknown>;

  return {
    paymentKey: assertNonEmptyString(
      payload.paymentKey,
      "toss_invalid_payload",
      "Toss Payments paymentKey is missing.",
    ),
    orderId: assertNonEmptyString(
      payload.orderId,
      "toss_invalid_payload",
      "Toss Payments orderId is missing.",
    ),
    status: assertNonEmptyString(
      payload.status,
      "toss_invalid_payload",
      "Toss Payments status is missing.",
    ),
    totalAmount: assertNumber(
      payload.totalAmount,
      "toss_invalid_payload",
      "Toss Payments totalAmount is missing.",
    ),
    currency: typeof payload.currency === "string" ? payload.currency : "KRW",
    method: typeof payload.method === "string" ? payload.method : null,
    approvedAt:
      typeof payload.approvedAt === "string" ? payload.approvedAt : null,
    raw: payload,
  };
}

async function requestTossJson(
  env: WorkerEnv,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const config = getTossPaymentsConfig(env);
  const url = `${config.apiBaseUrl}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        authorization: buildBasicAuthorization(config.secretKey),
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : null),
        ...init?.headers,
      },
    });
  } catch {
    throw new TossBillingError(
      "toss_network_error",
      "Toss Payments could not be reached.",
      {
        status: 502,
      },
    );
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};

    throw new TossBillingError(
      typeof errorPayload.code === "string"
        ? errorPayload.code
        : "toss_request_failed",
      typeof errorPayload.message === "string"
        ? errorPayload.message
        : "Toss Payments rejected the request.",
      {
        status: response.status,
      },
    );
  }

  return payload;
}

export function createOrReuseCustomerKey(userId: string) {
  return `toss_customer_${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function getTossPaymentsConfig(env: WorkerEnv): TossConfig {
  const clientKey = env.TOSS_PAYMENTS_CLIENT_KEY?.trim();
  const secretKey = env.TOSS_PAYMENTS_SECRET_KEY?.trim();

  if (!clientKey || !secretKey) {
    throw new TossBillingError(
      "billing_configuration_error",
      "Toss Payments client key and secret key must both be configured.",
      {
        status: 503,
      },
    );
  }

  return {
    clientKey,
    secretKey,
    environment: env.TOSS_PAYMENTS_ENVIRONMENT === "live" ? "live" : "test",
    apiBaseUrl:
      env.TOSS_PAYMENTS_API_BASE_URL?.trim() || DEFAULT_TOSS_API_BASE_URL,
  };
}

function normalizeWebhookPayload(payload: unknown): TossNormalizedWebhookEvent {
  if (!payload || typeof payload !== "object") {
    throw new TossBillingError(
      "invalid_request",
      "A valid Toss webhook payload is required.",
    );
  }

  const raw = payload as Record<string, unknown>;
  const eventType = assertNonEmptyString(
    raw.eventType,
    "invalid_request",
    "Toss webhook eventType is required.",
  );
  const createdAt = assertNonEmptyString(
    raw.createdAt,
    "invalid_request",
    "Toss webhook createdAt is required.",
  );
  const eventKeySource =
    typeof raw.eventId === "string"
      ? raw.eventId
      : typeof raw.eventKey === "string"
        ? raw.eventKey
        : null;

  if (!eventKeySource) {
    throw new TossBillingError(
      "invalid_request",
      "Toss webhook eventId is required.",
    );
  }

  const data =
    raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : null;

  return {
    eventKey: eventKeySource,
    eventType,
    createdAt,
    orderId: typeof data?.orderId === "string" ? data.orderId : null,
    paymentKey: typeof data?.paymentKey === "string" ? data.paymentKey : null,
    paymentStatus: typeof data?.status === "string" ? data.status : null,
    totalAmount:
      typeof data?.totalAmount === "number" ? data.totalAmount : null,
    approvedAt: typeof data?.approvedAt === "string" ? data.approvedAt : null,
    raw,
  };
}

export function createTossBillingClient(): TossBillingClient {
  return {
    providerId: BILLING_PROVIDER_ID,
    createOrReuseCustomerKey,
    getConfig: getTossPaymentsConfig,
    async ensureBillingCustomer(userId) {
      return {
        provider: BILLING_PROVIDER_ID,
        customerKey: createOrReuseCustomerKey(userId),
      };
    },
    async confirmOneTimePayment(env, input) {
      const payload = await requestTossJson(env, "/v1/payments/confirm", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return normalizePayment(payload);
    },
    async fetchPaymentByPaymentKey(env, paymentKey) {
      const payload = await requestTossJson(
        env,
        `/v1/payments/${encodeURIComponent(paymentKey)}`,
      );
      return normalizePayment(payload);
    },
    async fetchPaymentByOrderId(env, orderId) {
      const payload = await requestTossJson(
        env,
        `/v1/payments/orders/${encodeURIComponent(orderId)}`,
      );
      return normalizePayment(payload);
    },
    async cancelPayment(env, input) {
      const payload = await requestTossJson(
        env,
        `/v1/payments/${encodeURIComponent(input.paymentKey)}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({
            cancelReason: input.cancelReason,
          }),
        },
      );
      return normalizePayment(payload);
    },
    normalizeWebhookPayload,
  };
}
