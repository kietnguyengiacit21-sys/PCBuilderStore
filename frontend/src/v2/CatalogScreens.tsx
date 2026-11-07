import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchCatalogFacets,
  fetchCatalogProduct,
  fetchCatalogProducts,
} from "../catalog-api";
import type {
  CatalogFacets,
  CatalogProduct,
  CatalogProductFilters,
  CatalogProductPage,
} from "../catalog-api";
import { money } from "../demo/demo-store";
import { useCatalogAttributeDefinitions } from "./catalog-metadata";
import {
  OfferList,
  ProductOfferPanel,
  SpecificationHighlights,
  SpecificationComparison,
  PCConfigurationComparison,
  TechnicalSpecifications,
  WarrantyDisplay,
  attributeLabel,
  formatSpecificationValue,
} from "./product-information";
import {
  Badge,
  Card,
  Drawer,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MinusIcon,
  PlusIcon,
  PrimaryButton,
  SecondaryButton,
} from "./components";
import { ProductCompareButton, useComparison } from "./comparison-store";
import {
  HeroCarousel,
  ProductArtwork,
  ProductCarousel,
  ProductImageGallery,
  categoryLabel,
  productTypeLabel,
  productTypeSymbol,
} from "./storefront-components";

const homeProductSections = [
  { types: ["GPU"], title: "Card đồ họa" },
  { types: ["CPU"], title: "CPU" },
  { types: ["RAM"], title: "RAM" },
  { types: ["STORAGE"], title: "SSD / Storage" },
  { types: ["MOTHERBOARD", "MAINBOARD"], title: "Mainboard" },
  { types: ["PSU"], title: "Nguồn máy tính" },
  { types: ["CASE"], title: "Case" },
  { types: ["COOLER"], title: "Tản nhiệt" },
  { types: ["ACCESSORY"], title: "Phụ kiện" },
] as const;

const pcDiscoveryCategories = [
  { key: "gaming", title: "PC Gaming", description: "Máy tính chơi game", terms: ["gaming"] },
  { key: "ai", title: "PC AI", description: "Máy tính được phân loại cho tác vụ AI", terms: ["pc ai", "ai pc"] },
  { key: "workstation", title: "PC Workstation", description: "Máy tính workstation và đồ họa", terms: ["workstation", "do hoa"] },
  { key: "creator", title: "PC Creator / Streaming", description: "Máy tính cho sáng tạo nội dung", terms: ["creator", "streaming"] },
  { key: "office", title: "PC Văn phòng", description: "Máy tính làm việc văn phòng", terms: ["van phong", "office"] },
  { key: "mini", title: "PC Mini", description: "Máy tính bộ dạng nhỏ gọn", terms: ["pc mini", "mini pc"] },
  { key: "amd-gaming", title: "PC AMD Gaming", description: "Máy tính AMD Gaming", terms: ["amd gaming", "pc amd"], showTile: false },
] as const;

const conditionLabels: Record<string, string> = {
  NEW: "Hàng mới",
  REFURBISHED: "Đã tân trang",
  LIKE_NEW: "Hàng như mới",
  USED: "Đã qua sử dụng",
};

function conditionLabel(condition: string) {
  return conditionLabels[condition] ?? condition;
}

function useFacets() {
  const [facets, setFacets] = useState<CatalogFacets>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogFacets(controller.signal).then(
      (response) => setFacets(response.data),
      (reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải bộ lọc.");
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);
  return { facets, error, loading };
}

function useProducts(filters: CatalogProductFilters) {
  const [result, setResult] = useState<CatalogProductPage>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const serialized = JSON.stringify(filters);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void fetchCatalogProducts(JSON.parse(serialized) as CatalogProductFilters, controller.signal).then(
      setResult,
      (reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải sản phẩm.");
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [serialized]);
  return { result, error, loading };
}

function ProductTile({
  product,
  definitions,
}: {
  product: CatalogProduct;
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"];
}) {
  const { items } = useComparison();
  const compared = items.some((item) => item.modelCode === product.modelCode);
  const offer = product.offers[0];
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  return (
    <Card className={`v2-product-card${compared ? " is-comparison-selected" : ""}`}>
      <div className="v2-product-image-wrap">
        <Link
          className="v2-product-image"
          to={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}
          aria-label={`Xem ${product.productName}`}
        >
          <ProductArtwork image={image} productName={product.productName} productType={product.productType} />
        </Link>
        <ProductCompareButton product={product} selected={compared} />
      </div>
      <div className="v2-product-info">
        <p className="v2-eyebrow">{product.brandName ?? "Chưa có thương hiệu"} · {productTypeLabel(product.productType)}</p>
        <Link className="v2-product-name" to={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}>
          {product.productName}
        </Link>
        <p className="v2-mono">{product.modelCode}</p>
        <SpecificationHighlights productType={product.productType} specifications={product.specifications} definitions={definitions} />
        {offer ? (
          <div className="v2-product-offer">
            <strong>{money(offer.price, offer.currency)}</strong>
            <span>Tình trạng: {conditionLabel(offer.condition)}</span>
            <span>{offer.isDemo ? "Tồn kho minh họa" : "Số lượng khả dụng"}: {offer.availableQuantity}</span>
            <WarrantyDisplay months={offer.warrantyMonths} showMissing />
            {product.offers.length > 1 && <span>{product.offers.length} ưu đãi đang hoạt động · xem chi tiết</span>}
            {offer.isDemo && <Badge tone="gold">Giá minh họa</Badge>}
          </div>
        ) : <p className="v2-muted">Chưa có ưu đãi đang hoạt động.</p>}
      </div>
    </Card>
  );
}

function ProductGrid({
  products,
  definitions,
}: {
  products: CatalogProduct[];
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"];
}) {
  if (!products.length) return <EmptyState title="Chưa có sản phẩm phù hợp" message="Thử thay đổi từ khóa hoặc bộ lọc." />;
  return <>
    <p className="v2-spec-dictionary-note">Trạng thái xác minh theo từng thông số được hiển thị trong chi tiết sản phẩm.</p>
    <div className="v2-product-grid">{products.map((product) => (
      <ProductTile key={product.productId} product={product} definitions={definitions} />
    ))}</div>
  </>;
}

interface ActiveQuickView {
  product: CatalogProduct;
  anchor: HTMLElement;
  touch: boolean;
}

function categorySearchText(value: string) {
  return value.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ");
}

function findPcCategory(
  categories: CatalogFacets["categories"],
  terms: readonly string[],
) {
  return categories.find((category) => {
    const text = categorySearchText(`${category.value} ${category.label}`);
    return terms.some((term) => text.includes(categorySearchText(term)));
  });
}

function verifiedQuickViewSpecifications(
  product: CatalogProduct,
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"],
) {
  return definitions.flatMap((definition) => {
    if (definition.productType !== product.productType) return [];
    const verification = product.verificationMetadata?.[definition.code];
    if (verification?.verificationStatus !== "VERIFIED_EXACT_MODEL"
        && verification?.verificationStatus !== "VERIFIED_EXACT_VARIANT") return [];
    const value = product.specifications[definition.code];
    if (value === null || value === undefined || value === "") return [];
    return [{
      label: attributeLabel(definitions, product.productType, definition.code),
      value: formatSpecificationValue(value, definition),
    }];
  }).slice(0, 5);
}

function HomepageProductTile({
  product,
  onQuickView,
  onQuickViewClose,
}: {
  product: CatalogProduct;
  onQuickView: (product: CatalogProduct, anchor: HTMLElement, touch: boolean) => void;
  onQuickViewClose: () => void;
}) {
  const { items } = useComparison();
  const compared = items.some((item) => item.modelCode === product.modelCode);
  const offer = product.offers[0];
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  const openPreview = (anchor: HTMLElement, touch = false) => {
    onQuickView(product, anchor, touch);
  };
  const productLink = `/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`;

  return (
    <div
      className="v2-home-product-shell"
      onMouseEnter={(event) => openPreview(event.currentTarget)}
      onMouseLeave={onQuickViewClose}
      onFocusCapture={(event) => openPreview(event.currentTarget)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onQuickViewClose();
      }}
    >
      <Card className={`v2-product-card v2-home-product-card${compared ? " is-comparison-selected" : ""}`}>
        <div className="v2-product-image-wrap">
          <Link className="v2-product-image" to={productLink} aria-label={`Xem ${product.productName}`}>
            <ProductArtwork image={image} productName={product.productName} productType={product.productType} />
          </Link>
          <ProductCompareButton product={product} selected={compared} />
        </div>
        <div className="v2-product-info">
          <p className="v2-eyebrow">{product.brandName ?? "Chưa có thương hiệu"} · {productTypeLabel(product.productType)}</p>
          <Link className="v2-product-name" to={productLink}>{product.productName}</Link>
          <p className="v2-mono">{product.modelCode}</p>
          {offer ? (
            <div className="v2-product-offer">
              <strong>{money(offer.price, offer.currency)}</strong>
              <Badge tone={offer.condition === "NEW" ? "success" : "warning"}>{conditionLabel(offer.condition)}</Badge>
              {offer.warrantyMonths !== null && <WarrantyDisplay months={offer.warrantyMonths} />}
            </div>
          ) : <p className="v2-muted">Chưa có ưu đãi đang bán.</p>}
          <button
            type="button"
            className="v2-home-quick-view-trigger"
            onClick={(event) => {
              const touch = window.matchMedia("(max-width: 720px), (hover: none)").matches;
              openPreview(event.currentTarget.closest(".v2-home-product-shell") ?? event.currentTarget, touch);
            }}
          >
            Xem nhanh
          </button>
        </div>
      </Card>
    </div>
  );
}

function ProductQuickView({
  active,
  definitions,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: {
  active: ActiveQuickView;
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"];
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const offer = active.product.offers[0];
  const verifiedSpecs = verifiedQuickViewSpecifications(active.product, definitions);
  const productLink = `/customer/product?modelCode=${encodeURIComponent(active.product.modelCode)}`;

  useEffect(() => {
    const updatePosition = () => {
      if (active.touch) return;
      const bounds = active.anchor.getBoundingClientRect();
      const panelBounds = panelRef.current?.getBoundingClientRect();
      const width = Math.min(300, window.innerWidth - 24);
      const height = Math.min(panelBounds?.height ?? 360, window.innerHeight - 24);
      const gap = 12;
      const roomBelow = window.innerHeight - bounds.bottom - gap;
      const roomAbove = bounds.top - gap;
      let left = Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12));
      let top: number;
      if (roomBelow >= height) {
        top = bounds.bottom + gap;
      } else if (roomAbove >= height) {
        top = bounds.top - height - gap;
      } else {
        const roomRight = window.innerWidth - bounds.right - gap;
        const roomLeft = bounds.left - gap;
        if (roomRight >= width) left = bounds.right + gap;
        else if (roomLeft >= width) left = bounds.left - width - gap;
        top = Math.max(12, Math.min(bounds.top, window.innerHeight - height - 12));
      }
      setPosition({ left, top });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [active]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        if (active.touch) active.anchor.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    if (active.touch) panelRef.current?.querySelector<HTMLButtonElement>(".v2-home-quick-view-close")?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, onClose]);

  return createPortal(
    <>
      {active.touch && <button className="v2-home-quick-view-backdrop" type="button" aria-label="Đóng xem nhanh" onClick={onClose} />}
      <section
        ref={panelRef}
        className={`v2-home-quick-view${active.touch ? " is-touch" : ""}`}
        style={active.touch ? undefined : { left: position.left, top: position.top }}
        role={active.touch ? "dialog" : "region"}
        aria-modal={active.touch || undefined}
        aria-label={`Xem nhanh ${active.product.productName}`}
        onMouseEnter={onPointerEnter}
        onMouseLeave={onPointerLeave}
        onFocusCapture={onPointerEnter}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onPointerLeave();
        }}
      >
        <div className="v2-home-quick-view-heading">
          <span className="v2-eyebrow">Thông tin sản phẩm</span>
          <button className="v2-home-quick-view-close" type="button" aria-label="Đóng xem nhanh" onClick={() => {
            onClose();
            if (active.touch) active.anchor.focus();
          }}>×</button>
        </div>
        <p className="v2-home-quick-view-brand">{active.product.brandName ?? productTypeLabel(active.product.productType)} · {active.product.modelCode}</p>
        <h2>{active.product.productName}</h2>
        {offer ? (
          <div className="v2-home-quick-view-price">
            <strong>{money(offer.price, offer.currency)}</strong>
            <span>{conditionLabel(offer.condition)}</span>
          </div>
        ) : <p className="v2-muted">Chưa có ưu đãi đang bán.</p>}
        {offer?.warrantyMonths !== null && offer?.warrantyMonths !== undefined && <WarrantyDisplay months={offer.warrantyMonths} />}
        {active.product.shortDescription?.trim() && <p className="v2-home-quick-view-summary">{active.product.shortDescription}</p>}
        {verifiedSpecs.length > 0 && (
          <dl className="v2-home-quick-view-specs">
            {verifiedSpecs.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>
        )}
        {active.product.productType === "PC" && verifiedSpecs.length === 0 && (
          <p className="v2-home-quick-view-note">Chưa có cấu hình thành phần được xác minh để hiển thị.</p>
        )}
        <Link className="v2-button v2-button-primary v2-home-quick-view-link" to={productLink} onClick={onClose}>Xem chi tiết sản phẩm <span aria-hidden="true">→</span></Link>
      </section>
    </>,
    document.querySelector(".v2-home-page") ?? document.body,
  );
}

export function HomePage() {
  const { facets, error: facetsError, loading: facetsLoading } = useFacets();
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sectionProducts, setSectionProducts] = useState<Record<string, CatalogProductPage>>({});
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [quickView, setQuickView] = useState<ActiveQuickView | undefined>(undefined);
  const quickViewCloseTimer = useRef<number | undefined>(undefined);
  const categoryMatches = useMemo((): (typeof pcDiscoveryCategories[number] & {
    category: CatalogFacets["categories"][number] | undefined;
  })[] => pcDiscoveryCategories.map((category) => ({
    ...category,
    category: facets ? findPcCategory(facets.categories, category.terms) : undefined,
  })), [facets]);

  useEffect(() => {
    if (!facets) return;
    let active = true;
    const availableTypes = new Set(facets.productTypes.map((type) => type.value));
    setSectionsLoading(true);
    setSectionProducts({});
    setSectionErrors({});
    const requests: { key: string; filters: CatalogProductFilters; title: string }[] = [];
    if (availableTypes.has("PC")) {
      requests.push({ key: "type:PC", filters: { page: 1, limit: 8, type: "PC", sort: "name", order: "asc" }, title: "PC nổi bật" });
    }
    for (const section of homeProductSections) {
      const type = section.types.find((candidate) => availableTypes.has(candidate));
      if (type) requests.push({
        key: `type:${type}`,
        filters: { page: 1, limit: 8, type, sort: "name", order: "asc" },
        title: section.title,
      });
    }
    for (const entry of categoryMatches) {
      if (entry.category) requests.push({
        key: `pc:${entry.key}`,
        filters: { page: 1, limit: 8, type: "PC", category: entry.category.value, sort: "name", order: "asc" },
        title: entry.title,
      });
    }
    void Promise.all(requests.map(async ({ key, filters, title }) => {
      try {
        const result = await fetchCatalogProducts(filters);
        if (active) setSectionProducts((current) => ({ ...current, [key]: result }));
      } catch (reason) {
        if (active) {
          setSectionErrors((current) => ({
            ...current,
            [key]: reason instanceof Error ? reason.message : `Không thể tải mục ${title}.`,
          }));
        }
      }
    })).finally(() => {
      if (active) setSectionsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [facets, categoryMatches]);

  useEffect(() => () => {
    if (quickViewCloseTimer.current) window.clearTimeout(quickViewCloseTimer.current);
  }, []);

  const showQuickView = (product: CatalogProduct, anchor: HTMLElement, touch: boolean) => {
    if (quickViewCloseTimer.current) window.clearTimeout(quickViewCloseTimer.current);
    setQuickView({ product, anchor, touch });
  };
  const scheduleQuickViewClose = () => {
    if (quickViewCloseTimer.current) window.clearTimeout(quickViewCloseTimer.current);
    quickViewCloseTimer.current = window.setTimeout(() => setQuickView(undefined), 180);
  };
  const keepQuickViewOpen = () => {
    if (quickViewCloseTimer.current) window.clearTimeout(quickViewCloseTimer.current);
  };

  const heroSlides = [
    {
      eyebrow: "Máy tính bộ",
      title: <>Chọn PC theo<br /><span>nhu cầu của bạn</span></>,
      description: "Khám phá các mẫu máy tính bộ đang có trong catalog.",
      category: "PC",
    },
    {
      eyebrow: "Nâng cấp linh kiện",
      title: <>Tìm card đồ họa<br /><span>phù hợp hệ thống</span></>,
      description: "Xem các sản phẩm và thông tin kỹ thuật hiện có trong danh mục.",
      category: "GPU",
    },
    {
      eyebrow: "Nền tảng xử lý",
      title: <>Khám phá các<br /><span>bộ vi xử lý</span></>,
      description: "Tìm hiểu sản phẩm CPU theo dữ liệu catalog.",
      category: "CPU",
    },
  ] as const;

  return (
    <div className="v2-page v2-home-page">
      <section className="v2-home-search-panel">
        <div>
          <p className="v2-eyebrow">PC Builder Store · Danh mục phần cứng</p>
          <h2>Tìm linh kiện theo nhu cầu</h2>
        </div>
        <div>
          <form className="v2-hero-search" onSubmit={(event) => {
            event.preventDefault();
            navigate(`/customer/parts${query ? `?q=${encodeURIComponent(query)}` : ""}`);
          }}>
            <input aria-label="Tìm sản phẩm" placeholder="Tên sản phẩm hoặc mã model" value={query} onChange={(event) => setQuery(event.target.value)} />
            <PrimaryButton type="submit">Tìm kiếm</PrimaryButton>
          </form>
        </div>
      </section>
      <HeroCarousel
        slides={heroSlides.map((slide) => ({
          ...slide,
          product: sectionProducts[`type:${slide.category}`]?.data[0],
        }))}
        onNavigate={(type) => navigate(`/customer/parts?type=${encodeURIComponent(type)}`)}
      />
      <section className="v2-section-block">
        <div className="v2-section-heading"><div><p className="v2-eyebrow">Khám phá theo nhu cầu</p><h2>Chọn dòng máy tính</h2></div><Link to="/customer/parts?type=PC">Tất cả máy tính bộ →</Link></div>
        <div className="v2-pc-discovery-grid">
          {categoryMatches.filter((category) => !("showTile" in category) || category.showTile).map((category) => {
            const result = sectionProducts[`pc:${category.key}`];
            const categoryLink = category.category
              ? `/customer/parts?type=PC&category=${encodeURIComponent(category.category.value)}`
              : undefined;
            const content = <>
              <span className="v2-pc-category-mark" aria-hidden="true">{category.key === "ai" ? "AI" : category.key === "gaming" ? "G" : "PC"}</span>
              <span className="v2-pc-category-copy"><strong>{category.title}</strong><small>{category.description}</small>
                {result && result.pagination.total > 0 && <small>{result.pagination.total} sản phẩm</small>}
                {category.key === "ai" && (!category.category || (result && result.pagination.total === 0)) && <small className="v2-pc-empty-note">Chưa có PC AI được phân loại trong catalog.</small>}
                {category.key !== "ai" && !category.category && <small className="v2-pc-empty-note">Chưa có danh mục tương ứng trong catalog.</small>}
                {category.category && result && result.pagination.total === 0 && <small className="v2-pc-empty-note">Danh mục chưa có sản phẩm phù hợp.</small>}
              </span>
              <span className="v2-pc-category-arrow" aria-hidden="true">→</span>
            </>;
            return categoryLink
              ? <Link className="v2-pc-category-card" key={category.key} to={categoryLink}>{content}</Link>
              : <article className="v2-pc-category-card is-unavailable" key={category.key}>{content}</article>;
          })}
          {facetsLoading && <LoadingState message="Đang tải danh mục…" />}
        </div>
        {facetsError && <ErrorState title="Không thể tải danh mục" message={facetsError} />}
      </section>
      {facets && <section className="v2-section-block">
        <div className="v2-section-heading"><div><p className="v2-eyebrow">Danh mục linh kiện</p><h2>Tìm linh kiện theo nhóm</h2></div><Link to="/customer/parts">Tất cả linh kiện →</Link></div>
        <div className="v2-component-discovery-grid">
          {homeProductSections.map((section) => {
            const type = section.types.find((candidate) => facets.productTypes.some((item) => item.value === candidate));
            if (!type) return null;
            return <Link className="v2-component-category-card" key={type} to={`/customer/parts?type=${encodeURIComponent(type)}`}>
              <span className="v2-category-art" aria-hidden="true">{productTypeSymbol(type)}</span>
              <strong>{section.title}</strong>
              <small>{sectionProducts[`type:${type}`]?.pagination.total ?? " "}{sectionProducts[`type:${type}`] ? " sản phẩm" : ""}</small>
            </Link>;
          })}
        </div>
      </section>}
      {sectionProducts["type:PC"]?.data.length ? (
        <HomeProductSection title="PC nổi bật" eyebrow="Máy tính bộ trong catalog" to="/customer/parts?type=PC" products={sectionProducts["type:PC"].data} onQuickView={showQuickView} onQuickViewClose={scheduleQuickViewClose} />
      ) : null}
      {categoryMatches.map((category) => {
        const result = sectionProducts[`pc:${category.key}`];
        if (!result?.data.length) return null;
        return <HomeProductSection key={category.key} title={category.key === "gaming" ? "PC Gaming nổi bật" : category.title} eyebrow="Danh mục PC hiện có" to={`/customer/parts?type=PC&category=${encodeURIComponent(category.category!.value)}`} products={result.data} onQuickView={showQuickView} onQuickViewClose={scheduleQuickViewClose} />;
      })}
      {homeProductSections.map((section) => {
        const type = section.types.find((candidate) => facets?.productTypes.some((item) => item.value === candidate));
        const result = type ? sectionProducts[`type:${type}`] : undefined;
        if (!type || !result?.data.length) return null;
        return <HomeProductSection key={type} title={section.title} eyebrow="Linh kiện trong catalog" to={`/customer/parts?type=${encodeURIComponent(type)}`} products={result.data} onQuickView={showQuickView} onQuickViewClose={scheduleQuickViewClose} />;
      })}
      {sectionsLoading && <LoadingState message="Đang tải sản phẩm theo danh mục…" />}
      {Object.entries(sectionErrors).map(([type, message]) => (
        <ErrorState key={type} title={`Không thể tải ${categoryMatches.find((category) => `pc:${category.key}` === type)?.title ?? homeProductSections.find((section) => section.types.some((candidate) => `type:${candidate}` === type))?.title ?? "danh mục"}`} message={message} />
      ))}
      {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
      {quickView && <ProductQuickView active={quickView} definitions={definitions} onClose={() => setQuickView(undefined)} onPointerEnter={keepQuickViewOpen} onPointerLeave={scheduleQuickViewClose} />}
      <section className="v2-build-callout">
        <div><Badge tone="gold">Coming Soon · B01–B08</Badge><h2>Build-PC</h2><p>Trình xây dựng cấu hình chưa được triển khai.</p></div>
        <SecondaryButton type="button" disabled>Coming Soon</SecondaryButton>
      </section>
    </div>
  );
}

function HomeProductSection({
  title,
  eyebrow,
  to,
  products,
  onQuickView,
  onQuickViewClose,
}: {
  title: string;
  eyebrow: string;
  to: string;
  products: CatalogProduct[];
  onQuickView: (product: CatalogProduct, anchor: HTMLElement, touch: boolean) => void;
  onQuickViewClose: () => void;
}) {
  return <section className="v2-section-block">
    <div className="v2-section-heading">
      <div><p className="v2-eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      <Link to={to}>Xem tất cả →</Link>
    </div>
    <ProductCarousel label={title}>
      {products.map((product) => <HomepageProductTile key={product.productId} product={product} onQuickView={onQuickView} onQuickViewClose={onQuickViewClose} />)}
    </ProductCarousel>
  </section>;
}

export function PartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const { codes } = useComparison();
  const { facets, error: facetsError } = useFacets();
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  const [filters, setFilters] = useState({
    q: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "",
    category: searchParams.get("category") ?? "",
    brand: searchParams.get("brand") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    sort: (searchParams.get("sort") === "price" ? "price" : "name") as "name" | "price",
    order: (searchParams.get("order") === "desc" ? "desc" : "asc") as "asc" | "desc",
    page: Number(searchParams.get("page") || 1),
    attributes: {} as Record<string, string>,
  });
  useEffect(() => {
    setFilters((current) => ({ ...current, q: searchParams.get("q") ?? "", type: searchParams.get("type") ?? "", category: searchParams.get("category") ?? "", brand: searchParams.get("brand") ?? "", page: Number(searchParams.get("page") || 1) }));
  }, [searchParams]);
  const apiFilters = useMemo<CatalogProductFilters>(() => ({
    page: filters.page,
    limit: 12,
    q: filters.q || undefined,
    type: filters.type || undefined,
    category: filters.category || undefined,
    brand: filters.brand || undefined,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    sort: filters.sort,
    order: filters.order,
    attributes: Object.entries(filters.attributes).filter(([, value]) => value).map(([code, value]) => ({ code, value })),
  }), [filters]);
  const { result, loading, error } = useProducts(apiFilters);
  const selectedAttributes = facets?.attributes.filter((attribute) => attribute.productType === filters.type && attribute.values.length) ?? [];
  const update = (key: keyof typeof filters, value: string | number) => setFilters((current) => ({
    ...current,
    [key]: value,
    page: key === "page" ? Number(value) : 1,
    attributes: key === "type" ? {} : current.attributes,
  }));
  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== "attributes" && value !== "" && value !== 1) params.set(key, String(value));
    });
    setSearchParams(params);
    setFilterOpen(false);
  };
  const filterControls = <>
    <h2>Bộ lọc</h2>
    <label className="v2-field">Từ khóa<input className="v2-form-input" value={filters.q} onChange={(event) => update("q", event.target.value)} /></label>
    {([
      ["type", "Loại sản phẩm", facets?.productTypes ?? []],
      ["category", "Danh mục", facets?.categories ?? []],
      ["brand", "Thương hiệu", facets?.brands ?? []],
    ] as const).map(([key, label, options]) => (
      <label className="v2-field" key={key}>{label}<select className="v2-form-input" value={filters[key]} onChange={(event) => update(key, event.target.value)}><option value="">Tất cả</option>{options.map((option) => <option key={option.value} value={option.value}>{key === "type" ? productTypeLabel(option.value) : key === "category" ? categoryLabel(option.value, option.label) : option.label}</option>)}</select></label>
    ))}
    <div className="v2-price-fields">
      <label className="v2-field">Giá từ<input className="v2-form-input" inputMode="decimal" value={filters.minPrice} onChange={(event) => update("minPrice", event.target.value)} /></label>
      <label className="v2-field">Đến<input className="v2-form-input" inputMode="decimal" value={filters.maxPrice} onChange={(event) => update("maxPrice", event.target.value)} /></label>
    </div>
    {selectedAttributes.map((attribute) => (
      <label className="v2-field" key={attribute.code}>{attribute.label}<select className="v2-form-input" value={filters.attributes[attribute.code] ?? ""} onChange={(event) => setFilters((current) => ({ ...current, page: 1, attributes: { ...current.attributes, [attribute.code]: event.target.value } }))}><option value="">Tất cả</option>{attribute.values.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    ))}
    <PrimaryButton type="button" onClick={applyFilters}>Áp dụng bộ lọc</PrimaryButton>
    {facetsError && <p className="v2-inline-error" role="alert">{facetsError}</p>}
  </>;
  return (
    <div className="v2-page">
      <div className="v2-page-title"><div><p className="v2-eyebrow">Danh mục sản phẩm</p><h1>Tìm linh kiện</h1></div><Link to="/customer/compare">So sánh ({codes.length}/4)</Link></div>
      {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
      <div className="v2-catalog-layout">
        <aside className="v2-filter-panel v2-filter-desktop">{filterControls}</aside>
        <section>
          <div className="v2-results-toolbar">
            <p>{result ? `${result.pagination.total} sản phẩm` : "Đang tải kết quả"}</p>
            <SecondaryButton className="v2-filter-mobile-trigger" type="button" onClick={() => setFilterOpen(true)}>Bộ lọc</SecondaryButton>
            <label className="v2-inline-field">Sắp xếp<select className="v2-form-input" value={`${filters.sort}-${filters.order}`} onChange={(event) => {
              const [sort, order] = event.target.value.split("-");
              setFilters((current) => ({ ...current, sort: sort as "name" | "price", order: order as "asc" | "desc", page: 1 }));
            }}><option value="name-asc">Tên A–Z</option><option value="name-desc">Tên Z–A</option><option value="price-asc">Giá thấp trước</option><option value="price-desc">Giá cao trước</option></select></label>
          </div>
          {result?.notice && <p className="v2-demo-banner">{result.notice}</p>}
          {loading && <LoadingState message="Đang tải sản phẩm…" />}
          {error && <ErrorState title="Không thể tải catalog" message={error} />}
          {result && <ProductGrid products={result.data} definitions={definitions} />}
          {result && result.pagination.totalPages > 1 && <div className="v2-pager">
            <SecondaryButton type="button" disabled={filters.page <= 1 || loading} onClick={() => update("page", filters.page - 1)}>Trước</SecondaryButton>
            <span>Trang {result.pagination.page} / {result.pagination.totalPages}</span>
            <SecondaryButton type="button" disabled={filters.page >= result.pagination.totalPages || loading} onClick={() => update("page", filters.page + 1)}>Tiếp</SecondaryButton>
          </div>}
        </section>
      </div>
      <div className="v2-filter-mobile"><Drawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Bộ lọc sản phẩm"><div className="v2-filter-panel">{filterControls}</div></Drawer></div>
    </div>
  );
}

export function ProductPage() {
  const [params] = useSearchParams();
  const modelCode = params.get("modelCode")?.trim() ?? "";
  const { codes, toggle } = useComparison();
  const [product, setProduct] = useState<CatalogProduct>();
  const [loading, setLoading] = useState(Boolean(modelCode));
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedOfferCode, setSelectedOfferCode] = useState("");
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  useEffect(() => {
    if (!modelCode) {
      setLoading(false);
      setProduct(undefined);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void fetchCatalogProduct(modelCode, controller.signal).then(
      (response) => {
        setProduct(response.data);
        setNotice(response.notice);
        setSelectedOfferCode(response.data.offers[0]?.offerCode ?? "");
      },
      (reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải sản phẩm.");
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [modelCode]);
  if (!modelCode) return <div className="v2-page"><EmptyState title="Chưa chọn sản phẩm" message="Mở chi tiết từ danh mục sản phẩm." action={<Link to="/customer/parts">Tìm sản phẩm</Link>} /></div>;
  if (loading) return <div className="v2-page"><LoadingState message="Đang tải chi tiết sản phẩm…" /></div>;
  if (error) return <div className="v2-page"><ErrorState title="Không thể tải sản phẩm" message={error} /></div>;
  if (!product) return null;
  const offer = product.offers.find((item) => item.offerCode === selectedOfferCode) ?? product.offers[0];
  const isCompared = codes.includes(product.modelCode);
  return (
    <div className="v2-page">
      <nav className="v2-breadcrumb"><Link to="/customer/home">Trang chủ</Link><span>/</span><Link to="/customer/parts">Linh kiện</Link><span>/</span><span>{product.productName}</span></nav>
      {notice && <p className="v2-demo-banner">{notice}</p>}
      {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
      <div className="v2-product-detail">
        <ProductImageGallery key={product.productId} product={product} />
        <section className="v2-detail-info">
          <p className="v2-eyebrow">{product.brandName ?? "Chưa có thương hiệu"} · {productTypeLabel(product.productType)}</p>
          <h1>{product.productName}</h1>
          <p className="v2-mono">Mã model: {product.modelCode}</p>
          {product.shortDescription && <p>{product.shortDescription}</p>}
          {product.description && <p>{product.description}</p>}
          <ProductOfferPanel
            offers={product.offers}
            selectedOfferCode={offer?.offerCode}
            onSelect={(nextOffer) => setSelectedOfferCode(nextOffer.offerCode)}
          />
          <div className="v2-product-quantity">
            <label htmlFor="product-quantity">Số lượng</label>
            <div className="v2-quantity-control">
              <IconButton
                className="v2-quantity-stepper-button"
                label="Giảm số lượng"
                disabled={Number(quantity) <= 1}
                onClick={() => setQuantity(String(Math.max(1, (Number(quantity) || 1) - 1)))}
              ><MinusIcon /></IconButton>
              <input
                id="product-quantity"
                className="v2-form-input"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                }}
                onBlur={() => {
                  const nextQuantity = Number(quantity);
                  setQuantity(Number.isSafeInteger(nextQuantity) && nextQuantity > 0 ? String(nextQuantity) : "1");
                }}
              />
              <IconButton
                className="v2-quantity-stepper-button"
                label="Tăng số lượng"
                onClick={() => {
                  const currentQuantity = Number(quantity);
                  const nextQuantity = (Number.isSafeInteger(currentQuantity) && currentQuantity > 0 ? currentQuantity : 1) + 1;
                  if (Number.isSafeInteger(nextQuantity)) setQuantity(String(nextQuantity));
                }}
              ><PlusIcon /></IconButton>
            </div>
          </div>
          <div className="v2-action-row">
            <SecondaryButton type="button" disabled={!offer} onClick={() => setActionMessage("Chức năng thêm vào giỏ sẽ có trong giai đoạn thương mại.")}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.4L21 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="20" r="1.5" fill="currentColor" />
                <circle cx="18" cy="20" r="1.5" fill="currentColor" />
              </svg>
              Thêm vào giỏ
            </SecondaryButton>
            <PrimaryButton type="button" disabled={!offer} onClick={() => setActionMessage("Chức năng mua ngay sẽ có trong giai đoạn thương mại.")}>
              Mua ngay
            </PrimaryButton>
            <SecondaryButton type="button" aria-pressed={isCompared} className={isCompared ? "is-selected" : ""} onClick={() => toggle(product, offer?.offerCode)}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M8 4H4v16h4M16 4h4v16h-4M8 8h8M8 12h8M8 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              So sánh
            </SecondaryButton>
          </div>
          {actionMessage && <p className="v2-muted" role="status">{actionMessage}</p>}
        </section>
      </div>
      <Card title="Thông số kỹ thuật">
        <TechnicalSpecifications
          productType={product.productType}
          productTypeName={productTypeLabel(product.productType)}
          specifications={product.specifications}
          definitions={definitions}
          verificationMetadata={product.verificationMetadata}
          showEnglishLabels={false}
        />
      </Card>
    </div>
  );
}

export function ComparePage() {
  const { codes, remove } = useComparison();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [hideIdentical, setHideIdentical] = useState(false);
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  useEffect(() => {
    if (!codes.length) {
      setProducts([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void Promise.all(codes.map((code) => fetchCatalogProduct(code, controller.signal))).then(
      (responses) => setProducts(responses.map((response) => response.data)),
      (reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải sản phẩm so sánh.");
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [codes.join("|")]);
  const compatibleTypes = products.length < 2
    || products.every((product) => product.productType === products[0].productType);
  return (
    <div className="v2-page">
      <div className="v2-page-title"><div><p className="v2-eyebrow">Danh mục sản phẩm</p><h1>So sánh sản phẩm</h1></div><div className="v2-compare-page-actions"><Badge tone="primary">{codes.length}/4 sản phẩm</Badge><Link className="v2-button v2-button-secondary" to="/customer/parts">Thêm sản phẩm</Link></div></div>
      <p className="v2-demo-banner">Giá và tồn kho trong catalog có thể là dữ liệu minh họa. Không có điểm số hiệu năng hoặc kết luận tương thích được suy đoán.</p>
      {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
      {codes.length === 0 && <EmptyState title="Chưa có sản phẩm để so sánh" message="Thêm sản phẩm vào danh sách so sánh từ trang tìm linh kiện." action={<Link to="/customer/parts">Tìm sản phẩm</Link>} />}
      {loading && <LoadingState message="Đang tải thông tin so sánh…" />}
      {error && <ErrorState title="Không thể tải dữ liệu so sánh" message={error} />}
      {products.length > 0 && !compatibleTypes && <div className="v2-cross-type-warning" role="status">
        <h2>Không thể so sánh trực tiếp các loại sản phẩm đã chọn</h2>
        <p>Chỉ các model cùng loại sản phẩm được đặt vào một bảng thông số. Các lựa chọn khác được hiển thị riêng để tránh so sánh những trường không tương đương.</p>
        <div className="v2-cross-type-products">{products.map((product) => <Card key={product.modelCode} title={product.productName} description={`${productTypeLabel(product.productType)} · ${product.modelCode}`}>
          <div className="v2-compare-product-art"><ProductArtwork image={product.images.find((image) => image.isPrimary) ?? product.images[0]} productName={product.productName} productType={product.productType} /></div>
          <div className="v2-cross-type-actions"><Link to={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}>Mở chi tiết</Link><SecondaryButton type="button" onClick={() => remove(product.modelCode)}>Bỏ khỏi so sánh</SecondaryButton></div>
          <OfferList offers={product.offers} />
          <TechnicalSpecifications productType={product.productType} productTypeName={productTypeLabel(product.productType)} specifications={product.specifications} definitions={definitions} verificationMetadata={product.verificationMetadata} showEnglishLabels={false} />
        </Card>)}</div>
      </div>}
      {products.length > 0 && compatibleTypes && <>
        <div className="v2-table-wrap"><table className="v2-table v2-compare-table">
          <thead><tr><th scope="col">Thông tin</th>{products.map((product) => <th key={product.modelCode} scope="col">
            <div className="v2-compare-product-art"><ProductArtwork image={product.images.find((image) => image.isPrimary) ?? product.images[0]} productName={product.productName} productType={product.productType} /></div>
            <Link to={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}>{product.productName}</Link>
            <span className="v2-mono">{product.modelCode}</span>
            <SecondaryButton type="button" onClick={() => remove(product.modelCode)}>Bỏ sản phẩm</SecondaryButton>
          </th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">Thương hiệu</th>{products.map((product) => <td key={product.modelCode}>{product.brandName ?? "—"}</td>)}</tr>
            <tr><th scope="row">Danh mục</th>{products.map((product) => <td key={product.modelCode}>{productTypeLabel(product.productType)}</td>)}</tr>
            <tr><th scope="row">Ưu đãi · điều kiện · tồn · bảo hành</th>{products.map((product) => <td key={product.modelCode}>
              {product.offers.length ? <div className="v2-compare-offers">{product.offers.map((offer) => <div key={offer.offerCode}>
                <Badge>{conditionLabel(offer.condition)}</Badge><strong>{money(offer.price, offer.currency)}</strong>
                <span>{offer.isDemo ? "Tồn kho minh họa" : "Số lượng khả dụng"}: {offer.availableQuantity}</span>
                <WarrantyDisplay months={offer.warrantyMonths} showMissing />
                <small className="v2-mono">{offer.offerCode}</small>
              </div>)}</div> : "Chưa có offer hoạt động"}
            </td>)}</tr>
          </tbody>
        </table></div>
        <label className="v2-identical-toggle"><input type="checkbox" checked={hideIdentical} onChange={(event) => setHideIdentical(event.target.checked)} />Ẩn các thông số giống nhau</label>
        <SpecificationComparison products={products} definitions={definitions} hideIdentical={hideIdentical} showEnglishLabels={false} />
        <PCConfigurationComparison products={products} />
      </>}
    </div>
  );
}

export function ProductManagementPage() {
  const [query, setQuery] = useState("");
  const { facets, error: facetError } = useFacets();
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [page, setPage] = useState(1);
  const { result, loading, error } = useProducts({
    page,
    limit: 12,
    q: query || undefined,
    type: type || undefined,
    category: category || undefined,
    brand: brand || undefined,
  });
  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const filterSelect = (label: string, value: string, options: CatalogFacets["categories"], setValue: (next: string) => void) => (
    <label className="v2-field">{label}<select className="v2-form-input" value={value} onChange={(event) => {
      setValue(event.target.value);
      setPage(1);
    }}><option value="">Tất cả</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
  );
  return <div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Catalog API · chỉ đọc</p><h1>Quản lý sản phẩm</h1></div><Badge tone="gold">Không có API ghi</Badge></div>
    <Card title="Danh mục sản phẩm" description="Thông tin lấy từ catalog API. Tạo/sửa sản phẩm chưa được hỗ trợ bởi backend.">
      <div className="v2-management-filters">
        <input className="v2-form-input v2-management-search" placeholder="Tìm tên hoặc mã model" value={query} onChange={(event) => updateQuery(event.target.value)} />
        {filterSelect("Loại sản phẩm", type, facets?.productTypes ?? [], setType)}
        {filterSelect("Danh mục", category, facets?.categories ?? [], setCategory)}
        {filterSelect("Thương hiệu", brand, facets?.brands ?? [], setBrand)}
      </div>
      {loading && <LoadingState message="Đang tải danh mục…" />}{error && <ErrorState title="Không thể tải sản phẩm" message={error} />}{facetError && <ErrorState title="Không thể tải facets" message={facetError} />}
      {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
      {result?.notice && <p className="v2-demo-banner">{result.notice}</p>}
      {result && <div className="v2-table-wrap"><table className="v2-table"><thead><tr><th>Model / mã</th><th>Loại / danh mục / thương hiệu</th><th>Thông số chính</th><th>Ưu đãi · điều kiện · tồn · bảo hành</th><th>Trạng thái / chi tiết</th></tr></thead><tbody>{result.data.map((product) => <tr key={product.productId}>
        <td>{product.productName}<small className="v2-table-subtext v2-mono">{product.modelCode}</small></td>
        <td>{product.productTypeName}<small className="v2-table-subtext">{product.categoryName} · {product.brandName ?? "Chưa có thương hiệu"}</small></td>
        <td><SpecificationHighlights productType={product.productType} specifications={product.specifications} definitions={definitions} limit={4} /></td>
        <td>{product.offers.length
          ? <div className="v2-admin-offer-summaries">{product.offers.map((offer) => <div key={offer.offerCode}>
            <Badge>{offer.condition}</Badge><strong>{money(offer.price, offer.currency)}</strong>
            <span>{offer.isDemo ? "Tồn minh họa" : "Tồn"}: {offer.availableQuantity}</span>
            <WarrantyDisplay months={offer.warrantyMonths} showMissing />
          </div>)}</div>
          : "Chưa có offer hoạt động."}</td>
        <td><Badge>{product.status}</Badge><details className="v2-product-inventory-details"><summary>Toàn bộ thông số ({Object.keys(product.specifications).length})</summary><TechnicalSpecifications productType={product.productType} productTypeName={product.productTypeName} specifications={product.specifications} definitions={definitions} verificationMetadata={product.verificationMetadata} /></details></td>
      </tr>)}</tbody></table></div>}
      {result && result.pagination.totalPages > 1 && <div className="v2-pager">
        <SecondaryButton type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Trước</SecondaryButton>
        <span>Trang {result.pagination.page} / {result.pagination.totalPages} · {result.pagination.total} sản phẩm</span>
        <SecondaryButton type="button" disabled={page >= result.pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Tiếp</SecondaryButton>
      </div>}
      {facets && <p className="v2-muted">Danh mục facets: {facets.productTypes.length} loại sản phẩm · {facets.categories.length} danh mục · {facets.brands.length} thương hiệu</p>}
    </Card>
  </div>;
}

export function FacetManagementPage({ kind }: { kind: "categories" | "brands" }) {
  const { facets, loading, error } = useFacets();
  const items = kind === "categories" ? facets?.categories : facets?.brands;
  const title = kind === "categories" ? "Quản lý danh mục" : "Quản lý thương hiệu";
  return <div className="v2-page"><div className="v2-page-title"><div><p className="v2-eyebrow">Catalog facets · chỉ đọc</p><h1>{title}</h1></div><Badge tone="gold">Không có API ghi</Badge></div>
    <Card title={title} description="Danh sách được cung cấp bởi API facets hiện có.">
      {loading && <LoadingState message="Đang tải dữ liệu…" />}{error && <ErrorState title="Không thể tải facets" message={error} />}
      {items && <div className="v2-facet-grid">{items.map((item) => <div className="v2-facet-item" key={item.value}><strong>{item.label}</strong><span className="v2-mono">{item.value}</span></div>)}</div>}
      {!loading && items?.length === 0 && <EmptyState title="Chưa có dữ liệu" message="API không trả về mục nào." />}
    </Card>
  </div>;
}
