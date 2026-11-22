import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchCatalogProducts } from "../catalog-api";
import type { CatalogFacets, CatalogProduct } from "../catalog-api";
import { customerVisibleOffers } from "../catalog-offers";
import { money } from "../money";
import { displayProductImages, preferredProductImage } from "./product-images";
import { ProductArtwork, productTypeLabel } from "./storefront-components";

const MIN_QUERY_LENGTH = 1;
const SUGGESTION_LIMIT = 6;
const DEBOUNCE_MS = 250;

type SuggestionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; products: CatalogProduct[]; total: number }
  | { status: "error"; message: string };

function productLink(product: CatalogProduct) {
  return `/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`;
}

function resultsLink(query: string, type: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (type) params.set("type", type);
  const search = params.toString();
  return `/customer/parts${search ? `?${search}` : ""}`;
}

/** Bolds every case-insensitive occurrence of the query inside the product name. */
function highlightMatch(text: string, query: string): ReactNode {
  const needle = query.trim();
  if (!needle) return text;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === needle.toLowerCase() ? <mark key={index}>{part}</mark> : part,
  );
}

function SuggestionPrice({ product }: { product: CatalogProduct }) {
  // Prices come from the server-provided offer; nothing is computed or invented here.
  const offer = customerVisibleOffers(product.offers)[0];
  if (!offer) return <span className="v2-search-suggestion-price is-missing">Chưa có giá bán</span>;
  return <span className="v2-search-suggestion-price">{money(offer.price, offer.currency)}</span>;
}

export function HeaderSearch({ facets }: { facets?: CatalogFacets }) {
  const navigate = useNavigate();
  const location = useLocation();
  const listboxId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [state, setState] = useState<SuggestionState>({ status: "idle" });

  // On the product list the box mirrors the current filter, so it never shows a stale category.
  useEffect(() => {
    if (location.pathname !== "/customer/parts") return;
    const params = new URLSearchParams(location.search);
    setType(params.get("type") ?? "");
    setQuery(params.get("q") ?? "");
    setOpen(false);
  }, [location.pathname, location.search]);

  const trimmed = query.trim();
  const canSuggest = trimmed.length >= MIN_QUERY_LENGTH;
  const products = state.status === "ready" ? state.products : [];

  useEffect(() => {
    if (!canSuggest) {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    const timer = window.setTimeout(() => {
      void fetchCatalogProducts(
        { q: trimmed, type: type || undefined, limit: SUGGESTION_LIMIT, page: 1, sort: "relevance" },
        controller.signal,
      ).then(
        (page) => {
          setState({ status: "ready", products: page.data, total: page.pagination.total });
          setActiveIndex(-1);
        },
        (reason: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            status: "error",
            message: reason instanceof Error ? reason.message : "Không thể tải gợi ý tìm kiếm.",
          });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [canSuggest, trimmed, type]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const goTo = (path: string) => {
    setOpen(false);
    setActiveIndex(-1);
    navigate(path);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!products.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % products.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? products.length - 1 : index - 1));
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      goTo(productLink(products[activeIndex]));
    }
  };

  const showPanel = open && canSuggest;
  const activeId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <form
      ref={rootRef}
      className="v2-header-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        goTo(resultsLink(trimmed, type));
      }}
    >
      <div className="v2-header-search-bar">
        <label className="v2-header-search-type">
          <span className="v2-visually-hidden">Danh mục tìm kiếm</span>
          <select value={type} onChange={(event) => {
            // Picking a category opens its product list right away (keeping any typed search).
            const next = event.target.value;
            setType(next);
            goTo(resultsLink(trimmed, next));
          }}>
            <option value="">Tất cả danh mục</option>
            {facets?.productTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {productTypeLabel(option.value)}
              </option>
            ))}
          </select>
        </label>
        <input
          className="v2-header-search-input"
          type="search"
          role="combobox"
          aria-label="Tìm kiếm sản phẩm"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          autoComplete="off"
          placeholder="Bạn cần tìm gì? VD: RTX 4060, Ryzen 7..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button className="v2-header-search-submit" type="submit" aria-label="Tìm kiếm">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </div>

      {showPanel && (
        <div className="v2-search-suggestions">
          {state.status === "loading" && (
            <p className="v2-search-suggestions-state" role="status">Đang tìm sản phẩm…</p>
          )}
          {state.status === "error" && (
            <p className="v2-search-suggestions-state is-error" role="alert">{state.message}</p>
          )}
          {state.status === "ready" && products.length === 0 && (
            <p className="v2-search-suggestions-state" role="status">
              Không tìm thấy sản phẩm phù hợp với “{trimmed}”.
            </p>
          )}
          {products.length > 0 && (
            <>
              <ul id={listboxId} role="listbox" aria-label="Gợi ý sản phẩm">
                {products.map((product, index) => {
                  const image = preferredProductImage(
                    displayProductImages(
                      product.images.filter((item) => item.mediaType !== "VIDEO"),
                      product.productType,
                    ),
                  );
                  return (
                    <li
                      key={product.modelCode}
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={index === activeIndex ? "is-active" : undefined}
                      onPointerEnter={() => setActiveIndex(index)}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => goTo(productLink(product))}
                    >
                      <span className="v2-search-suggestion-thumb">
                        <ProductArtwork
                          image={image}
                          productName={product.productName}
                          productType={product.productType}
                        />
                      </span>
                      <span className="v2-search-suggestion-body">
                        <span className="v2-search-suggestion-name">
                          {highlightMatch(product.productName, trimmed)}
                        </span>
                        <span className="v2-search-suggestion-meta">
                          {product.brandName ?? "Chưa có thương hiệu"} · {productTypeLabel(product.productType)}
                        </span>
                        <SuggestionPrice product={product} />
                      </span>
                    </li>
                  );
                })}
              </ul>
              <button
                className="v2-search-suggestions-all"
                type="submit"
                onPointerDown={(event) => event.preventDefault()}
              >
                Xem tất cả {state.status === "ready" ? state.total : ""} kết quả cho “{trimmed}”
                <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
