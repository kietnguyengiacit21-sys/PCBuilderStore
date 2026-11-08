export interface PromotionCampaign {
  campaignId: string;
  campaignCode: string;
  campaignName: string;
  campaignTag: string | null;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  exclusive: boolean;
  enabled: boolean;
  archived: boolean;
}

export interface PromotionGift {
  offerId: string;
  productName?: string;
  modelCode?: string;
  quantity: number;
  selectionRequired: boolean;
  displayOrder: number;
}

export interface PromotionGiftRequest {
  giftOfferId: string;
  quantity: number;
  selectionRequired: boolean;
  displayOrder: number;
}

export interface ProductPromotion {
  promotionId: string;
  campaignId: string;
  campaignName: string;
  productId: string;
  modelCode: string;
  productName: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | "FIXED_PRICE";
  discountValue: number;
  discountCurrencyCode: string | null;
  displayCopy: string | null;
  saleBadge: string | null;
  conditions: string[];
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  exclusive: boolean;
  enabled: boolean;
  gifts: PromotionGift[];
}

export interface CampaignPayload {
  campaignCode: string;
  campaignName: string;
  campaignTag: string;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  exclusive: boolean;
  enabled: boolean;
}

export interface ProductPromotionPayload {
  campaignId: string;
  productId: string;
  discountType: ProductPromotion["discountType"];
  discountValue: number;
  discountCurrencyCode: string | null;
  displayCopy: string;
  saleBadge: string;
  conditions: string[];
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  exclusive: boolean;
  enabled: boolean;
  gifts: PromotionGiftRequest[];
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const managementPath = "/catalog/admin/management";

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
    throw new Error(`Promotion service returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const error = typeof payload === "object" && payload !== null && "error" in payload
      ? payload.error
      : null;
    const message = typeof error === "object" && error !== null && "message" in error
      && typeof error.message === "string"
      ? error.message
      : `Promotion request failed (HTTP ${response.status}).`;
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

async function mutate<T>(path: string, method: "POST" | "PUT" | "PATCH", body?: unknown): Promise<T> {
  const token = await csrfToken();
  return request<T>(path, {
    method,
    headers: { "X-XSRF-TOKEN": token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export function fetchPromotionCampaigns(includeArchived = false): Promise<PromotionCampaign[]> {
  return request(`${managementPath}/promotion-campaigns?includeArchived=${includeArchived}`);
}

export function savePromotionCampaign(
  payload: CampaignPayload,
  campaignId?: string,
): Promise<PromotionCampaign> {
  return campaignId
    ? mutate(`${managementPath}/promotion-campaigns/${encodeURIComponent(campaignId)}`, "PUT", payload)
    : mutate(`${managementPath}/promotion-campaigns`, "POST", payload);
}

export function archivePromotionCampaign(campaignId: string): Promise<PromotionCampaign> {
  return mutate(`${managementPath}/promotion-campaigns/${encodeURIComponent(campaignId)}/archive`, "POST");
}

export function fetchProductPromotions(campaignId: string): Promise<ProductPromotion[]> {
  return request(`${managementPath}/promotions?campaignId=${encodeURIComponent(campaignId)}`);
}

export function saveProductPromotion(
  payload: ProductPromotionPayload,
  promotionId?: string,
): Promise<ProductPromotion> {
  return promotionId
    ? mutate(`${managementPath}/promotions/${encodeURIComponent(promotionId)}`, "PUT", payload)
    : mutate(`${managementPath}/promotions`, "POST", payload);
}

export function setProductPromotionEnabled(
  promotionId: string,
  enabled: boolean,
): Promise<ProductPromotion> {
  return mutate(
    `${managementPath}/promotions/${encodeURIComponent(promotionId)}/enabled?enabled=${enabled}`,
    "PATCH",
  );
}
