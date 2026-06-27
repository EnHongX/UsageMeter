export type BillingCurrency = "USD" | "CNY";

export function formatMoney(cents: number, currency: BillingCurrency = "USD") {
  const symbol = currency === "CNY" ? "¥" : "$";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}
