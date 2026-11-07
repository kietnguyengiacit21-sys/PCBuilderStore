export interface CatalogOffer {
  offerCode: string;
  condition: string;
  conditionPercentage?: number | null;
  conditionDescription?: string | null;
  price: string | number;
  currency: string;
  stockQuantity: number;
  availableQuantity: number;
  warrantyMonths: number | null;
  status: string;
  isDemo: boolean;
}

export interface CatalogImage {
  url: string;
  altText: string | null;
  isPrimary: boolean;
}

export type CatalogVerificationStatus =
  | "VERIFIED_EXACT_MODEL"
  | "VERIFIED_EXACT_VARIANT"
  | "NEEDS_REVIEW"
  | "UNKNOWN";

export interface CatalogAttributeVerification {
  verificationStatus: CatalogVerificationStatus;
  sourceUrl: string | null;
  sourceLocator: string | null;
  verificationScope: string | null;
}

export interface CatalogProduct {
  productId: string;
  modelCode: string;
  productName: string;
  shortDescription: string | null;
  description: string | null;
  status: string;
  productType: string;
  productTypeName: string;
  categoryCode: string;
  categoryName: string;
  brandName: string | null;
  offers: CatalogOffer[];
  specifications: Record<string, unknown>;
  verificationMetadata?: Record<string, CatalogAttributeVerification>;
  images: CatalogImage[];
}

export interface CatalogOption {
  value: string;
  label: string;
}

export interface CatalogAttributeFacet {
  productType: string;
  code: string;
  label: string;
  values: { label: string; value: string }[];
}

export interface CatalogAttributeDefinition {
  productType: string;
  code: string;
  label: string;
  dataType: "TEXT" | "DECIMAL" | "INTEGER" | "BOOLEAN" | "JSON";
  unit: string | null;
  filterable: boolean;
  englishLabel?: string;
  subtype?: string | null;
  inputMode?: "TEXT" | "TEXTAREA" | "NUMBER" | "BOOLEAN" | "JSON" | "JSON_ARRAY" | "SELECT" | null;
  options?: string[];
  specificationScope?: "GPU_SILICON" | "BOARD_VARIANT" | null;
}

export interface CatalogFacets {
  productTypes: CatalogOption[];
  categories: CatalogOption[];
  brands: CatalogOption[];
  attributes: CatalogAttributeFacet[];
}

export interface CatalogProductFilters {
  page?: number;
  limit?: number;
  q?: string;
  type?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: "name" | "price";
  order?: "asc" | "desc";
  attributes?: { code: string; value: string }[];
}

export interface CatalogProductPage {
  data: CatalogProduct[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  notice: string;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function fetchPayload<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/catalog${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Catalog API returned an invalid response (HTTP ${response.status}).`);
  }
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Catalog API returned an invalid response.");
  }
  const record = payload as Record<string, unknown>;
  if (!response.ok) {
    const error = record.error;
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "Không thể tải dữ liệu sản phẩm.";
    throw new Error(message);
  }
  if (!("data" in record)) {
    throw new Error("Catalog API returned an invalid response.");
  }
  return payload as T;
}

export function fetchCatalogProducts(
  filters: CatalogProductFilters,
  signal?: AbortSignal,
): Promise<CatalogProductPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") continue;
    if (key === "attributes" && Array.isArray(value)) {
      for (const attribute of value) {
        params.append("attribute", `${attribute.code}=${attribute.value}`);
      }
    } else {
      params.set(key, String(value));
    }
  }
  return fetchPayload<CatalogProductPage>(`/products?${params.toString()}`, signal);
}

export async function fetchCatalogProduct(
  modelCode: string,
  signal?: AbortSignal,
): Promise<{ data: CatalogProduct; notice: string }> {
  const response = await fetchPayload<{ data: CatalogProduct; notice: string }>(
    `/products/${encodeURIComponent(modelCode)}`,
    signal,
  );
  if (typeof response.data !== "object" || response.data === null) {
    throw new Error("Catalog API returned an invalid product.");
  }
  return response;
}

export function fetchCatalogFacets(signal?: AbortSignal): Promise<{ data: CatalogFacets }> {
  return fetchPayload<{ data: CatalogFacets }>("/facets", signal);
}

export function fetchCatalogAttributeDefinitions(
  signal?: AbortSignal,
): Promise<{ data: CatalogAttributeDefinition[] }> {
  return fetchPayload<{ data: CatalogAttributeDefinition[] }>("/attribute-definitions", signal);
}

export async function updateGpuCatalogSpecifications(
  modelCode: string,
  specifications: Record<string, unknown>,
): Promise<void> {
  const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!csrfResponse.ok) {
    throw new Error(`Could not obtain a CSRF token (HTTP ${csrfResponse.status}).`);
  }
  const csrfPayload: unknown = await csrfResponse.json();
  if (typeof csrfPayload !== "object" || csrfPayload === null
      || !("token" in csrfPayload) || typeof csrfPayload.token !== "string") {
    throw new Error("Authentication service returned an invalid CSRF token.");
  }

  const response = await fetch(
    `${apiBaseUrl}/catalog/admin/products/${encodeURIComponent(modelCode)}/specifications`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrfPayload.token,
      },
      body: JSON.stringify({ specifications }),
    },
  );
  if (!response.ok) {
    let message = `GPU specification update failed (HTTP ${response.status}).`;
    try {
      const payload: unknown = await response.json();
      if (typeof payload === "object" && payload !== null && "error" in payload) {
        const error = payload.error;
        if (typeof error === "object" && error !== null && "message" in error
            && typeof error.message === "string") {
          message = error.message;
        }
      }
    } catch {
      throw new Error(`Catalog API returned an invalid error response (HTTP ${response.status}).`);
    }
    throw new Error(message);
  }
}
