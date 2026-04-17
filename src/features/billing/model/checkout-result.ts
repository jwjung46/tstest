export type BillingCheckoutReturn =
  | {
      flow: "success";
      orderId: string;
      paymentKey: string;
      amount: number;
    }
  | {
      flow: "fail";
      orderId: string | null;
      code: string | null;
      message: string | null;
    }
  | null;

export function parseBillingCheckoutReturn(
  searchParams: URLSearchParams,
): BillingCheckoutReturn {
  const flow = searchParams.get("billingFlow");

  if (flow === "success") {
    const orderId = searchParams.get("orderId");
    const paymentKey = searchParams.get("paymentKey");
    const amount = Number(searchParams.get("amount"));

    if (!orderId || !paymentKey || Number.isNaN(amount)) {
      return null;
    }

    return {
      flow: "success",
      orderId,
      paymentKey,
      amount,
    };
  }

  if (flow === "fail") {
    return {
      flow: "fail",
      orderId: searchParams.get("orderId"),
      code: searchParams.get("code"),
      message: searchParams.get("message"),
    };
  }

  return null;
}
