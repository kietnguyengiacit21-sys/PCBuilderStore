export { canPurchaseOffer, customerVisibleOffers, offerOriginalPrice } from "./catalog-offers";
export type { CatalogOffer } from "./catalog-offers";

import type { CatalogOffer } from "./catalog-offers";

export interface CatalogImage {
  url: string;
  altText: string | null;
  isPrimary: boolean;
  caption?: string | null;
  mediaType?: "IMAGE" | "VIDEO";
}

export interface CatalogBomComponent {
  componentProductId: string;
  modelCode: string;
  productName: string;
  productType: string;
  quantity: number;
  warrantyMonths: number | null;
  displayCategory: string;
  displayOrder: number;
  imageUrl?: string | null;
  imageAltText?: string | null;
  keySpecifications?: Record<string, unknown> | null;
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

export interface CatalogAttributeQuality {
  valueQuality: string;
  displayLabel: string;
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
  featured?: boolean;
  displayOrder?: number;
  offers: CatalogOffer[];
  specifications: Record<string, unknown>;
  specificationQuality?: Record<string, CatalogAttributeQuality>;
  verificationMetadata?: Record<string, CatalogAttributeVerification>;
  images: CatalogImage[];
  bomComponents?: CatalogBomComponent[];
  contentSections?: unknown;
}

export interface AdminProductSummary {
  productId: string;
  modelCode: string;
  productName: string;
  productType: string;
  categoryName: string;
  brandName: string | null;
  status: string;
  minimumPrice: number | null;
  currency: string | null;
  availableQuantity: number;
}

export interface AdminProductPage {
  data: AdminProductSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface AdminOffer {
  offerId: string;
  condition: "NEW" | "LIKE_NEW" | "USED";
  price: number;
  compareAtPrice: number | null;
  currency: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  warrantyMonths: number;
  status: "ACTIVE" | "INACTIVE";
  minimumPurchaseQuantity: number;
  maximumPurchaseQuantity: number;
  lowStockThreshold: number | null;
}

export interface AdminImage {
  imageId: string;
  url: string;
  altText: string | null;
  caption: string | null;
  mediaType: "IMAGE" | "VIDEO";
  mimeType: string | null;
  fileName: string | null;
  primary: boolean;
  displayOrder: number;
}

export interface AdminBomComponent {
  componentProductId: string;
  modelCode: string;
  productName: string;
  productType: string;
  quantity: number;
  warrantyMonths: number | null;
  displayCategory: string;
  displayOrder: number;
  customerVisible: boolean;
}

export interface AdminProduct {
  productId: string;
  modelCode: string;
  productName: string;
  sku: string | null;
  slug: string | null;
  productType: string;
  productTypeName: string;
  categoryCode: string;
  categoryName: string;
  brandName: string | null;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[];
  featured: boolean;
  displayOrder: number;
  status: string;
  contentSections: unknown;
  specifications: Record<string, unknown>;
  offers: AdminOffer[];
  images: AdminImage[];
  bomComponents: AdminBomComponent[];
}

export interface AdminProductWrite {
  modelCode: string;
  productName: string;
  sku: string | null;
  slug: string | null;
  productType: string;
  categoryCode: string;
  brandName: string | null;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[];
  featured: boolean;
  displayOrder: number;
  contentSections: unknown;
  specifications: Record<string, unknown>;
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

export interface PublicCatalogAttributeDefinition {
  productType: string;
  code: string;
  label: string;
  dataType: "TEXT" | "DECIMAL" | "INTEGER" | "BOOLEAN" | "JSON";
  unit?: string | null;
  subtype?: string | null;
}

export interface CatalogAttributeDefinition extends PublicCatalogAttributeDefinition {
  filterable?: boolean;
  englishLabel?: string;
  subtype?: string | null;
  inputMode?: "TEXT" | "TEXTAREA" | "NUMBER" | "BOOLEAN" | "JSON" | "JSON_ARRAY" | "SELECT" | null;
  options?: string[];
  specificationScope?: "GPU_SILICON" | "BOARD_VARIANT" | null;
}

export interface AdminCatalogAttributeDefinition extends CatalogAttributeDefinition {
  unit: string | null;
  filterable: boolean;
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
  pcCollection?: string;
  accessoryType?: string;
  sale?: boolean;
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
}

export interface StorefrontHomepageLink {
  label: string;
  href: string;
}

export interface StorefrontHomepageSection {
  key: string;
  title: string;
  eyebrow: string;
  href: string;
  variant: string;
  productCount: number;
  links: StorefrontHomepageLink[];
  products: CatalogProduct[];
}

export interface StorefrontHomepage {
  sections: StorefrontHomepageSection[];
}

export interface PcBuilderCompatibilityCheck {
  code: string;
  label: string;
  status: "COMPATIBLE" | "INCOMPATIBLE" | "INSUFFICIENT_DATA";
  detail: string;
}

export interface PcBuilderCompatibilityResult {
  status: "COMPATIBLE" | "INCOMPATIBLE" | "INSUFFICIENT_DATA";
  checks: PcBuilderCompatibilityCheck[];
  warnings: string[];
}

export interface UpgradeChoice {
  optionId: string;
  offerId: string;
  productId: string;
  modelCode: string;
  productName: string;
  productType: string;
  price: number;
  currency: string;
  availableQuantity: number;
  priceDifference: number;
  displayName: string;
  description: string | null;
  defaultOption: boolean;
  minimumQuantity: number;
  maximumQuantity: number;
  displayOrder: number;
}

export interface UpgradeGroup {
  groupId: string;
  groupCode: string;
  displayName: string;
  description: string | null;
  required: boolean;
  displayOrder: number;
  options: UpgradeChoice[];
}

export interface UpgradeBundleItem {
  offerId: string;
  productId: string;
  modelCode: string;
  productName: string;
  productType: string;
  price: number;
  currency: string;
  availableQuantity: number;
  required: boolean;
  defaultSelected: boolean;
  displayOrder: number;
}

export interface UpgradeBundle {
  bundleId: string;
  name: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  eligibleConditions: string[];
  startsAt: string | null;
  endsAt: string | null;
  displayOrder: number;
  items: UpgradeBundleItem[];
}

export interface UpgradeRelatedProduct {
  productId: string;
  modelCode: string;
  productName: string;
  productType: string;
  offerId: string;
  price: number;
  currency: string;
  availableQuantity: number;
  displayOrder: number;
}

export interface PublicUpgradeConfiguration {
  groups: UpgradeGroup[];
  bundles: UpgradeBundle[];
  relatedProducts: UpgradeRelatedProduct[];
}

export interface GamingPerformanceEstimate {
  resolution: "1080p" | "1440p" | "2160p";
  quality: "LOW" | "MEDIUM" | "HIGH" | "ULTRA";
  games: {
    gameId: string;
    name: string;
    category: "AAA" | "ESPORTS";
    resolution: string;
    quality: string;
    estimatedFps: number;
    classification: string;
    explanation: string;
    targetMet: boolean;
  }[];
  aaa: { gamesMeetingTarget: number; totalGames: number; status: string };
  esports: { gamesMeetingTarget: number; totalGames: number; status: string };
}

export interface GamingPerformanceRequest {
  offerId: string;
  resolution: GamingPerformanceEstimate["resolution"];
  quality: GamingPerformanceEstimate["quality"];
  upgrades: { groupId: string; optionId: string; quantity: number }[];
}

export interface AdminUpgradeConfiguration extends PublicUpgradeConfiguration {
  groups: AdminUpgradeGroup[];
  bundles: AdminUpgradeBundle[];
  selectableOffers: {
    offerId: string;
    productId: string;
    modelCode: string;
    productName: string;
    productType: string;
    condition: string;
    price: number;
    currency: string;
    availableQuantity: number;
  }[];
}

export interface AdminUpgradeGroup extends Omit<UpgradeGroup, "options"> {
  enabled: boolean;
  options: AdminUpgradeChoice[];
}

export interface AdminUpgradeChoice extends UpgradeChoice {
  condition: string;
  enabled: boolean;
}

export interface AdminUpgradeBundle extends Omit<UpgradeBundle, "items"> {
  enabled: boolean;
  items: AdminUpgradeBundleItem[];
}

export interface AdminUpgradeBundleItem extends UpgradeBundleItem {
  condition: string;
  enabled: boolean;
}

export interface UpgradeConfigurationSelection {
  upgrades: { groupId: string; optionId: string; quantity: number }[];
  bundles: { bundleId: string; offerIds: string[] }[];
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function fetchPayloadAt<T>(
  path: string,
  signal?: AbortSignal,
  credentials?: RequestCredentials,
  requireDataEnvelope = true,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
    credentials,
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
  if (requireDataEnvelope && !("data" in record)) {
    throw new Error("Catalog API returned an invalid response.");
  }
  return payload as T;
}

async function fetchPayload<T>(
  path: string,
  signal?: AbortSignal,
  credentials?: RequestCredentials,
): Promise<T> {
  return fetchPayloadAt<T>(`/catalog${path}`, signal, credentials);
}

export function fetchStorefrontHomepage(signal?: AbortSignal): Promise<StorefrontHomepage> {
  return fetchPayloadAt<StorefrontHomepage>("/storefront/homepage", signal, undefined, false);
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
): Promise<{ data: CatalogProduct }> {
  const response = await fetchPayload<{ data: CatalogProduct }>(
    `/products/${encodeURIComponent(modelCode)}`,
    signal,
  );
  if (typeof response.data !== "object" || response.data === null) {
    throw new Error("Catalog API returned an invalid product.");
  }
  return response;
}

export async function fetchProductUpgrades(
  modelCode: string,
  offerId: string,
  signal?: AbortSignal,
): Promise<PublicUpgradeConfiguration> {
  const response = await fetchPayload<{ data: PublicUpgradeConfiguration }>(
    `/products/${encodeURIComponent(modelCode)}/upgrades?offerId=${encodeURIComponent(offerId)}`,
    signal,
  );
  return response.data;
}

export async function estimateGamingPerformance(
  modelCode: string,
  request: GamingPerformanceRequest,
  signal?: AbortSignal,
): Promise<GamingPerformanceEstimate> {
  const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  let csrfPayload: unknown;
  try {
    csrfPayload = await csrfResponse.json();
  } catch {
    throw new Error("Không thể xác thực yêu cầu ước tính hiệu năng.");
  }
  if (!csrfResponse.ok || typeof csrfPayload !== "object" || csrfPayload === null
      || !("token" in csrfPayload) || typeof csrfPayload.token !== "string") {
    throw new Error("Không thể xác thực yêu cầu ước tính hiệu năng.");
  }
  const response = await fetch(`${apiBaseUrl}/catalog/products/${encodeURIComponent(modelCode)}/gaming-performance`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfPayload.token,
    },
    body: JSON.stringify(request),
    signal,
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Catalog API returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const body = payload as { message?: unknown; detail?: unknown; error?: { message?: unknown } };
    const message = typeof body.error?.message === "string" ? body.error.message
      : typeof body.detail === "string" ? body.detail
        : typeof body.message === "string" ? body.message : "Không thể ước tính hiệu năng cấu hình.";
    throw new Error(message);
  }
  return payload as GamingPerformanceEstimate;
}

export async function fetchAdminCatalogProduct(
  modelCode: string,
  signal?: AbortSignal,
): Promise<{ data: CatalogProduct }> {
  const response = await fetchPayload<{ data: CatalogProduct }>(
    `/admin/products/${encodeURIComponent(modelCode)}`,
    signal,
    "include",
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
): Promise<{ data: PublicCatalogAttributeDefinition[] }> {
  return fetchPayload<{ data: PublicCatalogAttributeDefinition[] }>("/attribute-definitions", signal);
}

export async function validatePcBuilderCompatibility(
  components: Record<string, string>,
  signal?: AbortSignal,
): Promise<PcBuilderCompatibilityResult> {
  const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  const csrfPayload: unknown = await csrfResponse.json();
  if (!csrfResponse.ok || typeof csrfPayload !== "object" || csrfPayload === null
      || !("token" in csrfPayload) || typeof csrfPayload.token !== "string") {
    throw new Error("Không thể xác thực yêu cầu kiểm tra tương thích.");
  }
  const response = await fetch(`${apiBaseUrl}/catalog/pc-builder/compatibility`, {
    method: "POST",
    credentials: "include",
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfPayload.token,
    },
    body: JSON.stringify({ components }),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Dịch vụ tương thích trả về phản hồi không hợp lệ (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null
      && "error" in payload && typeof payload.error === "object" && payload.error !== null
      && "message" in payload.error && typeof payload.error.message === "string"
      ? payload.error.message
      : `Không thể kiểm tra tương thích (HTTP ${response.status}).`;
    throw new Error(message);
  }
  if (typeof payload !== "object" || payload === null || !("checks" in payload)
      || !Array.isArray(payload.checks) || !("status" in payload)) {
    throw new Error("Dịch vụ tương thích trả về dữ liệu không đúng định dạng.");
  }
  return payload as PcBuilderCompatibilityResult;
}

export function fetchAdminCatalogAttributeDefinitions(
  signal?: AbortSignal,
): Promise<{ data: AdminCatalogAttributeDefinition[] }> {
  return fetchPayload<{ data: AdminCatalogAttributeDefinition[] }>(
    "/admin/attribute-definitions",
    signal,
    "include",
  );
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

async function adminWrite<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
  contentType = "application/json",
): Promise<T> {
  const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!csrfResponse.ok) throw new Error(`Could not obtain a CSRF token (HTTP ${csrfResponse.status}).`);
  const csrfPayload: unknown = await csrfResponse.json();
  if (typeof csrfPayload !== "object" || csrfPayload === null
      || !("token" in csrfPayload) || typeof csrfPayload.token !== "string") {
    throw new Error("Authentication service returned an invalid CSRF token.");
  }
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-XSRF-TOKEN": csrfPayload.token,
  };
  if (contentType) headers["Content-Type"] = contentType;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body === undefined ? undefined
      : contentType === "application/json" ? JSON.stringify(body) : body as BodyInit,
  });
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const record = typeof payload === "object" && payload !== null
      ? payload as Record<string, unknown> : {};
    const error = record.error;
    throw new Error(typeof error === "object" && error !== null
        && "message" in error && typeof error.message === "string"
      ? error.message : `Catalog request failed (HTTP ${response.status}).`);
  }
  return payload as T;
}

async function adminRead<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${url}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const record = typeof payload === "object" && payload !== null
      ? payload as Record<string, unknown> : {};
    const error = record.error;
    throw new Error(typeof error === "object" && error !== null
        && "message" in error && typeof error.message === "string"
      ? error.message : `Catalog request failed (HTTP ${response.status}).`);
  }
  return payload as T;
}

export function fetchAdminProducts(
  filters: { q?: string; status?: string; type?: string; page?: number; limit?: number },
  signal?: AbortSignal,
): Promise<AdminProductPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return adminRead(`/catalog/admin/management/products?${params}`, signal);
}

export function fetchAdminManagedProduct(
  modelCode: string,
  signal?: AbortSignal,
): Promise<AdminProduct> {
  return adminRead(
    `/catalog/admin/management/products/${encodeURIComponent(modelCode)}`,
    signal,
  );
}

export function fetchAdminUpgradeConfiguration(
  modelCode: string,
  signal?: AbortSignal,
): Promise<AdminUpgradeConfiguration> {
  return adminRead(`/catalog/admin/management/products/${encodeURIComponent(modelCode)}/upgrade-config`, signal);
}

export function saveAdminUpgradeConfiguration(
  modelCode: string,
  configuration: unknown,
): Promise<AdminUpgradeConfiguration> {
  return adminWrite(
    `/catalog/admin/management/products/${encodeURIComponent(modelCode)}/upgrade-config`,
    "PUT",
    configuration,
  );
}

export function saveAdminProduct(
  modelCode: string | undefined,
  product: AdminProductWrite,
): Promise<AdminProduct> {
  const path = modelCode
    ? `/catalog/admin/management/products/${encodeURIComponent(modelCode)}`
    : "/catalog/admin/management/products";
  return adminWrite<AdminProduct>(path, modelCode ? "PUT" : "POST", product);
}

export function saveAdminOffer(
  modelCode: string,
  offer: Omit<AdminOffer, "offerId" | "reservedQuantity" | "availableQuantity"> & { offerId?: string },
): Promise<AdminOffer> {
  const path = offer.offerId
    ? `/catalog/admin/management/products/${encodeURIComponent(modelCode)}/offers/${encodeURIComponent(offer.offerId)}`
    : `/catalog/admin/management/products/${encodeURIComponent(modelCode)}/offers`;
  return adminWrite<AdminOffer>(path, offer.offerId ? "PUT" : "POST", offer);
}

export function updateAdminProductStatus(modelCode: string, status: string): Promise<AdminProduct> {
  return adminWrite(
    `/catalog/admin/management/products/${encodeURIComponent(modelCode)}/status`,
    "PUT",
    { status },
  );
}

export function saveAdminProductBom(
  modelCode: string,
  components: Omit<AdminBomComponent, "modelCode" | "productName" | "productType">[],
): Promise<AdminBomComponent[]> {
  return adminWrite(
    `/catalog/admin/management/products/${encodeURIComponent(modelCode)}/bom`,
    "PUT",
    components,
  );
}

export function saveAdminProductImages(
  modelCode: string,
  images: Pick<AdminImage, "imageId" | "url" | "altText" | "caption" | "mediaType" | "primary" | "displayOrder">[],
): Promise<AdminImage[]> {
  return adminWrite(
    `/catalog/admin/management/products/${encodeURIComponent(modelCode)}/images`,
    "PUT",
    images,
  );
}

export function uploadAdminProductMedia(
  modelCode: string,
  file: File,
  details: { altText?: string; caption?: string; primary?: boolean; displayOrder?: number },
): Promise<AdminImage> {
  const form = new FormData();
  form.append("file", file);
  if (details.altText) form.append("altText", details.altText);
  if (details.caption) form.append("caption", details.caption);
  if (details.primary) form.append("primary", "true");
  if (details.displayOrder !== undefined) form.append("displayOrder", String(details.displayOrder));
  return adminWrite(
    `/catalog/admin/management/products/${encodeURIComponent(modelCode)}/media`,
    "POST",
    form,
    "",
  );
}

export function deleteAdminProductImage(modelCode: string, imageId: string): Promise<void> {
  return adminWrite(
    `/catalog/admin/management/products/${encodeURIComponent(modelCode)}/images/${encodeURIComponent(imageId)}`,
    "DELETE",
  );
}
