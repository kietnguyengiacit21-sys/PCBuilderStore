import { useEffect, useMemo, useState } from "react";
import {
  fetchCatalogFacets,
  fetchCatalogProduct,
  fetchCatalogProducts,
} from "./catalog-api";
import type {
  CatalogFacets,
  CatalogProduct,
  CatalogProductFilters,
  CatalogProductPage,
} from "./catalog-api";
import {
  comparisonValuesDiffer,
  formatSpecificationValue,
  getProductHighlights,
  getSpecificationLabel,
  groupComparisonSpecifications,
  groupSpecifications,
} from "./product-specifications";

const demoNotice =
  "Giá và tồn kho có nhãn DEMO chỉ là dữ liệu minh họa, không phải thông tin bán hàng hoặc tồn kho thực tế.";
const compareStorageKey = "pc-builder-store.compare-models";

function readCompareCodes(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(compareStorageKey) ?? "[]");
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return [...new Set(value)].slice(0, 4);
    }
  } catch {
    return [];
  }
  return [];
}

function writeCompareCodes(codes: string[]): void {
  localStorage.setItem(compareStorageKey, JSON.stringify([...new Set(codes)].slice(0, 4)));
}

function money(value: string | number | undefined, currency = "VND"): string {
  if (value === undefined || !Number.isFinite(Number(value))) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded border border-error/40 bg-error-container/20 p-space-md text-on-surface" role="alert">
      <p className="font-headline-sm">Không thể tải dữ liệu sản phẩm</p>
      <p className="mt-1 text-body-sm text-on-surface-variant">{message}</p>
    </div>
  );
}

function ProductCard({
  product,
  compared,
  onCompare,
}: {
  product: CatalogProduct;
  compared: boolean;
  onCompare: (product: CatalogProduct) => void;
}) {
  const offer = product.offers[0];
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  const highlights = getProductHighlights(product.productType, product.specifications);
  return (
    <article className="flex flex-col overflow-hidden rounded border border-surface-container-high bg-surface-container-low">
      <a
        className="flex h-48 items-center justify-center bg-surface-container text-on-surface-variant"
        href={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}
        aria-label={`Xem ${product.productName}`}
      >
        {image ? (
          <img className="h-full w-full object-contain p-space-md" src={image.url} alt={image.altText ?? product.productName} />
        ) : (
          <span className="material-symbols-outlined text-5xl" aria-hidden="true">memory</span>
        )}
      </a>
      <div className="flex flex-1 flex-col p-space-md">
        <p className="font-tech-code-sm text-tech-code-sm text-primary">
          {[product.brandName, product.productTypeName].filter(Boolean).join(" · ")}
        </p>
        <a
          className="mt-2 font-headline-sm text-on-surface hover:text-primary"
          href={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}
        >
          {product.productName}
        </a>
        <p className="mt-1 font-tech-code-sm text-tech-code-sm text-on-surface-variant">{product.modelCode}</p>
        {product.shortDescription && (
          <p className="mt-3 line-clamp-2 text-body-sm text-on-surface-variant">{product.shortDescription}</p>
        )}
        {highlights.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            {highlights.map((entry) => (
              <div key={entry.code} className="min-w-0">
                <dt className="text-xs text-on-surface-variant">{entry.label}</dt>
                <dd className="truncate text-sm text-on-surface" title={entry.value}>{entry.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-auto pt-space-md">
          {offer ? (
            <>
              <p className="font-headline-md text-primary">{money(offer.price, offer.currency)}</p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {offer.isDemo ? "Tồn kho minh họa" : "Số lượng khả dụng"}: {offer.availableQuantity}
                {offer.isDemo && <span className="ml-1 font-tech-code-sm text-secondary">DEMO</span>}
              </p>
              {offer.warrantyMonths !== null && (
                <p className="text-body-sm text-on-surface-variant">Bảo hành: {offer.warrantyMonths} tháng</p>
              )}
            </>
          ) : (
            <p className="text-body-sm text-on-surface-variant">Chưa có ưu đãi đang hoạt động</p>
          )}
          <button
            className="mt-space-md w-full rounded border border-outline-variant px-space-md py-2 text-body-sm hover:bg-surface-container-high"
            type="button"
            onClick={() => onCompare(product)}
          >
            {compared ? "Đã thêm so sánh" : "Thêm vào so sánh"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductGrid({
  products,
  compareCodes,
  onCompare,
}: {
  products: CatalogProduct[];
  compareCodes: string[];
  onCompare: (product: CatalogProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded border border-surface-container-high bg-surface-container-low p-space-xl text-center">
        <h2 className="font-headline-sm">Không tìm thấy sản phẩm phù hợp</h2>
        <p className="mt-2 text-body-sm text-on-surface-variant">Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-gutter-desktop sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.productId}
          product={product}
          compared={compareCodes.includes(product.modelCode)}
          onCompare={onCompare}
        />
      ))}
    </div>
  );
}

function useCatalogFacets() {
  const [facets, setFacets] = useState<CatalogFacets>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogFacets(controller.signal).then(
      (response) => setFacets(response.data),
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Vui lòng thử lại sau.");
        }
      },
    );
    return () => controller.abort();
  }, []);
  return { facets, error };
}

function useCatalogProducts(filters: CatalogProductFilters) {
  const [result, setResult] = useState<CatalogProductPage>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const serializedFilters = JSON.stringify(filters);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void fetchCatalogProducts(JSON.parse(serializedFilters) as CatalogProductFilters, controller.signal).then(
      (page) => setResult(page),
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Vui lòng thử lại sau.");
        }
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [serializedFilters]);
  return { result, error, loading };
}

function useCompareList() {
  const [codes, setCodes] = useState(readCompareCodes);
  const update = (next: string[]) => {
    const unique = [...new Set(next)].slice(0, 4);
    writeCompareCodes(unique);
    setCodes(unique);
  };
  const toggle = (product: CatalogProduct) => {
    if (codes.includes(product.modelCode)) {
      update(codes.filter((code) => code !== product.modelCode));
    } else if (codes.length < 4) {
      update([...codes, product.modelCode]);
    } else {
      window.alert("Bạn chỉ có thể so sánh tối đa 4 sản phẩm.");
    }
  };
  return { codes, toggle, update };
}

function CatalogSearchForm({
  initialQuery,
  onSearch,
}: {
  initialQuery: string;
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  useEffect(() => setQuery(initialQuery), [initialQuery]);
  return (
    <form
      className="flex flex-col gap-space-sm sm:flex-row"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <input
        className="min-w-0 flex-1 rounded bg-surface-container-low px-space-md py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm tên sản phẩm hoặc mã model"
        aria-label="Tìm tên sản phẩm hoặc mã model"
      />
      <button className="rounded bg-primary-container px-space-xl py-3 font-semibold text-on-primary-container hover:bg-inverse-primary" type="submit">
        Tìm kiếm
      </button>
    </form>
  );
}

function HomeCatalog({ onCompare, compareCodes }: { onCompare: (product: CatalogProduct) => void; compareCodes: string[] }) {
  const { result, error, loading } = useCatalogProducts({ page: 1, limit: 6, sort: "name", order: "asc" });
  const { facets } = useCatalogFacets();
  const [search, setSearch] = useState("");
  return (
    <div className="mx-auto w-full max-w-7xl px-margin pb-space-3xl lg:px-margin-desktop">
      <section className="grid gap-space-xl py-space-2xl lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-8">
          <p className="font-tech-code-sm uppercase tracking-widest text-primary">PC Builder Store · Linh kiện máy tính</p>
          <h1 className="mt-space-md max-w-3xl font-headline-xl text-4xl font-bold leading-tight text-on-surface md:text-5xl">
            Nâng cấp dàn PC <span className="text-primary">của bạn</span>
          </h1>
          <p className="mt-space-md max-w-2xl text-body-lg text-on-surface-variant">
            Khám phá linh kiện và PC lắp sẵn theo thông tin sản phẩm trong danh mục.
          </p>
          <div className="mt-space-xl max-w-2xl">
            <CatalogSearchForm
              initialQuery={search}
              onSearch={(query) => {
                setSearch(query);
                window.history.pushState(null, "", `/customer/parts${query ? `?q=${encodeURIComponent(query)}` : ""}`);
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-space-sm lg:col-span-4">
          {(facets?.categories ?? []).slice(0, 6).map((category) => (
            <a
              key={category.value}
              className="rounded border border-surface-container-high bg-surface-container-low p-space-md text-body-sm hover:border-primary"
              href={`/customer/parts?category=${encodeURIComponent(category.value)}`}
            >
              <span className="material-symbols-outlined mr-2 align-middle text-primary" aria-hidden="true">memory</span>
              {category.label}
            </a>
          ))}
        </div>
      </section>
      <section className="space-y-space-lg" aria-labelledby="featured-products">
        <div className="flex flex-wrap items-end justify-between gap-space-md">
          <div>
            <p className="font-tech-code-sm uppercase tracking-widest text-primary">Danh mục sản phẩm</p>
            <h2 id="featured-products" className="mt-1 font-headline-lg text-on-surface">Linh kiện nổi bật</h2>
          </div>
          <a className="text-body-sm text-primary hover:underline" href="/customer/parts">Xem tất cả linh kiện</a>
        </div>
        <p className="rounded border border-secondary/30 bg-secondary/5 p-space-md text-body-sm text-on-surface-variant">{demoNotice}</p>
        {loading && <p className="p-space-md text-on-surface-variant" role="status">Đang tải sản phẩm…</p>}
        {error && <ErrorState message={error} />}
        {result && <ProductGrid products={result.data} compareCodes={compareCodes} onCompare={onCompare} />}
      </section>
    </div>
  );
}

interface ListingState {
  query: string;
  type: string;
  category: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  sort: "name" | "price";
  order: "asc" | "desc";
  page: number;
  attributes: Record<string, string>;
}

function listingFromSearch(search: string): ListingState {
  const params = new URLSearchParams(search);
  const attributes: Record<string, string> = {};
  for (const value of params.getAll("attribute")) {
    const separator = value.indexOf("=");
    if (separator > 0) attributes[value.slice(0, separator)] = value.slice(separator + 1);
  }
  return {
    query: params.get("q") ?? "",
    type: params.get("type") ?? "",
    category: params.get("category") ?? "",
    brand: params.get("brand") ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    sort: params.get("sort") === "price" ? "price" : "name",
    order: params.get("order") === "desc" ? "desc" : "asc",
    page: Number(params.get("page") || 1),
    attributes,
  };
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
      {label}
      <select
        className="rounded border border-surface-container-high bg-surface-container-low px-3 py-2 text-on-surface"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Tất cả</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function PartsCatalog({
  onCompare,
  compareCodes,
  search,
}: {
  onCompare: (product: CatalogProduct) => void;
  compareCodes: string[];
  search: string;
}) {
  const { facets, error: facetsError } = useCatalogFacets();
  const [state, setState] = useState(() => listingFromSearch(window.location.search));
  useEffect(() => setState(listingFromSearch(search)), [search]);
  const filters = useMemo<CatalogProductFilters>(() => ({
    page: state.page,
    limit: 12,
    q: state.query || undefined,
    type: state.type || undefined,
    category: state.category || undefined,
    brand: state.brand || undefined,
    minPrice: state.minPrice || undefined,
    maxPrice: state.maxPrice || undefined,
    sort: state.sort,
    order: state.order,
    attributes: Object.entries(state.attributes)
      .filter(([, value]) => value)
      .map(([code, value]) => ({ code, value })),
  }), [state]);
  const { result, error, loading } = useCatalogProducts(filters);
  const selectedCategory = facets?.categories.find((item) => item.value === state.category);
  const selectedType = facets?.productTypes.find((item) => item.value === state.type);
  const title = selectedCategory?.label ?? selectedType?.label ?? (state.query ? "Kết quả tìm kiếm" : "Danh mục linh kiện");
  const setField = <K extends keyof ListingState>(key: K, value: ListingState[K]) =>
    setState((current) => ({ ...current, [key]: value, page: 1 }));

  return (
    <div className="mx-auto w-full max-w-7xl px-margin pb-space-3xl lg:px-margin-desktop">
      <section className="py-space-xl">
        <p className="font-tech-code-sm uppercase tracking-widest text-primary">Danh mục linh kiện</p>
        <h1 className="mt-2 font-headline-xl text-on-surface">
          {title}
        </h1>
        <p className="mt-2 text-body-sm text-on-surface-variant">Tìm theo tên sản phẩm hoặc model, rồi lọc theo danh mục, thương hiệu và thông số.</p>
      </section>
      <p className="mb-space-lg rounded border border-secondary/30 bg-secondary/5 p-space-md text-body-sm text-on-surface-variant">{demoNotice}</p>
      <div className="grid gap-gutter-desktop lg:grid-cols-12">
        <aside className="space-y-space-md rounded border border-surface-container-high bg-surface-container-low p-space-md lg:col-span-3" aria-label="Bộ lọc sản phẩm">
          <h2 className="font-headline-sm">Bộ lọc</h2>
          <label className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
            Từ khóa
            <input className="rounded border border-surface-container-high bg-surface-container-lowest px-3 py-2 text-on-surface" value={state.query} onChange={(event) => setField("query", event.target.value)} />
          </label>
          <FilterSelect label="Loại sản phẩm" value={state.type} options={facets?.productTypes ?? []} onChange={(value) => setField("type", value)} />
          <FilterSelect label="Danh mục" value={state.category} options={facets?.categories ?? []} onChange={(value) => setField("category", value)} />
          <FilterSelect label="Thương hiệu" value={state.brand} options={facets?.brands ?? []} onChange={(value) => setField("brand", value)} />
          <div className="grid grid-cols-2 gap-space-sm">
            <label className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
              Giá từ
              <input className="min-w-0 rounded border border-surface-container-high bg-surface-container-lowest px-2 py-2 text-on-surface" inputMode="decimal" value={state.minPrice} onChange={(event) => setField("minPrice", event.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
              Đến
              <input className="min-w-0 rounded border border-surface-container-high bg-surface-container-lowest px-2 py-2 text-on-surface" inputMode="decimal" value={state.maxPrice} onChange={(event) => setField("maxPrice", event.target.value)} />
            </label>
          </div>
          {(facets?.attributes ?? [])
            .filter((attribute) => state.type === attribute.productType && attribute.values.length > 0)
            .slice(0, 8)
            .map((attribute) => (
              <FilterSelect
                key={attribute.code}
                label={attribute.label}
                value={state.attributes[attribute.code] ?? ""}
                options={attribute.values.map(({ label, value }) => ({ label, value }))}
                onChange={(value) => setState((current) => ({
                  ...current,
                  page: 1,
                  attributes: { ...current.attributes, [attribute.code]: value },
                }))}
              />
            ))}
          {facetsError && <p className="text-body-sm text-error" role="alert">{facetsError}</p>}
        </aside>
        <section className="space-y-space-md lg:col-span-9" aria-label="Kết quả sản phẩm">
          <div className="flex flex-wrap items-end justify-between gap-space-md">
            <p className="text-body-sm text-on-surface-variant">
              {result ? `${result.pagination.total} sản phẩm` : "Đang tải kết quả"}
            </p>
            <label className="flex items-center gap-space-sm text-body-sm text-on-surface-variant">
              Sắp xếp
              <select
                className="rounded border border-surface-container-high bg-surface-container-low px-3 py-2 text-on-surface"
                value={`${state.sort}-${state.order}`}
                onChange={(event) => {
                  const [sort, order] = event.target.value.split("-");
                  setState((current) => ({ ...current, sort: sort as ListingState["sort"], order: order as ListingState["order"], page: 1 }));
                }}
              >
                <option value="name-asc">Tên: A–Z</option>
                <option value="name-desc">Tên: Z–A</option>
                <option value="price-asc">Giá: thấp đến cao</option>
                <option value="price-desc">Giá: cao đến thấp</option>
              </select>
            </label>
          </div>
          {loading && <p className="p-space-md text-on-surface-variant" role="status">Đang tải sản phẩm…</p>}
          {error && <ErrorState message={error} />}
          {result && (
            <>
              <ProductGrid products={result.data} compareCodes={compareCodes} onCompare={onCompare} />
              {result.pagination.totalPages > 1 && (
                <nav className="flex items-center justify-center gap-space-md py-space-md" aria-label="Phân trang">
                  <button
                    className="rounded border border-surface-container-high px-space-md py-2 disabled:opacity-40"
                    disabled={state.page <= 1 || loading}
                    onClick={() => setField("page", state.page - 1)}
                  >Trước</button>
                  <span className="text-body-sm text-on-surface-variant">
                    Trang {result.pagination.page} / {result.pagination.totalPages}
                  </span>
                  <button
                    className="rounded border border-surface-container-high px-space-md py-2 disabled:opacity-40"
                    disabled={state.page >= result.pagination.totalPages || loading}
                    onClick={() => setField("page", state.page + 1)}
                  >Sau</button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ProductDetail({ modelCode, onCompare, compareCodes }: {
  modelCode: string;
  onCompare: (product: CatalogProduct) => void;
  compareCodes: string[];
}) {
  const [product, setProduct] = useState<CatalogProduct>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void fetchCatalogProduct(modelCode, controller.signal).then(
      (response) => setProduct(response.data),
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Vui lòng thử lại sau.");
        }
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [modelCode]);
  if (loading) return <p className="p-space-xl text-center" role="status">Đang tải sản phẩm…</p>;
  if (error) return <div className="mx-auto max-w-7xl px-margin py-space-xl"><ErrorState message={error} /></div>;
  if (!product) return null;
  const offer = product.offers[0];
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  const specificationGroups = groupSpecifications(product.productType, product.specifications);
  return (
    <div className="mx-auto w-full max-w-7xl px-margin pb-space-3xl lg:px-margin-desktop">
      <nav className="py-space-md text-body-sm text-on-surface-variant" aria-label="Đường dẫn">
        <a className="hover:text-primary" href="/customer/home">Trang chủ</a>
        <span className="px-2">/</span>
        <a className="hover:text-primary" href="/customer/parts">Linh kiện</a>
        <span className="px-2">/</span>{product.productName}
      </nav>
      <p className="mb-space-md rounded border border-secondary/30 bg-secondary/5 p-space-md text-body-sm text-on-surface-variant">{demoNotice}</p>
      <div className="grid gap-space-xl lg:grid-cols-2">
        <div className="flex min-h-80 items-center justify-center rounded border border-surface-container-high bg-surface-container-low p-space-xl">
          {image ? (
            <img className="max-h-[28rem] max-w-full object-contain" src={image.url} alt={image.altText ?? product.productName} />
          ) : (
            <span className="material-symbols-outlined text-7xl text-on-surface-variant" aria-hidden="true">memory</span>
          )}
        </div>
        <section className="space-y-space-md">
          <p className="font-tech-code-sm uppercase tracking-widest text-primary">{product.brandName} · {product.productTypeName}</p>
          <h1 className="font-headline-xl text-on-surface">{product.productName}</h1>
          <p className="font-tech-code-sm text-on-surface-variant">Mã model: {product.modelCode}</p>
          {product.shortDescription && <p className="text-body-md text-on-surface-variant">{product.shortDescription}</p>}
          {product.description && <p className="text-body-sm text-on-surface-variant">{product.description}</p>}
          {offer ? (
            <div className="rounded border border-surface-container-high bg-surface-container-low p-space-md">
              <p className="font-headline-lg text-primary">{money(offer.price, offer.currency)}</p>
              {offer.isDemo && <p className="mt-1 font-tech-code-sm text-secondary">Giá và tồn kho minh họa (DEMO)</p>}
              <p className="mt-2 text-body-sm text-on-surface-variant">Tình trạng: {offer.condition}</p>
              <p className="text-body-sm text-on-surface-variant">
                {offer.isDemo ? "Tồn kho minh họa" : "Số lượng khả dụng"}: {offer.availableQuantity}
              </p>
              {offer.warrantyMonths !== null && <p className="text-body-sm text-on-surface-variant">Bảo hành: {offer.warrantyMonths} tháng</p>}
            </div>
          ) : (
            <p className="text-body-sm text-on-surface-variant">Chưa có ưu đãi đang hoạt động.</p>
          )}
          <button
            className="rounded bg-primary-container px-space-xl py-3 font-semibold text-on-primary-container hover:bg-inverse-primary"
            type="button"
            onClick={() => onCompare(product)}
          >
            {compareCodes.includes(product.modelCode) ? "Đã thêm so sánh" : "Thêm vào so sánh"}
          </button>
        </section>
      </div>
      <section className="mt-space-2xl" aria-labelledby="specifications-title">
        <h2 id="specifications-title" className="font-headline-lg text-on-surface">Thông số kỹ thuật</h2>
        {specificationGroups.length === 0 ? (
          <p className="mt-space-md text-body-sm text-on-surface-variant">Chưa có thông số kỹ thuật.</p>
        ) : (
          <div className="mt-space-md space-y-space-lg">
            {specificationGroups.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 font-headline-sm text-primary">{group.title}</h3>
                <dl className="grid gap-px overflow-hidden rounded border border-surface-container-high bg-surface-container-high sm:grid-cols-2">
                  {group.entries.map((entry) => (
                    <div key={entry.code} className="flex justify-between gap-space-md bg-surface-container-low p-space-md">
                      <dt className="text-body-sm text-on-surface-variant">{entry.label}</dt>
                      <dd className="text-right text-body-sm text-on-surface">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProductComparison({ codes, onRemove }: { codes: string[]; onRemove: (codes: string[]) => void }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (codes.length === 0) {
      setProducts([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void Promise.all(codes.map((code) => fetchCatalogProduct(code, controller.signal)))
      .then((items) => setProducts(items.map((item) => item.data)))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Vui lòng thử lại sau.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [codes.join("|")]);
  const specificationGroups = groupComparisonSpecifications(products);
  return (
    <div className="mx-auto w-full max-w-7xl px-margin py-space-xl lg:px-margin-desktop">
      <h1 className="font-headline-xl text-on-surface">So sánh sản phẩm</h1>
      <p className="my-space-md rounded border border-secondary/30 bg-secondary/5 p-space-md text-body-sm text-on-surface-variant">{demoNotice}</p>
      {codes.length === 0 && <p className="rounded bg-surface-container-low p-space-xl text-on-surface-variant">Chưa có sản phẩm để so sánh. Hãy thêm sản phẩm từ danh sách.</p>}
      {loading && <p role="status">Đang tải sản phẩm so sánh…</p>}
      {error && <ErrorState message={error} />}
      {products.length > 0 && (
        <div className="mt-space-lg overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-body-sm">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="p-space-md">Thông tin</th>
                {products.map((product) => (
                  <th key={product.modelCode} className="min-w-48 p-space-md align-top">
                    <a className="text-on-surface hover:text-primary" href={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}>{product.productName}</a>
                    <p className="mt-1 font-tech-code-sm text-on-surface-variant">{product.modelCode}</p>
                    <button className="mt-2 text-primary hover:underline" onClick={() => onRemove(codes.filter((code) => code !== product.modelCode))}>Xóa</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Thương hiệu", (product: CatalogProduct) => product.brandName ?? "—"],
                ["Loại sản phẩm", (product: CatalogProduct) => product.productTypeName],
                ["Danh mục", (product: CatalogProduct) => product.categoryName],
                ["Giá tham khảo", (product: CatalogProduct) => money(product.offers[0]?.price, product.offers[0]?.currency)],
                ["Tồn kho", (product: CatalogProduct) => product.offers[0] ? `${product.offers[0].isDemo ? "Minh họa: " : ""}${product.offers[0].availableQuantity}` : "—"],
              ].map(([label, getter]) => (
                <tr key={String(label)} className="border-b border-surface-container-high">
                  <th className="bg-surface-container-low p-space-md text-on-surface-variant">{String(label)}</th>
                  {products.map((product) => <td key={product.modelCode} className="p-space-md">{(getter as (item: CatalogProduct) => string)(product)}</td>)}
                </tr>
              ))}
              {specificationGroups.flatMap((group) => [
                <tr key={`group-${group.title}`} className="bg-surface-container-high">
                  <th colSpan={products.length + 1} className="p-space-md font-semibold text-on-surface">{group.title}</th>
                </tr>,
                ...group.codes.map((key) => {
                  const labelProduct = products.find((product) => key in product.specifications) ?? products[0];
                  return (
                    <tr key={key} className={`border-b border-surface-container-high ${comparisonValuesDiffer(products, key) ? "bg-primary/5" : ""}`}>
                      <th className="bg-surface-container-low p-space-md text-on-surface-variant">{getSpecificationLabel(labelProduct.productType, key)}</th>
                      {products.map((product) => (
                        <td key={product.modelCode} className="p-space-md">
                          {formatSpecificationValue(product.productType, key, product.specifications[key])}
                        </td>
                      ))}
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CatalogPage({ path }: { path: string }) {
  const [search, setSearch] = useState(window.location.search);
  const comparison = useCompareList();
  useEffect(() => {
    const onPopState = () => setSearch(window.location.search);
    window.addEventListener("popstate", onPopState);
    const form = document.querySelector<HTMLFormElement>('header form[role="search"]');
    const input = form?.querySelector<HTMLInputElement>('input[type="search"]');
    const onSearchSubmit = (event: Event) => {
      event.preventDefault();
      const query = input?.value.trim() ?? "";
      window.history.pushState(null, "", `/customer/parts${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };
    form?.addEventListener("submit", onSearchSubmit);
    return () => {
      window.removeEventListener("popstate", onPopState);
      form?.removeEventListener("submit", onSearchSubmit);
    };
  }, []);

  const query = new URLSearchParams(search);
  const modelCode = query.get("modelCode") ?? "";
  if (path === "/customer/home") {
    return <HomeCatalog onCompare={comparison.toggle} compareCodes={comparison.codes} />;
  }
  if (path === "/customer/parts") {
    return <PartsCatalog onCompare={comparison.toggle} compareCodes={comparison.codes} search={search} />;
  }
  if (path === "/customer/product") {
    return modelCode
      ? <ProductDetail key={modelCode} modelCode={modelCode} onCompare={comparison.toggle} compareCodes={comparison.codes} />
      : <div className="mx-auto max-w-7xl px-margin py-space-xl"><ErrorState message="Thiếu mã model sản phẩm trong đường dẫn." /></div>;
  }
  if (path === "/customer/compare") {
    return <ProductComparison codes={comparison.codes} onRemove={comparison.update} />;
  }
  return null;
}
