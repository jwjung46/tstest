import type { BillingCheckoutSession } from "../types/billing.ts";

const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";

type TossPaymentInstance = {
  requestPayment(input: {
    method: "CARD";
    amount: {
      currency: string;
      value: number;
    };
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName: string;
  }): Promise<void>;
};

type TossPaymentsFactory = (clientKey: string) => {
  payment(input: { customerKey: string }): TossPaymentInstance;
};

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
  }
}

let sdkPromise: Promise<TossPaymentsFactory> | null = null;

export async function loadTossPaymentsSdk() {
  if (window.TossPayments) {
    return window.TossPayments;
  }

  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${TOSS_SDK_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.TossPayments) {
            resolve(window.TossPayments);
            return;
          }

          reject(new Error("Toss Payments SDK failed to initialize."));
        });
        existingScript.addEventListener("error", () => {
          reject(new Error("Toss Payments SDK could not be loaded."));
        });
        return;
      }

      const script = document.createElement("script");
      script.src = TOSS_SDK_URL;
      script.async = true;
      script.onload = () => {
        if (window.TossPayments) {
          resolve(window.TossPayments);
          return;
        }

        reject(new Error("Toss Payments SDK failed to initialize."));
      };
      script.onerror = () => {
        reject(new Error("Toss Payments SDK could not be loaded."));
      };

      document.head.append(script);
    });
  }

  return sdkPromise;
}

export async function startTossPayment(checkout: BillingCheckoutSession) {
  const TossPayments = await loadTossPaymentsSdk();
  const payment = TossPayments(checkout.clientKey).payment({
    customerKey: checkout.customerKey,
  });

  await payment.requestPayment({
    method: "CARD",
    amount: {
      currency: checkout.currency,
      value: checkout.amount,
    },
    orderId: checkout.orderId,
    orderName: checkout.orderName,
    successUrl: checkout.successUrl,
    failUrl: checkout.failUrl,
    ...(checkout.customerEmail
      ? {
          customerEmail: checkout.customerEmail,
        }
      : null),
    customerName: checkout.customerName,
  });
}
