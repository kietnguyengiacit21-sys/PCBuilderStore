import type { CartItem } from "./cart-api";

export function verifiedCartSubtotal(items: CartItem[]): { amount: number; currency: string } | null {
  if (!items.length) return null;
  const currency = items[0].currency;
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return null;
  if (items.some((item) => item.currency !== currency
      || item.unitPrice === null
      || !Number.isFinite(item.unitPrice)
      || item.unitPrice < 0
      || item.subtotal === null
      || !Number.isFinite(item.subtotal)
      || item.subtotal < 0)) return null;
  return {
    amount: items.reduce((total, item) => total + (item.subtotal ?? 0), 0),
    currency,
  };
}
