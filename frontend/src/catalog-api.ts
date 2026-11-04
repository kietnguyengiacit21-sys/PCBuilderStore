export interface CatalogOffer {
  offerCode: string;
  condition: string;
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
