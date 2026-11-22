/** Formats an amount as Vietnamese currency text (no decimals); "—" for non-numbers. */
export function money(value: number | string, currency = "VND"): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
