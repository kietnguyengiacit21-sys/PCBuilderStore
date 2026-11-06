import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CatalogProduct } from "../catalog-api";
import { fetchCatalogProduct } from "../catalog-api";
import { money } from "../demo/demo-store";

const codesStorageKey = "pc-builder-store.compare-models";
const itemsStorageKey = "pc-builder-store.compare-items";
const maximumSelection = 4;

export interface ComparisonItem {
  modelCode: string;
  productId: string;
  productName: string;
  productType: string;
  categoryCode: string;
  imageUrl?: string;
  imageAlt?: string;
  offerPrice?: string | number;
  currency?: string;
}

interface ComparisonContextValue {
  items: ComparisonItem[];
  codes: string[];
  toggle: (product: CatalogProduct, offerCode?: string) => void;
  remove: (modelCode: string) => void;
  clear: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  notice: string;
  dismissNotice: () => void;
}

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

function isComparisonItem(value: unknown): value is ComparisonItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.modelCode === "string"
    && typeof item.productId === "string"
    && typeof item.productName === "string"
    && typeof item.productType === "string"
    && typeof item.categoryCode === "string"
    && (item.imageUrl === undefined || typeof item.imageUrl === "string")
    && (item.imageAlt === undefined || typeof item.imageAlt === "string")
    && (item.offerPrice === undefined || typeof item.offerPrice === "string" || typeof item.offerPrice === "number")
    && (item.currency === undefined || typeof item.currency === "string");
}

function readSavedComparison(): { items: ComparisonItem[]; notice: string } {
  let items: ComparisonItem[] = [];
  let notice = "";
  try {
    const storedItems = localStorage.getItem(itemsStorageKey);
    if (storedItems) {
      const parsed: unknown = JSON.parse(storedItems);
      if (!Array.isArray(parsed) || !parsed.every(isComparisonItem)) {
        notice = "Danh sách so sánh đã lưu không đúng định dạng và đã được làm mới.";
      } else {
        items = [...new Map(parsed.map((item) => [item.modelCode, item])).values()].slice(0, maximumSelection);
      }
    }

    const storedCodes = localStorage.getItem(codesStorageKey);
    if (storedCodes) {
      const parsedCodes: unknown = JSON.parse(storedCodes);
      if (Array.isArray(parsedCodes) && parsedCodes.every((code) => typeof code === "string")) {
        for (const modelCode of parsedCodes) {
          if (!modelCode || items.some((item) => item.modelCode === modelCode) || items.length >= maximumSelection) continue;
          items.push({
            modelCode,
            productId: "",
            productName: "Đang tải thông tin sản phẩm…",
            productType: "",
            categoryCode: "",
          });
        }
      } else if (!notice) {
        notice = "Danh sách so sánh đã lưu không đúng định dạng và đã được làm mới.";
      }
    }
  } catch (reason) {
    console.error("Could not read the saved comparison selection.", reason);
    notice = "Không thể đọc danh sách so sánh đã lưu.";
    items = [];
  }
  return { items, notice };
}

function comparisonItem(product: CatalogProduct, offerCode?: string): ComparisonItem {
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  const offer = product.offers.find((item) => item.offerCode === offerCode) ?? product.offers[0];
  return {
    modelCode: product.modelCode,
    productId: product.productId,
    productName: product.productName,
    productType: product.productType,
    categoryCode: product.categoryCode,
    ...(image ? { imageUrl: image.url, imageAlt: image.altText ?? product.productName } : {}),
    ...(offer ? { offerPrice: offer.price, currency: offer.currency } : {}),
  };
}

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readSavedComparison);
  const [items, setItems] = useState(initial.items);
  const [collapsed, setCollapsed] = useState(false);
  const [notice, setNotice] = useState(initial.notice);

  const dismissNotice = useCallback(() => setNotice(""), []);
  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => current === message ? "" : current), 3800);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(codesStorageKey, JSON.stringify(items.map((item) => item.modelCode)));
      localStorage.setItem(itemsStorageKey, JSON.stringify(items));
    } catch (reason) {
      console.error("Could not save the comparison selection.", reason);
      showNotice("Không thể lưu danh sách so sánh trên thiết bị này.");
    }
  }, [items, showNotice]);

  useEffect(() => {
    const pending = items.filter((item) => item.productType === "");
    if (!pending.length) return;
    let active = true;
    void Promise.all(pending.map(async (item) => {
      const response = await fetchCatalogProduct(item.modelCode);
      return comparisonItem(response.data);
    })).then((resolved) => {
      if (!active) return;
      setItems((current) => current.map((item) => resolved.find((next) => next.modelCode === item.modelCode) ?? item));
    }).catch((reason: unknown) => {
      if (active) {
        console.error("Could not restore a saved comparison product.", reason);
        showNotice("Một sản phẩm trong danh sách so sánh không còn khả dụng.");
      }
    });
    return () => {
      active = false;
    };
  }, [items, showNotice]);

  const toggle = useCallback((product: CatalogProduct, offerCode?: string) => {
    const item = comparisonItem(product, offerCode);
    if (items.some((selected) => selected.modelCode === item.modelCode)) {
      setItems(items.filter((selected) => selected.modelCode !== item.modelCode));
      return;
    }
    if (items.some((selected) => !selected.productType)) {
      showNotice("Đang tải loại sản phẩm đã chọn. Vui lòng thử lại sau giây lát.");
      return;
    }
    if (items.some((selected) => selected.productType !== item.productType)) {
      showNotice("Chỉ có thể so sánh các sản phẩm cùng loại. Hãy xóa lựa chọn khác loại trước.");
      return;
    }
    if (items.length >= maximumSelection) {
      showNotice("Bạn chỉ có thể chọn tối đa 4 sản phẩm để so sánh.");
      return;
    }
    setCollapsed(false);
    setItems([...items, item]);
  }, [items, showNotice]);

  const remove = useCallback((modelCode: string) => {
    setItems((current) => current.filter((item) => item.modelCode !== modelCode));
  }, []);
  const clear = useCallback(() => setItems([]), []);
  const codes = useMemo(() => items.map((item) => item.modelCode), [items]);
  const value = useMemo(() => ({
    items,
    codes,
    toggle,
    remove,
    clear,
    collapsed,
    setCollapsed,
    notice,
    dismissNotice,
  }), [items, codes, toggle, remove, clear, collapsed, notice, dismissNotice]);

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) throw new Error("useComparison must be used within ComparisonProvider.");
  return context;
}

function ComparisonIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M5 4v16m14-16v16M9 8h6m-6 4h6m-6 4h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>;
}

export function ProductCompareButton({
  product,
  selected,
}: {
  product: CatalogProduct;
  selected: boolean;
}) {
  const { toggle } = useComparison();
  return (
    <button
      className={`v2-product-compare-control${selected ? " is-selected" : ""}`}
      type="button"
      aria-pressed={selected}
      aria-label={`${selected ? "Bỏ khỏi so sánh" : "Thêm vào so sánh"}: ${product.productName}`}
      title="So sánh"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(product);
      }}
    >
      <ComparisonIcon />
      <span>{selected ? "Đã chọn" : "So sánh"}</span>
    </button>
  );
}

export function ComparisonTray() {
  const navigate = useNavigate();
  const { items, remove, clear, collapsed, setCollapsed, notice, dismissNotice } = useComparison();
  const canCompare = items.length >= 2 && items.every((item) =>
    item.productType !== "" && item.productType === items[0].productType);

  return <>
    {notice && <div className={`v2-comparison-notice${items.length ? " has-tray" : ""}`} role="status">
      <span>{notice}</span>
      <button type="button" aria-label="Đóng thông báo" onClick={dismissNotice}>×</button>
    </div>}
    {items.length > 0 && (
      <aside className={`v2-comparison-tray${collapsed ? " is-collapsed" : ""}`} aria-label="Sản phẩm đang chọn để so sánh">
        {collapsed ? (
          <div className="v2-comparison-collapsed">
            <span><strong>{items.length}</strong> / {maximumSelection} sản phẩm đã chọn</span>
            <button type="button" className="v2-button v2-button-secondary" onClick={() => setCollapsed(false)}>Mở danh sách</button>
          </div>
        ) : (
          <div className="v2-comparison-tray-inner">
            <div className="v2-comparison-tray-heading">
              <div><strong>So sánh sản phẩm</strong><span>{items.length} / {maximumSelection} đã chọn</span></div>
              <button type="button" className="v2-comparison-collapse" aria-label="Thu gọn danh sách so sánh" onClick={() => setCollapsed(true)}>Thu gọn <span aria-hidden="true">⌄</span></button>
            </div>
            <div className="v2-comparison-selection-list">
              {items.map((item) => (
                <article className="v2-comparison-selection-item" key={item.modelCode}>
                  <Link to={`/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`} className="v2-comparison-selection-image" aria-label={`Xem ${item.productName}`}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.imageAlt ?? item.productName} />
                      : <span aria-hidden="true">{item.productType || "PC"}</span>}
                  </Link>
                  <div className="v2-comparison-selection-copy">
                    <Link to={`/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`}>{item.productName}</Link>
                    <span className="v2-mono">{item.modelCode}</span>
                    {item.offerPrice !== undefined && item.currency && <strong>{money(item.offerPrice, item.currency)}</strong>}
                  </div>
                  <button type="button" className="v2-comparison-remove" aria-label={`Bỏ ${item.productName} khỏi so sánh`} onClick={() => remove(item.modelCode)}>×</button>
                </article>
              ))}
            </div>
            <div className="v2-comparison-tray-actions">
              <button type="button" className="v2-comparison-clear" onClick={clear}>Xóa tất cả</button>
              <button type="button" className="v2-button v2-button-primary" disabled={!canCompare} onClick={() => navigate("/customer/compare")}>So sánh ngay <span aria-hidden="true">→</span></button>
            </div>
          </div>
        )}
      </aside>
    )}
  </>;
}
