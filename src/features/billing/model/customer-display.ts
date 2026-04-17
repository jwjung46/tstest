function getMaskedSuffix(value: string) {
  if (!value) {
    return null;
  }

  const compact = value.trim();

  if (!compact) {
    return null;
  }

  return compact.slice(-4);
}

export function getBillingCustomerDisplayLabel(customerKey: string | null) {
  const suffix = customerKey ? getMaskedSuffix(customerKey) : null;
  return suffix ? `Toss customer ••••${suffix}` : "-";
}

export function getBillingOwnershipDisplayLabel(userId: string | null) {
  const suffix = userId ? getMaskedSuffix(userId) : null;
  return suffix ? `Internal account ••••${suffix}` : "-";
}
