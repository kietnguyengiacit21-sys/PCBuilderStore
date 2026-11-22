import { apiGet, apiSend } from "./api-client";
import type { OrderSummary } from "./orders-api";

// --- Categories and brands -------------------------------------------------

export interface AdminCategory {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  description: string | null;
  parentCategoryCode: string | null;
  active: boolean;
  productCount: number;
  activeProductCount: number;
}

export interface CategoryInput {
  categoryCode?: string;
  categoryName: string;
  description: string;
  parentCategoryCode: string;
  active: boolean;
}

export interface AdminBrand {
  brandId: string;
  brandName: string;
  websiteUrl: string | null;
  description: string | null;
  active: boolean;
  productCount: number;
  activeProductCount: number;
}

export interface BrandInput {
  brandName: string;
  websiteUrl: string;
  description: string;
  active: boolean;
}

const taxonomy = "/catalog/admin/management";

export const fetchAdminCategories = (signal?: AbortSignal) => apiGet<AdminCategory[]>(`${taxonomy}/categories`, signal);
export const createCategory = (input: CategoryInput) => apiSend<AdminCategory>(`${taxonomy}/categories`, "POST", input);
export const updateCategory = (code: string, input: CategoryInput) =>
  apiSend<AdminCategory>(`${taxonomy}/categories/${encodeURIComponent(code)}`, "PUT", input);
export const deleteCategory = (code: string) => apiSend<void>(`${taxonomy}/categories/${encodeURIComponent(code)}`, "DELETE");

export const fetchAdminBrands = (signal?: AbortSignal) => apiGet<AdminBrand[]>(`${taxonomy}/brands`, signal);
export const createBrand = (input: BrandInput) => apiSend<AdminBrand>(`${taxonomy}/brands`, "POST", input);
export const updateBrand = (brandId: string, input: BrandInput) =>
  apiSend<AdminBrand>(`${taxonomy}/brands/${encodeURIComponent(brandId)}`, "PUT", input);
export const deleteBrand = (brandId: string) => apiSend<void>(`${taxonomy}/brands/${encodeURIComponent(brandId)}`, "DELETE");

// --- Customer lookup ---------------------------------------------------------

export interface CustomerSummary {
  type: "ACCOUNT" | "GUEST";
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  customerSegment: string | null;
  accountStatus: string | null;
  registeredAt: string | null;
  orderCount: number;
  openOrderCount: number;
  orderValue: number;
  currencyCode: string | null;
  lastOrderAt: string | null;
}

export interface CustomerDetail {
  customer: CustomerSummary;
  orders: OrderSummary[];
}

export const searchCustomers = (query: string, signal?: AbortSignal) =>
  apiGet<CustomerSummary[]>(`/admin/customers${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`, signal);

export const fetchCustomerDetail = (customer: CustomerSummary, signal?: AbortSignal) =>
  customer.type === "ACCOUNT" && customer.userId
    ? apiGet<CustomerDetail>(`/admin/customers/accounts/${encodeURIComponent(customer.userId)}`, signal)
    : apiGet<CustomerDetail>(`/admin/customers/guests?email=${encodeURIComponent(customer.email)}`, signal);

// --- Catalog CSV import ------------------------------------------------------

export interface ImportPreviewRow {
  csvRow: number;
  modelCode: string;
  productName: string;
  productType: string;
  brandName: string | null;
  price: number;
  currencyCode: string;
  specificationCount: number;
  imageCount: number;
  action: "INSERT" | "UPDATE";
}

export interface ImportResult {
  applied: boolean;
  fileName: string;
  rowCount: number;
  insertCount: number;
  updateCount: number;
  rows: ImportPreviewRow[];
  summary: { attributeValues: number; bomComponents: number; upgradeGroups: number; upgradeOptions: number; brands: number };
}

/** apply=false validates and previews only; apply=true writes everything in one transaction. */
export function importCatalogCsv(file: File, apply: boolean): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  return apiSend<ImportResult>(`/admin/imports/catalog?apply=${apply}`, "POST", form);
}
