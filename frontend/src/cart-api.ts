export interface CartItem {
  offerId: string;
  productName: string;
  modelCode: string;
  quantity: number;
  unitPrice: number;
  baseUnitPrice: number;
  discountAmount: number;
  currency: string;
  subtotal: number;
  availableQuantity: number;
  availability: "AVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "UNAVAILABLE" | "INVALID_PRICE";
  availabilityMessage: string;
  campaignName: string | null;
  promotionDisplayCopy: string | null;
  saleBadge: string | null;
  promotions: AppliedPromotion[];
  gifts: GiftOffer[];
  selectedGifts: GiftSelection[];
  configuration: CartConfiguration | null;
}

export interface CartConfiguration {
  upgrades: { groupId: string; optionId: string; quantity: number }[];
  bundles: { bundleId: string; offerIds: string[] }[];
  componentPriceDifference: number;
  bundleSubtotal: number;
  bundleDiscount: number;
  available: boolean;
  availabilityMessage: string;
}

export interface UpgradeSelection {
  groupId: string;
  optionId: string;
  quantity: number;
}

export interface BundleSelection {
  bundleId: string;
  offerIds: string[];
}

export interface AppliedPromotion {
  promotionId: number;
  campaignName: string;
  discountType: string;
  discountValue: number;
  discountCurrencyCode: string | null;
  discountAmount: number;
  displayCopy: string;
  saleBadge: string;
}

export interface GiftOffer {
  promotionId: number;
  offerId: string;
  productName: string;
  modelCode: string;
  quantity: number;
  selectionRequired: boolean;
  availableQuantity: number;
  active: boolean;
}

export interface GiftSelection {
  promotionId: string;
  offerId: string;
  quantity: number;
}

export interface CartResponse {
  items: CartItem[];
  itemCount: number;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Cart service returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload
      ? payload.error
      : null;
    const message = typeof error === "object" && error !== null && "message" in error
      && typeof error.message === "string"
      ? error.message
      : `Cart request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

async function csrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Could not obtain a CSRF token (HTTP ${response.status}).`);
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null
      || !("token" in payload) || typeof payload.token !== "string") {
    throw new Error("Authentication service returned an invalid CSRF token.");
  }
  return payload.token;
}

async function mutate(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<CartResponse> {
  const token = await csrfToken();
  return request<CartResponse>(path, {
    method,
    headers: { "X-XSRF-TOKEN": token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export function fetchCart(): Promise<CartResponse> {
  return request<CartResponse>("/cart");
}

export function addCartItem(offerId: string, quantity: number): Promise<CartResponse> {
  return mutate("/cart/items", "POST", { offerId, quantity });
}

export function updateCartItem(offerId: string, quantity: number): Promise<CartResponse> {
  return mutate(`/cart/items/${encodeURIComponent(offerId)}`, "PUT", { quantity });
}

export function updateCartItemGifts(offerId: string, gifts: GiftSelection[]): Promise<CartResponse> {
  return mutate(`/cart/items/${encodeURIComponent(offerId)}/gifts`, "PUT", { gifts });
}

export function updateCartItemConfiguration(
  offerId: string,
  upgrades: UpgradeSelection[],
  bundles: BundleSelection[],
): Promise<CartResponse> {
  return mutate(`/cart/items/${encodeURIComponent(offerId)}/configuration`, "PUT", { upgrades, bundles });
}

export function removeCartItem(offerId: string): Promise<CartResponse> {
  return mutate(`/cart/items/${encodeURIComponent(offerId)}`, "DELETE");
}

export function clearCart(): Promise<CartResponse> {
  return mutate("/cart", "DELETE");
}
