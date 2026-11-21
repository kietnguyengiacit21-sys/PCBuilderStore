/**
 * "Sản phẩm bạn đã xem": a small per-browser history kept in localStorage.
 * Nothing is sent to the server; prices are the values seen at viewing time and the
 * product page always shows the live price.
 */
const STORAGE_KEY = "pcbs.recentlyViewed.v1";
const LIMIT = 12;

export interface RecentlyViewedItem {
  modelCode: string;
  productName: string;
  productType: string;
  imageUrl?: string;
  imageAlt?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  viewedAt: number;
}

function isItem(value: unknown): value is RecentlyViewedItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.modelCode === "string"
    && typeof item.productName === "string"
    && typeof item.productType === "string"
    && typeof item.viewedAt === "number";
}

export function readRecentlyViewed(): RecentlyViewedItem[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(item: RecentlyViewedItem): void {
  try {
    const next = [item, ...readRecentlyViewed().filter((entry) => entry.modelCode !== item.modelCode)]
      .slice(0, LIMIT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, quota); the history is optional.
  }
}
