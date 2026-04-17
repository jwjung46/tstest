import { BILLING_PROVIDER_ID, type BillingProviderId } from "./types.ts";

export type TossBillingClient = {
  providerId: BillingProviderId;
  createOrReuseCustomerKey(userId: string): string;
  ensureBillingCustomer(userId: string): Promise<{
    provider: BillingProviderId;
    customerKey: string;
  }>;
  attachBillingKey(input: {
    userId: string;
    authKey?: string | null;
    customerKey: string;
  }): Promise<{
    billingKey: string;
    methodType: string;
    issuedAt: string;
  }>;
  revokeBillingKey(input: { billingKey: string }): Promise<{
    revokedAt: string;
  }>;
  confirmRecurringCharge(input: {
    billingKey: string;
    orderId: string;
    amount: number;
    currency: string;
  }): Promise<{
    paymentKey: string;
    approvedAt: string;
  }>;
  fetchPaymentByPaymentKey(paymentKey: string): Promise<null>;
  fetchPaymentByOrderId(orderId: string): Promise<null>;
  cancelPayment(input: {
    paymentKey: string;
    reason?: string | null;
  }): Promise<{
    canceledAt: string;
  }>;
};

export function createOrReuseCustomerKey(userId: string) {
  return `toss_customer_${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function createTossBillingClient(): TossBillingClient {
  return {
    providerId: BILLING_PROVIDER_ID,
    createOrReuseCustomerKey,
    async ensureBillingCustomer(userId) {
      return {
        provider: BILLING_PROVIDER_ID,
        customerKey: createOrReuseCustomerKey(userId),
      };
    },
    async attachBillingKey({ authKey, customerKey }) {
      const suffix = authKey?.slice(-8) ?? crypto.randomUUID().slice(0, 8);

      return {
        billingKey: `billing_${customerKey}_${suffix}`,
        methodType: "card",
        issuedAt: new Date().toISOString(),
      };
    },
    async revokeBillingKey() {
      return {
        revokedAt: new Date().toISOString(),
      };
    },
    async confirmRecurringCharge({ orderId }) {
      return {
        paymentKey: `pay_${orderId}`,
        approvedAt: new Date().toISOString(),
      };
    },
    async fetchPaymentByPaymentKey() {
      return null;
    },
    async fetchPaymentByOrderId() {
      return null;
    },
    async cancelPayment() {
      return {
        canceledAt: new Date().toISOString(),
      };
    },
  };
}
