import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchCatalogFacets,
  fetchCatalogProduct,
  fetchCatalogProducts,
  fetchStorefrontHomepage,
  fetchProductUpgrades,
  estimateGamingPerformance,
  customerVisibleOffers,
  canPurchaseOffer,
  offerOriginalPrice,
} from "../catalog-api";
import type {
  CatalogFacets,
  CatalogProduct,
  CatalogProductFilters,
  CatalogProductPage,
  CatalogBomComponent,
  StorefrontHomepageSection,
  GamingPerformanceEstimate,
  GamingPerformanceRequest,
  PublicUpgradeConfiguration,
} from "../catalog-api";
import { addCartItem, fetchCart, updateCartItemConfiguration } from "../cart-api";
import { money } from "../demo/demo-store";
import { useCatalogAttributeDefinitions } from "./catalog-metadata";
import { pcReferenceDescription } from "./pc-configuration";
import {
  OfferList,
  ProductOfferPanel,
  SpecificationHighlights,
  SpecificationComparison,
  PCConfigurationComparison,
  PCConfigurationDetails,
  PCComponentChecklist,
  PCConfigurationSummary,
  TechnicalSpecifications,
  WarrantyDisplay,
  customerVisibleCopy,
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
import { displayProductImages, preferredProductImage } from "./product-images";
import {
  HeroCarousel,
  ProductArtwork,
  ProductCarousel,
  ProductImageGallery,
  categoryLabel,
  productTypeLabel,
  productTypeSymbol,
} from "./storefront-components";

const conditionLabels: Record<string, string> = {
  NEW: "Hàng mới",
  REFURBISHED: "Đã tân trang",
  LIKE_NEW: "Hàng như mới",
  USED: "Đã qua sử dụng",
};

const accessoryTypes = ["monitor", "keyboard", "mouse", "headset"] as const;
type AccessoryType = typeof accessoryTypes[number];
const accessoryTypeLabels: Record<AccessoryType, string> = {
  monitor: "Màn hình",
  keyboard: "Bàn phím",
  mouse: "Chuột",
  headset: "Tai nghe",
};
const accessoryNamePatterns: Record<AccessoryType, RegExp> = {
  monitor: /\bmonitor\b|\bdisplay\b|\d+(?:\.\d+)?\s*inch\b|\bvg\d{3}|\bxg\d{2}|\bodyssey\b/iu,
  keyboard: /\bkeyboard\b|\bk552\b|\bk617\b|\bk70\b|\bk8\s?pro\b|\bf75\b|\bs98\b/iu,
  mouse: /\bmouse\b|\bdeathadder\b|\bsuperlight\b|\bg102\b|\bg304\b|\bg502\b|\bviper\b/iu,
  headset: /\bheadset\b|\bheadphone\b|\bblackshark\b|\bcloud iii\b|\bkraken\b|\bg733\b/iu,
};
interface AccessoryRecommendation {
  type: AccessoryType;
  product: CatalogProduct;
}

function isAccessoryType(product: CatalogProduct, type: AccessoryType): boolean {
  const specificationKeys = Object.keys(product.specifications);
  if (specificationKeys.some((code) => code.startsWith(`${type}_`))) return true;
  const declaredType = String(product.specifications.accessory_type ?? "");
  return accessoryNamePatterns[type].test(
    `${declaredType} ${product.productName} ${product.modelCode}`,
  );
}

function normalizedProductName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function conditionLabel(condition: string) {
  return conditionLabels[condition] ?? condition;
}

function productDescription(product: CatalogProduct): string | null {
  if (product.modelCode !== "PBC-PC-GAME-002") return customerVisibleCopy(product.description);
  return pcReferenceDescription(product.specifications, product.bomComponents);
}

function copyWithoutBomSummary(value: string | null): string | null {
  if (!value) return null;
  const copy = value.split(/(?<=[.!?])\s+|\r?\n+/)
    .filter((sentence) => !/\bcấu hình gồm\b/iu.test(sentence))
    .join(" ")
    .trim();
  return copy || null;
}

function copyWithoutUnsupportedUpgradeClaims(value: string | null): string | null {
  if (!value) return null;
  const copy = value.split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/(?:nâng cấp|thay thế linh kiện|đổi linh kiện)/iu.test(sentence))
    .join(" ")
    .trim();
  return copy || null;
}

function productSummary(product: CatalogProduct): string | null {
  return product.modelCode === "PBC-PC-GAME-002"
    ? productDescription(product)
    : customerVisibleCopy(product.shortDescription);
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

function productCoverImage(product: CatalogProduct) {
  return preferredProductImage(
    displayProductImages(
      product.images.filter((image) => image.mediaType !== "VIDEO"),
      product.productType,
    ),
  );
}

function ProductTile({
  product,
  definitions,
  onQuickView,
}: {
  product: CatalogProduct;
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"];
  onQuickView: (product: CatalogProduct, anchor: HTMLElement, touch: boolean) => void;
}) {
  const { items } = useComparison();
  const compared = items.some((item) => item.modelCode === product.modelCode);
  const offers = customerVisibleOffers(product.offers);
  const offer = offers[0];
  const image = productCoverImage(product);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const purchaseAvailable = canPurchaseOffer(offer, 1);
  const addToCart = async () => {
    if (!offer || !purchaseAvailable) return;
    setCartBusy(true);
    setCartMessage("");
    setCartError("");
    try {
      await addCartItem(offer.offerId, 1);
      setCartMessage("Đã thêm vào giỏ hàng.");
    } catch (reason) {
      setCartError(reason instanceof Error ? reason.message : "Không thể thêm sản phẩm vào giỏ hàng.");
    } finally {
      setCartBusy(false);
    }
  };
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
        <button className="v2-card-quick-view" type="button" onClick={(event) => {
          const touch = window.matchMedia("(max-width: 720px), (hover: none)").matches;
          onQuickView(product, event.currentTarget.closest(".v2-product-card") ?? event.currentTarget, touch);
        }}>Xem nhanh</button>
      </div>
      <div className="v2-product-info">
        <p className="v2-eyebrow">{product.brandName ?? "Chưa có thương hiệu"} · {productTypeLabel(product.productType)}</p>
        {product.featured && <Badge tone="primary">Nổi bật</Badge>}
        <Link className="v2-product-name" to={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}>
          {product.productName}
        </Link>
        <p className="v2-mono">{product.modelCode}</p>
        {product.productType === "PC"
          ? <PCConfigurationSummary specifications={product.specifications} verificationMetadata={product.verificationMetadata} />
          : <SpecificationHighlights productType={product.productType} specifications={product.specifications} definitions={definitions} />}
        {offer ? (
          <div className="v2-product-offer">
            {offer.saleBadge && <Badge tone="success">{offer.saleBadge}</Badge>}
            <strong>{money(offer.price, offer.currency)}</strong>
            {offerOriginalPrice(offer) > 0
              && <span className="v2-promotion-original-price">{money(offerOriginalPrice(offer), offer.currency)}</span>}
            {offer.promotionDisplayCopy && <span>{offer.promotionDisplayCopy}</span>}
            <span>Tình trạng: {conditionLabel(offer.condition)}</span>
            <span>Số lượng khả dụng: {offer.availableQuantity}</span>
            <WarrantyDisplay months={offer.warrantyMonths} showMissing />
            {offers.length > 1 && <span>{offers.length} ưu đãi đang hoạt động · xem chi tiết</span>}
          </div>
        ) : <p className="v2-muted">Giá bán và tình trạng hàng chưa được cập nhật.</p>}
        {offer && <div className="v2-product-card-actions">
          <PrimaryButton type="button" disabled={!purchaseAvailable || cartBusy} onClick={() => void addToCart()}>
            {cartBusy ? "Đang thêm…" : purchaseAvailable ? "Thêm vào giỏ" : "Tạm hết hàng"}
          </PrimaryButton>
          {cartMessage && <p className="v2-inline-success" role="status">{cartMessage}</p>}
          {cartError && <p className="v2-inline-error" role="alert">{cartError}</p>}
        </div>}
      </div>
    </Card>
  );
}

function ProductGrid({
  products,
  definitions,
  onQuickView,
}: {
  products: CatalogProduct[];
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"];
  onQuickView: (product: CatalogProduct, anchor: HTMLElement, touch: boolean) => void;
}) {
  if (!products.length) return <EmptyState title="Chưa có sản phẩm phù hợp" message="Thử thay đổi từ khóa hoặc bộ lọc." />;
  return <>
    <p className="v2-spec-dictionary-note">Mở chi tiết sản phẩm để xem đầy đủ thông số kỹ thuật.</p>
    <div className="v2-product-grid">{products.map((product) => (
      <ProductTile key={product.productId} product={product} definitions={definitions} onQuickView={onQuickView} />
    ))}</div>
  </>;
}

function RelatedProductsSection({
  product,
  definitions,
}: {
  product: CatalogProduct;
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"];
}) {
  const isAccessory = product.productType === "ACCESSORY";
  const accessoryType = isAccessory
    ? accessoryTypes.find((type) => isAccessoryType(product, type))
    : undefined;
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState("");
  const [quickView, setQuickView] = useState<ActiveQuickView>();
  useEffect(() => {
    if (isAccessory && !accessoryType) {
      setProducts([]);
      setError("");
      return;
    }
    const controller = new AbortController();
    void fetchCatalogProducts({
      page: 1,
      limit: 50,
      type: product.productType,
      category: product.categoryCode,
      sort: "name",
      order: "asc",
    }, controller.signal).then(
      (page) => {
        if (!controller.signal.aborted) {
          const currentName = normalizedProductName(product.productName);
          const unique = new Map<string, CatalogProduct>();
          const seenNames = new Set<string>();
          page.data.filter((candidate) =>
            !isAccessory || (accessoryType !== undefined && isAccessoryType(candidate, accessoryType)))
            .forEach((candidate) => {
            const candidateName = normalizedProductName(candidate.productName);
            if (candidate.modelCode === product.modelCode || candidateName === currentName) return;
            const key = candidate.modelCode.trim().toUpperCase() || candidateName;
            if (!unique.has(key) && !seenNames.has(candidateName)) {
              unique.set(key, candidate);
              seenNames.add(candidateName);
            }
          });
          setProducts([...unique.values()].slice(0, 4));
          setError("");
        }
      },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Không thể tải sản phẩm liên quan.");
        }
      },
    );
    return () => controller.abort();
  }, [accessoryType, isAccessory, product.categoryCode, product.modelCode, product.productName,
    product.productType]);

  if (!products.length && !error) return null;
  return <section className="v2-section-block v2-related-products">
    <div className="v2-section-heading">
      <div><p className="v2-eyebrow">Cùng danh mục</p><h2>Sản phẩm liên quan</h2></div>
      <Link to={`/customer/parts?type=${encodeURIComponent(product.productType)}&category=${encodeURIComponent(product.categoryCode)}`}>Xem thêm →</Link>
    </div>
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    {products.length > 0 && <div className="v2-product-grid">{products.map((item) => (
      <ProductTile
        key={item.modelCode}
        product={item}
        definitions={definitions}
        onQuickView={(quickProduct, anchor, touch) => setQuickView({ product: quickProduct, anchor, touch })}
      />
    ))}</div>}
    {quickView && <ProductQuickView
      active={quickView}
      definitions={definitions}
      onClose={() => setQuickView(undefined)}
      onPointerEnter={() => undefined}
      onPointerLeave={() => undefined}
    />}
  </section>;
}

interface ActiveQuickView {
  product: CatalogProduct;
  anchor: HTMLElement;
  touch: boolean;
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
      code: definition.code,
      label: attributeLabel(definitions, product.productType, definition.code),
      value: formatSpecificationValue(value, definition),
    }];
  });
}

const cardSpecificationOrder: Record<string, string[]> = {
  CPU: ["socket", "core_count", "thread_count"],
  GPU: ["gpu_chip", "vram_gb", "memory_type"],
  MOTHERBOARD: ["socket", "chipset", "memory_type", "form_factor"],
  RAM: ["memory_type", "capacity_gb", "data_rate_mt_s"],
  STORAGE: ["capacity_gb", "interface", "protocol"],
  PSU: ["wattage", "efficiency_rating"],
  MONITOR: ["screen_size_in", "resolution", "refresh_rate_hz"],
};

function cardSpecifications(
  product: CatalogProduct,
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"],
) {
  const verified = verifiedQuickViewSpecifications(product, definitions);
  const preferredCodes = cardSpecificationOrder[product.productType];
  if (!preferredCodes) return verified.slice(0, 3);
  return preferredCodes.flatMap((code) => verified.filter((item) => item.code === code)).slice(0, 3);
}

function pcCardSummary(product: CatalogProduct) {
  const components = product.bomComponents ?? [];
  const fromBom = (type: string) => components.find((component) => component.productType === type)?.productName;
  const numeric = (key: string) => {
    const value = Number(product.specifications[key]);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  const ram = numeric("total_ram_capacity_gb");
  const storage = numeric("total_storage_capacity_gb");
  const storageLabel = storage === undefined
    ? fromBom("STORAGE")
    : storage >= 1024 && storage % 1024 === 0
      ? `${storage / 1024}TB`
      : `${storage}GB`;
  return [
    ["CPU", product.specifications.cpu_model_summary ?? fromBom("CPU")],
    ["GPU", product.specifications.gpu_model_summary ?? fromBom("GPU")],
    ["RAM", ram === undefined ? fromBom("RAM") : `${ram}GB`],
    ["SSD", storageLabel],
  ].filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0);
}

function HomepageProductTile({
  product,
  definitions,
  onQuickView,
  onQuickViewClose,
}: {
  product: CatalogProduct;
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"];
  onQuickView: (product: CatalogProduct, anchor: HTMLElement, touch: boolean) => void;
  onQuickViewClose: () => void;
}) {
  const { items } = useComparison();
  const compared = items.some((item) => item.modelCode === product.modelCode);
  const offers = customerVisibleOffers(product.offers);
  const offer = offers[0];
  const image = productCoverImage(product);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartStatus, setCartStatus] = useState("");
  const originalPrice = offer ? offerOriginalPrice(offer) : 0;
  const discountPercent = offer && originalPrice > Number(offer.price)
    ? Math.round((originalPrice - Number(offer.price)) / originalPrice * 100)
    : 0;
  const specs = product.productType === "PC" ? [] : cardSpecifications(product, definitions);
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
          {product.productType === "PC" ? (
            <ul className="v2-home-card-specs" aria-label="Tóm tắt cấu hình PC">
              {pcCardSummary(product).map(([label, value]) => <li key={label}><b>{label}</b><span>{String(value)}</span></li>)}
            </ul>
          ) : specs.length > 0 ? (
            <ul className="v2-home-card-specs" aria-label="Thông số sản phẩm">
              {specs.map((item) => <li key={item.code}><b>{item.label}</b><span>{item.value}</span></li>)}
            </ul>
          ) : null}
          {offer ? (
            <div className="v2-product-offer">
              {discountPercent > 0 && <Badge tone="success">-{discountPercent}%</Badge>}
              <strong>{money(offer.price, offer.currency)}</strong>
              {originalPrice > Number(offer.price)
                && <span className="v2-promotion-original-price">{money(originalPrice, offer.currency)}</span>}
              <Badge tone={offer.condition === "NEW" ? "success" : "warning"}>{conditionLabel(offer.condition)}</Badge>
              {offer.warrantyMonths !== null && <WarrantyDisplay months={offer.warrantyMonths} />}
            </div>
          ) : <p className="v2-muted">Giá bán và tình trạng hàng chưa được cập nhật.</p>}
          {offer && <div className="v2-home-card-actions">
            <button type="button" className="v2-button v2-button-secondary"
              disabled={addingToCart || !canPurchaseOffer(offer, 1)}
              onClick={() => {
                setAddingToCart(true);
                setCartStatus("");
                void addCartItem(offer.offerId, 1).then(() => {
                  setCartStatus("Đã thêm sản phẩm vào giỏ hàng.");
                }).catch((reason: unknown) => {
                  setCartStatus(reason instanceof Error ? reason.message : "Không thể thêm sản phẩm vào giỏ hàng.");
                }).finally(() => setAddingToCart(false));
              }}>
              {addingToCart ? "Đang thêm…" : "Thêm vào giỏ"}
            </button>
            {cartStatus && <span role="status">{cartStatus}</span>}
          </div>}
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
  const [cartStatus, setCartStatus] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const offer = customerVisibleOffers(active.product.offers)[0];
  const summary = productSummary(active.product);
  const verifiedSpecs = verifiedQuickViewSpecifications(active.product, definitions).slice(0, 5);
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
            {offer.saleBadge && <Badge tone="success">{offer.saleBadge}</Badge>}
            <strong>{money(offer.price, offer.currency)}</strong>
            {offerOriginalPrice(offer) > 0
              && <span className="v2-promotion-original-price">{money(offerOriginalPrice(offer), offer.currency)}</span>}
            <span>{conditionLabel(offer.condition)}</span>
          </div>
        ) : <p className="v2-muted">Giá bán và tình trạng hàng chưa được cập nhật.</p>}
        {offer?.warrantyMonths !== null && offer?.warrantyMonths !== undefined && <WarrantyDisplay months={offer.warrantyMonths} />}
        {summary?.trim() && <p className="v2-home-quick-view-summary">{summary}</p>}
        {verifiedSpecs.length > 0 && (
          <dl className="v2-home-quick-view-specs">
            {verifiedSpecs.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>
        )}
        {active.product.productType === "PC"
          ? <PCConfigurationSummary specifications={active.product.specifications} verificationMetadata={active.product.verificationMetadata} limit={3} />
          : null}
        {offer && <button className="v2-button v2-button-secondary v2-home-quick-view-cart"
          type="button" disabled={addingToCart || !canPurchaseOffer(offer, 1)}
          onClick={() => {
            setAddingToCart(true);
            setCartStatus("");
            void addCartItem(offer.offerId, 1).then(() => {
              setCartStatus("Đã thêm sản phẩm vào giỏ hàng.");
            }).catch((reason: unknown) => {
              setCartStatus(reason instanceof Error ? reason.message : "Không thể thêm sản phẩm vào giỏ hàng.");
            }).finally(() => setAddingToCart(false));
          }}>
          {addingToCart ? "Đang thêm…" : "Thêm vào giỏ"}
        </button>}
        {cartStatus && <p className="v2-muted" role="status">{cartStatus}</p>}
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
  const [homepageSections, setHomepageSections] = useState<StorefrontHomepageSection[]>([]);
  const [homepageError, setHomepageError] = useState("");
  const [homepageLoading, setHomepageLoading] = useState(true);
  const [quickView, setQuickView] = useState<ActiveQuickView | undefined>(undefined);
  const quickViewCloseTimer = useRef<number | undefined>(undefined);
  const hotSaleSection = homepageSections.find((section) => section.key === "hot-sale");
  const pcSections = homepageSections.filter((section) => section.key.startsWith("pc-"));
  const componentSections = homepageSections.filter((section) => section.variant === "component");

  useEffect(() => {
    const controller = new AbortController();
    void fetchStorefrontHomepage(controller.signal).then(
      (response) => {
        setHomepageSections(response.sections);
        setHomepageError("");
      },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setHomepageError(reason instanceof Error
            ? reason.message
            : "Không thể tải dữ liệu trang chủ.");
        }
      },
    ).finally(() => {
      if (!controller.signal.aborted) setHomepageLoading(false);
    });
    return () => controller.abort();
  }, []);

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
      description: "Khám phá các mẫu máy tính bộ phù hợp với nhu cầu của bạn.",
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
      description: "Tìm hiểu các bộ vi xử lý và thông số kỹ thuật.",
      category: "CPU",
    },
  ] as const;

  return (
    <div className="v2-page v2-home-page">
      <section className="v2-home-collection-intro">
        <div>
          <p className="v2-eyebrow">PC Builder Store · Danh mục phần cứng</p>
          <h2>Phần cứng phù hợp cho mọi cấu hình</h2>
          <p>Khám phá máy tính bộ và linh kiện với thông tin sản phẩm, thông số kỹ thuật và tình trạng cung cấp.</p>
        </div>
        <Link className="v2-button v2-button-secondary" to="/customer/parts">Xem tất cả sản phẩm <span aria-hidden="true">→</span></Link>
      </section>
      <HeroCarousel
        slides={heroSlides.map((slide) => ({
          ...slide,
          product: slide.category === "PC"
            ? pcSections[0]?.products[0]
            : homepageSections.find((section) => section.key === `component-${slide.category.toLowerCase()}`)
              ?.products[0],
        }))}
        onNavigate={(type) => navigate(`/customer/parts?type=${encodeURIComponent(type)}`)}
      />
      {homepageError && <ErrorState title="Không thể tải nội dung trang chủ" message={homepageError} />}
      {homepageLoading && <LoadingState message="Đang tải danh mục sản phẩm…" />}
      {hotSaleSection && <HomeProductSection
        section={hotSaleSection}
        definitions={definitions}
        onQuickView={showQuickView}
        onQuickViewClose={scheduleQuickViewClose}
      />}
      {pcSections.length > 0 && <section className="v2-section-block">
        <div className="v2-section-heading">
          <div><p className="v2-eyebrow">Khám phá theo nhu cầu</p><h2>Chọn dòng máy tính</h2></div>
          <Link to="/customer/parts?type=PC">Tất cả máy tính bộ →</Link>
        </div>
        <div className="v2-pc-discovery-grid">
          {pcSections.map((section) => <Link className="v2-pc-category-card"
            key={section.key} to={section.href}>
            <span className="v2-pc-category-mark" aria-hidden="true">
              {section.variant === "ai" ? "AI" : section.variant === "gaming" ? "G" : "PC"}
            </span>
            <span className="v2-pc-category-copy">
              <strong>{section.title}</strong>
              <small>{section.eyebrow}</small>
              <small>{section.productCount} sản phẩm</small>
            </span>
            <span className="v2-pc-category-arrow" aria-hidden="true">→</span>
          </Link>)}
        </div>
        {facetsLoading && <LoadingState message="Đang tải danh mục…" />}
        {facetsError && <ErrorState title="Không thể tải danh mục" message={facetsError} />}
      </section>}
      {pcSections.map((section) => <HomeProductSection key={section.key}
        section={section}
        definitions={definitions}
        onQuickView={showQuickView}
        onQuickViewClose={scheduleQuickViewClose}
      />)}
      {componentSections.length > 0 && <section className="v2-section-block">
        <div className="v2-section-heading">
          <div><p className="v2-eyebrow">Danh mục linh kiện</p><h2>Tìm linh kiện theo nhóm</h2></div>
          <Link to="/customer/parts">Tất cả linh kiện →</Link>
        </div>
        <div className="v2-component-discovery-grid">
          {componentSections.map((section) => {
            const type = section.key.startsWith("gear-")
              ? "ACCESSORY"
              : section.key.slice("component-".length).toUpperCase();
            return <Link className="v2-component-category-card" key={section.key} to={section.href}>
              <span className="v2-category-art" aria-hidden="true">{productTypeSymbol(type)}</span>
              <strong>{section.title}</strong>
              <small>{section.productCount} sản phẩm</small>
            </Link>;
          })}
        </div>
      </section>}
      {componentSections.map((section) => <HomeProductSection key={section.key}
        section={section}
        definitions={definitions}
        onQuickView={showQuickView}
        onQuickViewClose={scheduleQuickViewClose}
      />)}
      {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
      {quickView && <ProductQuickView active={quickView} definitions={definitions} onClose={() => setQuickView(undefined)} onPointerEnter={keepQuickViewOpen} onPointerLeave={scheduleQuickViewClose} />}
      {facets?.brands.length ? <section className="v2-section-block v2-brand-section">
        <div className="v2-section-heading"><div><p className="v2-eyebrow">Thương hiệu phần cứng</p><h2>Khám phá thương hiệu</h2></div><Link to="/customer/parts">Xem toàn bộ thương hiệu →</Link></div>
        <div className="v2-brand-grid">
          {facets.brands.slice(0, 8).map((brand) => <Link className="v2-brand-card" key={brand.value} to={`/customer/parts?brand=${encodeURIComponent(brand.value)}`}>
            <span aria-hidden="true">{brand.label.slice(0, 2).toUpperCase()}</span><strong>{brand.label}</strong><small>Khám phá sản phẩm</small>
          </Link>)}
        </div>
      </section> : null}
      <section className="v2-build-callout">
        <div><Badge tone="gold">Cấu hình theo ý bạn</Badge><h2>Tự xây dựng bộ PC</h2><p>Chọn linh kiện từ danh mục hiện có và xem tổng giá cấu hình.</p></div>
        <Link className="v2-button v2-button-primary" to="/build-pc/start">Bắt đầu cấu hình <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  );
}

function HomeProductSection({
  section,
  definitions,
  onQuickView,
  onQuickViewClose,
}: {
  section: StorefrontHomepageSection;
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"];
  onQuickView: (product: CatalogProduct, anchor: HTMLElement, touch: boolean) => void;
  onQuickViewClose: () => void;
}) {
  return <section className={`v2-section-block v2-home-collection v2-home-collection-${section.variant}`}>
    <div className="v2-section-heading">
      <div>
        <p className="v2-eyebrow">{section.eyebrow}</p>
        <h2>{section.variant === "hot-sale" && <span aria-hidden="true">🔥 </span>}{section.title}</h2>
        {section.links.length > 0 && <nav className="v2-home-section-links" aria-label={`Danh mục ${section.title}`}>
          {section.links.map((link) => <Link key={`${link.label}:${link.href}`} to={link.href}>{link.label}</Link>)}
        </nav>}
      </div>
      <Link to={section.href}>Xem tất cả →</Link>
    </div>
    {section.variant === "hot-sale" && <p className="v2-home-sale-caption">Ưu đãi hiển thị theo giá gốc và giá bán hiện có</p>}
    <ProductCarousel label={section.title}>
      {section.products.map((product) => <HomepageProductTile key={product.productId}
        product={product}
        definitions={definitions}
        onQuickView={onQuickView}
        onQuickViewClose={onQuickViewClose}
      />)}
    </ProductCarousel>
    {section.variant === "hot-sale" && <Link className="v2-home-sale-footer" to={section.href}>
      Xem tất cả ưu đãi <span aria-hidden="true">→</span>
    </Link>}
  </section>;
}

export function PartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [quickView, setQuickView] = useState<ActiveQuickView>();
  const { codes } = useComparison();
  const { facets, error: facetsError } = useFacets();
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  const [filters, setFilters] = useState({
    q: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "",
    category: searchParams.get("category") ?? "",
    pcCollection: searchParams.get("pcCollection") ?? "",
    accessoryType: searchParams.get("accessoryType") ?? "",
    sale: searchParams.get("sale") === "true",
    brand: searchParams.get("brand") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    sort: (searchParams.get("sort") === "price" ? "price" : "name") as "name" | "price",
    order: (searchParams.get("order") === "desc" ? "desc" : "asc") as "asc" | "desc",
    page: Number(searchParams.get("page") || 1),
    attributes: {} as Record<string, string>,
  });
  const [filterValidation, setFilterValidation] = useState("");
  useEffect(() => {
    setFilters((current) => ({
      ...current,
      q: searchParams.get("q") ?? "",
      type: searchParams.get("type") ?? "",
      category: searchParams.get("category") ?? "",
      pcCollection: searchParams.get("pcCollection") ?? "",
      accessoryType: searchParams.get("accessoryType") ?? "",
      sale: searchParams.get("sale") === "true",
      brand: searchParams.get("brand") ?? "",
      minPrice: searchParams.get("minPrice") ?? "",
      maxPrice: searchParams.get("maxPrice") ?? "",
      sort: searchParams.get("sort") === "price" ? "price" : "name",
      order: searchParams.get("order") === "desc" ? "desc" : "asc",
      page: Number(searchParams.get("page") || 1),
    }));
  }, [searchParams]);
  const apiFilters = useMemo<CatalogProductFilters>(() => ({
    page: filters.page,
    limit: 12,
    q: filters.q || undefined,
    type: filters.type || undefined,
    category: filters.category || undefined,
    pcCollection: filters.pcCollection || undefined,
    accessoryType: filters.accessoryType || undefined,
    sale: filters.sale ? true : undefined,
    brand: filters.brand || undefined,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    sort: filters.sort,
    order: filters.order,
    attributes: Object.entries(filters.attributes).filter(([, value]) => value).map(([code, value]) => ({ code, value })),
  }), [filters]);
  const { result, loading, error } = useProducts(apiFilters);
  const selectedAttributes = facets?.attributes.filter((attribute) => attribute.productType === filters.type && attribute.values.length) ?? [];
  const update = (key: keyof typeof filters, value: string | number) => {
    setFilterValidation("");
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? Number(value) : 1,
      attributes: key === "type" ? {} : current.attributes,
    }));
  };
  const applyFilters = () => {
    const minPrice = filters.minPrice.trim();
    const maxPrice = filters.maxPrice.trim();
    if ((minPrice && (!Number.isFinite(Number(minPrice)) || Number(minPrice) < 0))
        || (maxPrice && (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0))) {
      setFilterValidation("Giá lọc phải là số không âm.");
      return;
    }
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setFilterValidation("Giá tối thiểu không được lớn hơn giá tối đa.");
      return;
    }
    setFilterValidation("");
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== "attributes" && value !== "" && value !== 1 && value !== false) {
        params.set(key, String(value));
      }
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
    <div className="v2-form-grid">
      <label className="v2-field">Giá từ (₫)<input className="v2-form-input" type="number" min="0" step="1000" value={filters.minPrice} onChange={(event) => update("minPrice", event.target.value)} /></label>
      <label className="v2-field">Đến (₫)<input className="v2-form-input" type="number" min="0" step="1000" value={filters.maxPrice} onChange={(event) => update("maxPrice", event.target.value)} /></label>
    </div>
    {filterValidation && <p className="v2-inline-error" role="alert">{filterValidation}</p>}
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
              setFilters((current) => ({
                ...current,
                sort: sort as "name" | "price",
                order: order as "asc" | "desc",
                page: 1,
              }));
            }}>
              <option value="name-asc">Tên A–Z</option>
              <option value="name-desc">Tên Z–A</option>
              <option value="price-asc">Giá thấp đến cao</option>
              <option value="price-desc">Giá cao đến thấp</option>
            </select></label>
          </div>
          {loading && <LoadingState message="Đang tải sản phẩm…" />}
          {error && <ErrorState title="Không thể tải danh sách sản phẩm" message={error} />}
          {result && <ProductGrid
            products={result.data}
            definitions={definitions}
            onQuickView={(product, anchor, touch) => setQuickView({ product, anchor, touch })}
          />}
          {result && result.pagination.totalPages > 1 && <div className="v2-pager">
            <SecondaryButton type="button" disabled={filters.page <= 1 || loading} onClick={() => update("page", filters.page - 1)}>Trước</SecondaryButton>
            <span>Trang {result.pagination.page} / {result.pagination.totalPages}</span>
            <SecondaryButton type="button" disabled={filters.page >= result.pagination.totalPages || loading} onClick={() => update("page", filters.page + 1)}>Tiếp</SecondaryButton>
          </div>}
        </section>
      </div>
      <div className="v2-filter-mobile"><Drawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Bộ lọc sản phẩm"><div className="v2-filter-panel">{filterControls}</div></Drawer></div>
      {quickView && <ProductQuickView
        active={quickView}
        definitions={definitions}
        onClose={() => setQuickView(undefined)}
        onPointerEnter={() => undefined}
        onPointerLeave={() => undefined}
      />}
    </div>
  );
}

function bomWithSelectedUpgrades(
  components: CatalogBomComponent[] | undefined,
  configuration: PublicUpgradeConfiguration | undefined,
  choices: Record<string, { optionId: string; quantity: number }>,
): CatalogBomComponent[] {
  const result = [...(components ?? [])];
  for (const group of configuration?.groups ?? []) {
    const choice = choices[group.groupId];
    const option = group.options.find((item) => item.optionId === choice?.optionId);
    if (!option) continue;
    const componentIndex = result.findIndex((component) =>
      component.productType.toUpperCase() === option.productType.toUpperCase());
    if (componentIndex < 0) continue;
    const current = result[componentIndex];
    result[componentIndex] = {
      ...current,
      componentProductId: option.productId,
      modelCode: option.modelCode,
      productName: option.productName,
      productType: option.productType,
      quantity: choice.quantity,
      imageUrl: null,
      imageAltText: null,
      keySpecifications: null,
    };
  }
  return result.sort((a, b) => a.displayOrder - b.displayOrder);
}

function GamingPerformancePanel({
  product,
  offerId,
  upgrades,
}: {
  product: CatalogProduct;
  offerId: string;
  upgrades: GamingPerformanceRequest["upgrades"];
}) {
  const [resolution, setResolution] = useState<GamingPerformanceRequest["resolution"]>("1080p");
  const [quality, setQuality] = useState<GamingPerformanceRequest["quality"]>("HIGH");
  const [estimate, setEstimate] = useState<GamingPerformanceEstimate>();
  const [estimateRevision, setEstimateRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const selectedUpgrades = JSON.stringify(upgrades);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void estimateGamingPerformance(product.modelCode, {
      offerId,
      resolution,
      quality,
      upgrades: JSON.parse(selectedUpgrades) as GamingPerformanceRequest["upgrades"],
    }, controller.signal).then((response) => {
      if (!controller.signal.aborted) {
        setEstimate(response);
        setEstimateRevision((revision) => revision + 1);
      }
    }, (reason: unknown) => {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : "Không thể ước tính hiệu năng cấu hình.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [product.modelCode, offerId, resolution, quality, selectedUpgrades]);

  const games = estimate?.games ?? [];
  const featuredGames = [...games.filter((game) => game.category === "AAA").slice(0, 2),
    ...games.filter((game) => game.category === "ESPORTS").slice(0, 2)];
  const resolutionOptions: { value: GamingPerformanceRequest["resolution"]; label: string }[] = [
    { value: "1080p", label: "1080p" },
    { value: "1440p", label: "2K / 1440p" },
    { value: "2160p", label: "4K / 2160p" },
  ];
  const qualityOptions: { value: GamingPerformanceRequest["quality"]; label: string }[] = [
    { value: "LOW", label: "Thấp" },
    { value: "MEDIUM", label: "Trung bình" },
    { value: "HIGH", label: "Cao" },
    { value: "ULTRA", label: "Ultra" },
  ];
  const gameStatusClass = (classification: string) => {
    if (classification === "Chơi mượt mà") return "is-smooth";
    if (classification === "Chơi ổn định") return "is-stable";
    if (classification === "Cần giảm thiết lập") return "is-limited";
    return "is-unsuitable";
  };
  const renderGame = (game: GamingPerformanceEstimate["games"][number]) => {
    const target = game.category === "ESPORTS" ? 100 : 60;
    const progress = Math.min(100, game.estimatedFps / target * 100);
    return <article className="v2-gaming-game" key={game.gameId}>
      <span className="v2-gaming-game-icon" aria-hidden="true">{game.name.slice(0, 2).toUpperCase()}</span>
      <div className="v2-gaming-game-info">
        <strong>{game.name}</strong>
        <span className="v2-gaming-game-bar" role="progressbar"
          aria-label={`Ước tính ${game.estimatedFps} FPS cho ${game.name}`}
          aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(target, game.estimatedFps)}>
          <span style={{ width: `${progress}%` }} />
        </span>
        <small>{game.explanation}</small>
      </div>
      <div className="v2-gaming-game-result">
        <strong key={`${game.gameId}-${estimateRevision}`} className="v2-gaming-fps-value">
          {game.estimatedFps} FPS
        </strong>
        <span className={gameStatusClass(game.classification)}>{game.classification}</span>
      </div>
    </article>;
  };

  return <section className="v2-gaming-estimator" aria-labelledby="gaming-estimator-title">
    <header className="v2-gaming-estimator-heading">
      <div>
        <p className="v2-eyebrow">Hiệu năng dự kiến theo cấu hình đang chọn</p>
        <h2 id="gaming-estimator-title">MÁY NÀY CHƠI GAME THẾ NÀO?</h2>
        <p>Số liệu FPS dự kiến mang tính tham khảo, không phải kết quả đo benchmark.</p>
      </div>
      <span className="v2-gaming-estimator-chip">ƯỚC TÍNH</span>
    </header>
    <div className="v2-gaming-controls">
      <fieldset>
        <legend>Độ phân giải</legend>
        {resolutionOptions.map((option) => <button key={option.value} type="button"
          className={resolution === option.value ? "is-selected" : ""}
          aria-pressed={resolution === option.value}
          onClick={() => setResolution(option.value)}>{option.label}</button>)}
      </fieldset>
      <fieldset>
        <legend>Chất lượng đồ họa</legend>
        {qualityOptions.map((option) => <button key={option.value} type="button"
          className={quality === option.value ? "is-selected" : ""}
          aria-pressed={quality === option.value}
          onClick={() => setQuality(option.value)}>{option.label}</button>)}
      </fieldset>
    </div>
    <div className={`v2-gaming-results${expanded ? " is-expanded" : ""}${loading ? " is-loading" : ""}`}
      aria-busy={loading}>
      {loading && <div className="v2-gaming-results-feedback" role="status">
        <span className="v2-gaming-loading-mark" aria-hidden="true" />
        Đang cập nhật kết quả theo cấu hình đã chọn…
      </div>}
      {error && <p className="v2-gaming-results-feedback v2-inline-error" role="alert">{error}</p>}
      {estimate && <div className={`v2-gaming-results-content${loading || error ? " is-hidden" : ""}`}
        aria-hidden={loading || Boolean(error)}>
      <div className="v2-gaming-summary">
        <article><span>Game AAA · mục tiêu 60 FPS</span>
          <strong key={`aaa-${estimateRevision}`} className="v2-gaming-fps-value">
            {estimate.aaa.gamesMeetingTarget}<small> / {estimate.aaa.totalGames}</small>
          </strong>
          <b>{estimate.aaa.status}</b>
        </article>
        <article><span>Game eSports · mục tiêu 100 FPS</span>
          <strong key={`esports-${estimateRevision}`} className="v2-gaming-fps-value">
            {estimate.esports.gamesMeetingTarget}<small> / {estimate.esports.totalGames}</small>
          </strong>
          <b>{estimate.esports.status}</b>
        </article>
      </div>
      <div className="v2-gaming-featured">
        {featuredGames.map((game) => <article className="v2-gaming-featured-card" key={game.gameId}>
          <span aria-hidden="true">{game.name.slice(0, 2).toUpperCase()}</span>
          <div><small>{game.category === "AAA" ? "GAME AAA" : "ESPORTS & ONLINE"}</small>
            <strong>{game.name}</strong></div>
          <b key={`${game.gameId}-${estimateRevision}`} className="v2-gaming-fps-value">
            {game.estimatedFps} FPS
          </b>
        </article>)}
      </div>
      <div className="v2-gaming-list-heading">
        <h3>Danh sách {games.length} tựa game</h3>
        <span>{resolution} · {qualityOptions.find((item) => item.value === quality)?.label}</span>
      </div>
      <div className="v2-gaming-game-columns">
        {["AAA", "ESPORTS"].map((category) => <section key={category}>
          <h4>{category === "AAA" ? "Game AAA" : "eSports / Online"}</h4>
          {(expanded ? games.filter((game) => game.category === category)
            : games.filter((game) => game.category === category).slice(0, 4))
              .map(renderGame)}
        </section>)}
      </div>
      <button className="v2-gaming-expand" type="button" aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}>
        {expanded ? "Thu gọn danh sách" : `Xem ${games.length} game`}
      </button>
      </div>}
      {!loading && !estimate && !error && <p className="v2-gaming-results-feedback" role="status">
        Chưa có dữ liệu hiệu năng cho cấu hình này.
      </p>}
    </div>
  </section>;
}

function upgradeGroupOrder(groupCode: string, displayName: string): number {
  const label = `${groupCode} ${displayName}`.toLocaleLowerCase("vi");
  if (/\b(gpu|graphics|vga)\b|card|đồ họa/.test(label)) return 0;
  if (/\b(ssd|storage)\b|lưu trữ|ổ cứng/.test(label)) return 1;
  if (/\bram\b|bộ nhớ/.test(label)) return 2;
  if (/cooler|cooling|tản nhiệt/.test(label)) return 7;
  if (/\bcpu\b|processor|vi xử lý/.test(label)) return 3;
  if (/\b(psu|power supply)\b|nguồn/.test(label)) return 4;
  if (/motherboard|mainboard|bo mạch chủ/.test(label)) return 5;
  if (/\bcase\b|vỏ máy|vỏ case/.test(label)) return 6;
  return 8;
}

export function ProductPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const modelCode = params.get("modelCode")?.trim() ?? "";
  const { codes, toggle } = useComparison();
  const [product, setProduct] = useState<CatalogProduct>();
  const [loading, setLoading] = useState(Boolean(modelCode));
  const [error, setError] = useState<string>();
  const [actionMessage, setActionMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [upgradeConfiguration, setUpgradeConfiguration] = useState<PublicUpgradeConfiguration>();
  const [upgradeChoices, setUpgradeChoices] = useState<Record<string, { optionId: string; quantity: number }>>({});
  const [selectedBundles, setSelectedBundles] = useState<Record<string, string[]>>({});
  const [selectedRelatedOfferIds, setSelectedRelatedOfferIds] = useState<string[]>([]);
  const [accessoryRecommendations, setAccessoryRecommendations] = useState<AccessoryRecommendation[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, string>>({});
  const [accessoryLoading, setAccessoryLoading] = useState(false);
  const [accessoryError, setAccessoryError] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const [relatedRestoreError, setRelatedRestoreError] = useState("");
  const [resetUpgradeNotice, setResetUpgradeNotice] = useState("");
  const [expandedUpgradeGroups, setExpandedUpgradeGroups] = useState<Record<string, boolean>>({});
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
        setSelectedOfferId(customerVisibleOffers(response.data.offers)[0]?.offerId ?? "");
      },
      (reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải sản phẩm.");
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [modelCode]);
  useEffect(() => {
    if (!product || product.productType !== "PC" || !selectedOfferId) {
      setUpgradeConfiguration(undefined);
      setUpgradeChoices({});
      setSelectedBundles({});
      setSelectedRelatedOfferIds([]);
      return;
    }
    const controller = new AbortController();
    setUpgradeLoading(true);
    setUpgradeError("");
    setRelatedRestoreError("");
    void fetchProductUpgrades(product.modelCode, selectedOfferId, controller.signal).then(
      (configuration) => {
        setUpgradeConfiguration(configuration);
        const defaults = configuration.groups.flatMap((group) => {
          const option = group.options.find((item) => item.defaultOption) ?? group.options[0];
          return option ? [[group.groupId, {
            optionId: option.optionId,
            quantity: option.minimumQuantity,
          }] as const] : [];
        });
        setUpgradeChoices(Object.fromEntries(defaults));
        setSelectedBundles({});
        setSelectedRelatedOfferIds([]);
        if (configuration.relatedProducts.length > 0) {
          void fetchCart().then(
            (cart) => {
              if (!controller.signal.aborted) {
                const cartOfferIds = new Set(cart.items.map((item) => item.offerId));
                setSelectedRelatedOfferIds(configuration.relatedProducts
                  .filter((item) => cartOfferIds.has(item.offerId))
                  .map((item) => item.offerId));
              }
            },
            (reason: unknown) => {
              if (!controller.signal.aborted) {
                setRelatedRestoreError(reason instanceof Error
                  ? reason.message
                  : "Không thể khôi phục lựa chọn sản phẩm liên quan từ giỏ hàng.");
              }
            },
          );
        }
      },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setUpgradeError(reason instanceof Error ? reason.message : "Không thể tải lựa chọn nâng cấp.");
        }
      },
    ).finally(() => {
      if (!controller.signal.aborted) setUpgradeLoading(false);
    });
    return () => controller.abort();
  }, [product, selectedOfferId]);
  useEffect(() => {
    if (!product || product.productType !== "PC") {
      setAccessoryRecommendations([]);
      setSelectedAccessories({});
      setAccessoryError("");
      setAccessoryLoading(false);
      return;
    }
    const controller = new AbortController();
    setAccessoryLoading(true);
    setAccessoryError("");
    setSelectedAccessories({});
    void fetchCatalogProducts({
        page: 1,
        limit: 100,
        type: "ACCESSORY",
        sort: "name",
        order: "asc",
      }, controller.signal).then((page) => {
      const products = page.data
        .filter((candidate) => customerVisibleOffers(candidate.offers)
          .some((candidateOffer) => canPurchaseOffer(candidateOffer, 1)))
        .sort((left, right) => {
          const leftSpecificSpecs = Object.keys(left.specifications)
            .some((code) => accessoryTypes.some((type) => code.startsWith(`${type}_`)));
          const rightSpecificSpecs = Object.keys(right.specifications)
            .some((code) => accessoryTypes.some((type) => code.startsWith(`${type}_`)));
          return Number(rightSpecificSpecs) - Number(leftSpecificSpecs)
            || Number(right.featured) - Number(left.featured)
            || (left.displayOrder ?? 0) - (right.displayOrder ?? 0)
            || left.productName.localeCompare(right.productName);
        });
      const uniqueProducts: CatalogProduct[] = [];
      const seenProductNames = new Set<string>();
      for (const candidate of products) {
        const name = normalizedProductName(candidate.productName);
        if (seenProductNames.has(name)) continue;
        seenProductNames.add(name);
        uniqueProducts.push(candidate);
      }
      const recommendations = accessoryTypes.flatMap((type) => {
        const match = uniqueProducts.find((candidate) => isAccessoryType(candidate, type));
        return match ? [{ type, product: match }] : [];
      });
      if (!controller.signal.aborted) {
        setAccessoryRecommendations(recommendations);
      }
    }, (reason: unknown) => {
      if (!controller.signal.aborted) {
        setAccessoryError(reason instanceof Error
          ? reason.message
          : "Không thể tải phụ kiện phù hợp từ danh mục.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setAccessoryLoading(false);
    });
    return () => controller.abort();
  }, [product]);
  if (!modelCode) return <div className="v2-page"><EmptyState title="Chưa chọn sản phẩm" message="Mở chi tiết từ danh mục sản phẩm." action={<Link to="/customer/parts">Tìm sản phẩm</Link>} /></div>;
  if (loading) return <div className="v2-page"><LoadingState message="Đang tải chi tiết sản phẩm…" /></div>;
  if (error) return <div className="v2-page"><ErrorState title="Không thể tải sản phẩm" message={error} /></div>;
  if (!product) return null;
  const offers = customerVisibleOffers(product.offers);
  const offer = offers.find((item) => item.offerId === selectedOfferId) ?? offers[0];
  const description = productDescription(product);
  const shortDescription = customerVisibleCopy(product.shortDescription);
  const hasConfiguredUpgrades = Boolean(upgradeConfiguration
    && (upgradeConfiguration.groups.length > 0
      || upgradeConfiguration.bundles.length > 0
      || upgradeConfiguration.relatedProducts.length > 0));
  const descriptionWithoutBomSummary = product.productType === "PC"
    ? copyWithoutBomSummary(description)
    : description;
  const displayedDescription = product.productType === "PC" && !hasConfiguredUpgrades
    ? copyWithoutUnsupportedUpgradeClaims(descriptionWithoutBomSummary)
    : descriptionWithoutBomSummary;
  const displayedShortDescription = product.productType === "PC" && !hasConfiguredUpgrades
    ? copyWithoutUnsupportedUpgradeClaims(shortDescription)
    : shortDescription;
  const isCompared = codes.includes(product.modelCode);
  const selectedUpgradeDelta = (upgradeConfiguration?.groups ?? []).reduce((total, group) => {
    const choice = upgradeChoices[group.groupId];
    return total + (group.options.find((item) => item.optionId === choice?.optionId)?.priceDifference ?? 0);
  }, 0);
  const selectedBundleValue = (upgradeConfiguration?.bundles ?? []).reduce((total, bundle) => {
    if (!(bundle.bundleId in selectedBundles)) return total;
    const selectedIds = new Set(selectedBundles[bundle.bundleId] ?? []);
    const items = bundle.items.filter((item) =>
      item.required || item.defaultSelected || selectedIds.has(item.offerId));
    const itemSubtotal = items.reduce((sum, item) => sum + item.price, 0);
    const discount = bundle.discountType === "PERCENTAGE"
      ? itemSubtotal * bundle.discountValue / 100
      : Math.min(itemSubtotal, bundle.discountValue);
    return total + itemSubtotal - discount;
  }, 0);
  const selectedRelatedSubtotal = (upgradeConfiguration?.relatedProducts ?? [])
    .filter((item) => selectedRelatedOfferIds.includes(item.offerId))
    .reduce((total, item) => total + item.price, 0);
  const selectedAccessoryItems = accessoryRecommendations.flatMap((accessory) => {
    const offerId = selectedAccessories[accessory.product.productId];
    if (!offerId) return [];
    const accessoryOffer = customerVisibleOffers(accessory.product.offers)
      .find((candidate) => candidate.offerId === offerId);
    return accessoryOffer ? [{ product: accessory.product, offer: accessoryOffer }] : [];
  });
  const selectedAccessorySubtotal = selectedAccessoryItems.reduce(
    (total, item) => total + Number(item.offer.price),
    0,
  );
  const orderedUpgradeGroups = (upgradeConfiguration?.groups ?? [])
    .map((group, index) => ({ group, index }))
    .sort((left, right) =>
      upgradeGroupOrder(left.group.groupCode, left.group.displayName)
        - upgradeGroupOrder(right.group.groupCode, right.group.displayName)
        || left.group.displayOrder - right.group.displayOrder
        || left.index - right.index)
    .map(({ group }) => group);
  const configuredProductPrice = offer
    ? Math.max(0, Number(offer.price) + selectedUpgradeDelta)
      + selectedBundleValue + selectedRelatedSubtotal + selectedAccessorySubtotal
    : 0;
  const configuredBom = bomWithSelectedUpgrades(product.bomComponents, upgradeConfiguration, upgradeChoices);
  const hasDiscreteGpu = configuredBom.some((component) => component.productType.toUpperCase() === "GPU");
  const resetUpgrades = () => {
    if (!upgradeConfiguration) return;
    const defaults = upgradeConfiguration.groups.flatMap((group) => {
      const option = group.options.find((item) => item.defaultOption) ?? group.options[0];
      return option ? [[group.groupId, {
        optionId: option.optionId,
        quantity: option.minimumQuantity,
      }] as const] : [];
    });
    setUpgradeChoices(Object.fromEntries(defaults));
    setSelectedBundles({});
    setSelectedRelatedOfferIds([]);
    setResetUpgradeNotice("Đã khôi phục cấu hình nâng cấp mặc định.");
  };
  const addSelectedOffer = async (goToCheckout = false) => {
    if (!canPurchaseOffer(offer, Number(quantity))) {
      setActionMessage("Sản phẩm hiện không đủ điều kiện hoặc không còn đủ hàng để đặt.");
      return;
    }
    const requestedQuantity = Number(quantity);
    if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1) {
      setActionMessage("Nhập số lượng hợp lệ.");
      return;
    }
    if (!offer) {
      setActionMessage("Sản phẩm hiện chưa có lựa chọn mua phù hợp.");
      return;
    }
    const selectedRelatedProducts = (upgradeConfiguration?.relatedProducts ?? [])
      .filter((item) => selectedRelatedOfferIds.includes(item.offerId));
    if (selectedRelatedProducts.some((item) => item.availableQuantity < requestedQuantity)) {
      setActionMessage("Một sản phẩm liên quan đã hết hàng hoặc không đủ số lượng.");
      return;
    }
    if (selectedAccessoryItems.some((item) => item.offer.availableQuantity < requestedQuantity)) {
      setActionMessage("Một phụ kiện đã chọn không đủ hàng cho số lượng PC.");
      return;
    }
    setAddingToCart(true);
    try {
      await addCartItem(offer.offerId, requestedQuantity);
      if (product.productType === "PC" && offer.condition === "NEW") {
        await updateCartItemConfiguration(
          offer.offerId,
          Object.entries(upgradeChoices).map(([groupId, choice]) => ({
            groupId,
            optionId: choice.optionId,
            quantity: choice.quantity,
          })),
          Object.entries(selectedBundles)
            .filter(([, offerIds]) => offerIds.length > 0)
            .map(([bundleId, offerIds]) => ({ bundleId, offerIds })),
        );
      }
      for (const related of selectedRelatedProducts) {
        await addCartItem(related.offerId, requestedQuantity);
      }
      for (const accessory of selectedAccessoryItems) {
        await addCartItem(accessory.offer.offerId, requestedQuantity);
      }
      setActionMessage(selectedRelatedProducts.length + selectedAccessoryItems.length > 0
        ? `Đã thêm PC và ${selectedRelatedProducts.length + selectedAccessoryItems.length} sản phẩm liên quan vào giỏ hàng.`
        : "Đã thêm vào giỏ hàng.");
      if (goToCheckout) navigate("/customer/checkout");
    } catch (reason) {
      setActionMessage(reason instanceof Error ? reason.message : "Không thể thêm sản phẩm vào giỏ.");
    } finally {
      setAddingToCart(false);
    }
  };
  return (
    <div className="v2-page">
      <nav className="v2-breadcrumb"><Link to="/customer/home">Trang chủ</Link><span>/</span><Link to="/customer/parts">Linh kiện</Link><span>/</span><span>{product.productName}</span></nav>
      {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
      <div className="v2-product-detail">
        <div className="v2-product-media-column">
          <ProductImageGallery key={product.productId} product={product} />
          {product.productType === "PC" && <section className="v2-pc-accessory-cross-sell"
            aria-labelledby="pc-accessory-heading">
            <header>
              <div>
                <p className="v2-eyebrow">Hoàn thiện góc máy</p>
                <h2 id="pc-accessory-heading">HOÀN THIỆN GÓC MÁY</h2>
              </div>
              <span>{selectedAccessoryItems.length} đã chọn</span>
            </header>
            {accessoryLoading && <LoadingState message="Đang tìm phụ kiện từ danh mục…" />}
            {accessoryError && <p className="v2-inline-error" role="alert">{accessoryError}</p>}
            {!accessoryLoading && !accessoryError && accessoryRecommendations.length === 0
              && <p className="v2-muted">Chưa có phụ kiện phù hợp đang bán.</p>}
            {accessoryRecommendations.length > 0 && <div className="v2-pc-accessory-grid">
              {accessoryRecommendations.map(({ type, product: accessory }) => {
                const accessoryOffer = customerVisibleOffers(accessory.offers).find((candidate) =>
                  canPurchaseOffer(candidate, 1));
                const checked = Boolean(selectedAccessories[accessory.productId]);
                return <article className={`v2-pc-accessory-card${checked ? " is-selected" : ""}`}
                  key={accessory.productId}>
                  <Link className="v2-pc-accessory-image"
                    to={`/customer/product?modelCode=${encodeURIComponent(accessory.modelCode)}`}
                    aria-label={`Xem ${accessory.productName}`}>
                    <ProductArtwork image={productCoverImage(accessory)}
                      productName={accessory.productName} productType={accessory.productType} />
                  </Link>
                  <div className="v2-pc-accessory-info">
                    <span className="v2-pc-accessory-type">{accessoryTypeLabels[type]}</span>
                    <Link to={`/customer/product?modelCode=${encodeURIComponent(accessory.modelCode)}`}>
                      {accessory.productName}
                    </Link>
                    {accessoryOffer
                      ? <strong>{money(accessoryOffer.price, accessoryOffer.currency)}</strong>
                      : <span className="v2-muted">Chưa có giá bán</span>}
                    <SpecificationHighlights productType={accessory.productType}
                      specifications={accessory.specifications} definitions={definitions} limit={2} />
                    {accessoryOffer && <WarrantyDisplay months={accessoryOffer.warrantyMonths} />}
                    <label className="v2-pc-accessory-select">
                      <input type="checkbox"
                        checked={checked}
                        disabled={!accessoryOffer || (!checked
                          && accessoryOffer.availableQuantity < Number(quantity))}
                        onChange={(event) => setSelectedAccessories((current) => {
                          const next = { ...current };
                          if (event.target.checked && accessoryOffer) {
                            next[accessory.productId] = accessoryOffer.offerId;
                          } else delete next[accessory.productId];
                          return next;
                        })} />
                      {checked ? "Đã chọn" : "Chọn phụ kiện"}
                    </label>
                  </div>
                </article>;
              })}
            </div>}
            <div className="v2-pc-accessory-totals" aria-live="polite">
              <span>{selectedAccessoryItems.length} phụ kiện · {money(selectedAccessorySubtotal, offer?.currency ?? "VND")}</span>
              {offer && <strong>Tổng PC + phụ kiện: {money(configuredProductPrice, offer.currency)}</strong>}
              <small>Sản phẩm được thêm riêng vào giỏ hàng cùng cấu hình PC đã chọn.</small>
            </div>
          </section>}
        </div>
        <section className="v2-detail-info">
          <p className="v2-eyebrow">{product.brandName ?? "Chưa có thương hiệu"} · {productTypeLabel(product.productType)}</p>
          <h1>{product.productName}</h1>
          <p className="v2-mono">Mã model: {product.modelCode}</p>
          {displayedShortDescription && product.modelCode !== "PBC-PC-GAME-002" && <p>{displayedShortDescription}</p>}
          {displayedDescription && <p>{displayedDescription}</p>}
          {product.productType === "PC" && <PCComponentChecklist components={configuredBom} />}
          <ProductOfferPanel
            offers={offers}
            selectedOfferId={offer?.offerId}
            onSelect={(nextOffer) => setSelectedOfferId(nextOffer.offerId)}
          />
          {product.productType === "PC" && offer?.condition === "NEW" && upgradeError
            && <p className="v2-inline-error" role="alert">{upgradeError}</p>}
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
            <SecondaryButton type="button" disabled={addingToCart || upgradeLoading || Boolean(upgradeError) || !canPurchaseOffer(offer, Number(quantity))} onClick={() => void addSelectedOffer()}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.4L21 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="20" r="1.5" fill="currentColor" />
                <circle cx="18" cy="20" r="1.5" fill="currentColor" />
              </svg>
              {addingToCart ? "Đang thêm…" : "Thêm vào giỏ"}
            </SecondaryButton>
            <PrimaryButton type="button" disabled={addingToCart || upgradeLoading || Boolean(upgradeError) || !canPurchaseOffer(offer, Number(quantity))} onClick={() => void addSelectedOffer(true)}>
              {addingToCart ? "Đang thêm…" : "Mua ngay"}
            </PrimaryButton>
            <SecondaryButton type="button" aria-pressed={isCompared} className={isCompared ? "is-selected" : ""} onClick={() => toggle(product)}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M8 4H4v16h4M16 4h4v16h-4M8 8h8M8 12h8M8 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              So sánh
            </SecondaryButton>
          </div>
          {actionMessage && <p className="v2-muted" role="status">{actionMessage}</p>}
        </section>
      </div>
      {product.productType === "PC" && offer?.condition === "NEW"
        && upgradeConfiguration
        && (upgradeConfiguration.groups.length > 0
          || upgradeConfiguration.bundles.length > 0
          || upgradeConfiguration.relatedProducts.length > 0) && (
        <section className="v2-pc-upgrade-choices" aria-labelledby="pc-upgrade-heading">
          <header className="v2-pc-upgrade-heading">
            <h2 id="pc-upgrade-heading"><span aria-hidden="true">↗</span> NÂNG CẤP LINH KIỆN</h2>
            {(upgradeConfiguration.groups.length > 0)
              && <SecondaryButton type="button" onClick={resetUpgrades}>Khôi phục mặc định</SecondaryButton>}
          </header>
          {upgradeLoading && <LoadingState message="Đang tải nâng cấp và gói sản phẩm…" />}
          {upgradeError && <p className="v2-inline-error" role="alert">{upgradeError}</p>}
          {relatedRestoreError && <p className="v2-inline-error" role="alert">{relatedRestoreError}</p>}
          {resetUpgradeNotice && <p className="v2-muted" role="status">{resetUpgradeNotice}</p>}
          {orderedUpgradeGroups.length > 0 && <div className="v2-pc-upgrade-groups">
            {orderedUpgradeGroups.map((group) => {
              const isExpanded = Boolean(expandedUpgradeGroups[group.groupId]);
              const selectedOption = group.options.find(
                (item) => item.optionId === upgradeChoices[group.groupId]?.optionId,
              ) ?? group.options.find((item) => item.defaultOption);
              let visibleOptions = isExpanded ? group.options : group.options.slice(0, 4);
              if (!isExpanded && selectedOption
                  && !visibleOptions.some((item) => item.optionId === selectedOption.optionId)) {
                visibleOptions = [...visibleOptions.slice(0, 3), selectedOption];
              }
              const hiddenOptionCount = group.options.length - visibleOptions.length;
              return <article className="v2-pc-upgrade-group" key={group.groupId}>
                <h3>{group.displayName}{group.required ? <small> · Bắt buộc</small> : ""}</h3>
                <div className="v2-pc-upgrade-options">
                  {visibleOptions.map((option) => {
                    const selected = upgradeChoices[group.groupId]?.optionId === option.optionId;
                    const unavailable = option.availableQuantity < Number(quantity);
                    const deltaText = option.priceDifference > 0
                      ? `+${money(option.priceDifference, offer.currency)}`
                      : option.priceDifference < 0
                        ? `−${money(Math.abs(option.priceDifference), offer.currency)}`
                        : "Không đổi giá";
                    return <button className={`v2-pc-upgrade-option${selected ? " is-selected" : ""}`}
                      key={option.optionId} type="button" aria-pressed={selected}
                      disabled={unavailable}
                      onClick={() => {
                        setUpgradeChoices((current) => ({
                          ...current,
                          [group.groupId]: {
                            optionId: option.optionId,
                            quantity: Math.max(option.minimumQuantity,
                              Math.min(option.maximumQuantity,
                                current[group.groupId]?.quantity ?? option.minimumQuantity)),
                          },
                        }));
                        setResetUpgradeNotice("");
                      }}>
                      <span className="v2-pc-upgrade-option-check" aria-hidden="true">{selected ? "✓" : ""}</span>
                      <strong>{option.displayName}</strong>
                      <span>{option.productName}</span>
                      <small className="v2-mono">{option.modelCode}</small>
                      {option.description && <small>{option.description}</small>}
                      <b>{deltaText}</b>
                      {unavailable && <small>Không đủ hàng cho số lượng đã chọn</small>}
                    </button>;
                  })}
                </div>
                {group.options.length > 4 && <button
                  className="v2-pc-upgrade-expand"
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedUpgradeGroups((current) => ({
                    ...current,
                    [group.groupId]: !isExpanded,
                  }))}>
                  {isExpanded ? "Thu gọn" : `Xem thêm (${hiddenOptionCount})`}
                </button>}
                {group.description && <p className="v2-muted">{group.description}</p>}
              </article>;
            })}
          </div>}
          {upgradeConfiguration.bundles.map((bundle) => {
            const bundleSelected = bundle.bundleId in selectedBundles;
            const chosen = new Set(selectedBundles[bundle.bundleId] ?? []);
            return <Card key={bundle.bundleId} title={bundle.name}
              description={bundle.description ?? undefined}>
              <label className="v2-checkbox-row">
                <input type="checkbox" checked={bundleSelected}
                  onChange={(event) => setSelectedBundles((current) => {
                    const next = { ...current };
                    if (event.target.checked) {
                      next[bundle.bundleId] = bundle.items
                        .filter((item) => item.required || item.defaultSelected)
                        .map((item) => item.offerId);
                    } else delete next[bundle.bundleId];
                    return next;
                  })} />
                Thêm gói này vào PC
              </label>
              {bundleSelected && bundle.items.map((item) => (
                <label className="v2-checkbox-row" key={item.offerId}>
                  <input type="checkbox"
                    checked={item.required || item.defaultSelected || chosen.has(item.offerId)}
                    disabled={item.required || item.defaultSelected
                      || item.availableQuantity < Number(quantity)}
                    onChange={(event) => setSelectedBundles((current) => {
                      const next = new Set(current[bundle.bundleId] ?? []);
                      if (event.target.checked) next.add(item.offerId);
                      else next.delete(item.offerId);
                      return { ...current, [bundle.bundleId]: [...next] };
                    })} />
                  {item.productName} · {money(item.price, item.currency)}
                  {item.required && " · Bắt buộc"}
                </label>
              ))}
              {bundle.discountValue > 0 && <p className="v2-muted">
                Ưu đãi gói: {bundle.discountType === "PERCENTAGE"
                  ? `${bundle.discountValue}%`
                  : money(bundle.discountValue, offer.currency)}
              </p>}
            </Card>;
          })}
          {(upgradeConfiguration.relatedProducts.length > 0) && (
            <div className="v2-pc-upgrade-related">
              <h3>Sản phẩm liên quan (tùy chọn)</h3>
              {upgradeConfiguration.relatedProducts.map((item) => {
                const selected = selectedRelatedOfferIds.includes(item.offerId);
                return <label className="v2-checkbox-row" key={item.offerId}>
                  <input type="checkbox" checked={selected}
                    disabled={!selected && item.availableQuantity < Number(quantity)}
                    onChange={(event) => setSelectedRelatedOfferIds((current) =>
                      event.target.checked
                        ? [...current, item.offerId]
                        : current.filter((offerId) => offerId !== item.offerId))} />
                  {item.productName} · {money(item.price, item.currency)}
                  {item.availableQuantity < Number(quantity) && " · Không đủ hàng"}
                </label>;
              })}
              <p className="v2-muted">Sản phẩm đã chọn được thêm riêng vào giỏ hàng theo giá hiện tại.</p>
            </div>
          )}
          <p className="v2-pc-configured-price">
            Tổng dự kiến: <strong>{money(configuredProductPrice, offer.currency)}</strong>
            <span> · Giá cuối cùng được máy chủ xác nhận trong giỏ hàng.</span>
          </p>
        </section>
      )}
      {product.productType === "PC" && offer && hasDiscreteGpu
        ? <GamingPerformancePanel
          product={product}
          offerId={offer.offerId}
          upgrades={Object.entries(upgradeChoices).map(([groupId, choice]) => ({
            groupId,
            optionId: choice.optionId,
            quantity: choice.quantity,
          }))}
        />
        : product.productType === "PC" && offer && (
          <p className="v2-muted" role="status">
            Ước tính FPS chưa khả dụng cho cấu hình chỉ sử dụng đồ họa tích hợp.
          </p>
        )}
      {product.productType === "PC" && <PCConfigurationDetails
        specifications={product.specifications}
        bomComponents={configuredBom}
      />}
      {Array.isArray(product.contentSections) && product.contentSections.length > 0 && <div className="v2-product-content-sections">
        {product.contentSections.map((section, index) => {
          if (typeof section !== "object" || section === null || Array.isArray(section)) return null;
          const item = section as Record<string, unknown>;
          const title = customerVisibleCopy(typeof item.title === "string" ? item.title
            : typeof item.heading === "string" ? item.heading : "");
          const body = customerVisibleCopy(typeof item.body === "string" ? item.body
            : typeof item.text === "string" ? item.text : "");
          if (product.productType === "PC"
              && ["Tổng quan cấu hình", "Thành phần bên trong", "Khả năng nâng cấp",
                "Tóm tắt cấu hình tham khảo"].includes(title ?? "")) return null;
          if (!title && !body) return null;
          return <Card key={`${title}-${index}`} title={title || "Thông tin sản phẩm"}>
            {body && <p>{body}</p>}
          </Card>;
        })}
      </div>}
      {product.images.some((image) => image.mediaType === "VIDEO") && <Card title="Video sản phẩm">
        <div className="v2-form-grid">{product.images.filter((image) => image.mediaType === "VIDEO").map((video) => {
          const caption = customerVisibleCopy(video.caption);
          return <div key={video.url}>
            <video controls preload="metadata" src={video.url} aria-label={caption ?? product.productName} />
            {caption && <p>{caption}</p>}
          </div>;
        })}</div>
      </Card>}
      {(product.productType !== "ACCESSORY"
        || Object.values(product.specifications).some((value) =>
          value !== null && value !== undefined && value !== "")) && (
        <Card title="Thông số kỹ thuật" className="v2-product-specifications-card">
          <TechnicalSpecifications
            productType={product.productType}
            productTypeName={productTypeLabel(product.productType)}
            specifications={product.specifications}
            definitions={definitions}
            verificationMetadata={product.verificationMetadata}
            specificationQuality={product.specificationQuality}
            showEnglishLabels={false}
            showInternalMetadata={false}
          />
        </Card>
      )}
      <RelatedProductsSection product={product} definitions={definitions} />
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
      {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
      {codes.length === 0 && <EmptyState title="Chưa có sản phẩm để so sánh" message="Thêm sản phẩm vào danh sách so sánh từ trang tìm linh kiện." action={<Link to="/customer/parts">Tìm sản phẩm</Link>} />}
      {loading && <LoadingState message="Đang tải thông tin so sánh…" />}
      {error && <ErrorState title="Không thể tải dữ liệu so sánh" message={error} />}
      {products.length > 0 && !compatibleTypes && <div className="v2-cross-type-warning" role="status">
        <h2>Không thể so sánh trực tiếp các loại sản phẩm đã chọn</h2>
        <p>Chỉ các model cùng loại sản phẩm được đặt vào một bảng thông số. Các lựa chọn khác được hiển thị riêng để tránh so sánh những trường không tương đương.</p>
        <div className="v2-cross-type-products">{products.map((product) => <Card key={product.modelCode} title={product.productName} description={`${productTypeLabel(product.productType)} · ${product.modelCode}`}>
          <div className="v2-compare-product-art"><ProductArtwork image={productCoverImage(product)} productName={product.productName} productType={product.productType} /></div>
          <div className="v2-cross-type-actions"><Link to={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}>Mở chi tiết</Link><SecondaryButton type="button" onClick={() => remove(product.modelCode)}>Bỏ khỏi so sánh</SecondaryButton></div>
          <OfferList offers={product.offers} />
          <TechnicalSpecifications productType={product.productType} productTypeName={productTypeLabel(product.productType)} specifications={product.specifications} definitions={definitions} verificationMetadata={product.verificationMetadata} showEnglishLabels={false} showInternalMetadata={false} />
        </Card>)}</div>
      </div>}
      {products.length > 0 && compatibleTypes && <>
        <div className="v2-table-wrap"><table className="v2-table v2-compare-table">
          <thead><tr><th scope="col">Thông tin</th>{products.map((product) => <th key={product.modelCode} scope="col">
            <div className="v2-compare-product-art"><ProductArtwork image={productCoverImage(product)} productName={product.productName} productType={product.productType} /></div>
            <Link to={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}>{product.productName}</Link>
            <span className="v2-mono">{product.modelCode}</span>
            <SecondaryButton type="button" onClick={() => remove(product.modelCode)}>Bỏ sản phẩm</SecondaryButton>
          </th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">Thương hiệu</th>{products.map((product) => <td key={product.modelCode}>{product.brandName ?? "—"}</td>)}</tr>
            <tr><th scope="row">Danh mục</th>{products.map((product) => <td key={product.modelCode}>{productTypeLabel(product.productType)}</td>)}</tr>
            <tr><th scope="row">Ưu đãi · điều kiện · tồn · bảo hành</th>{products.map((product) => <td key={product.modelCode}>
              {customerVisibleOffers(product.offers).length ? <div className="v2-compare-offers">{customerVisibleOffers(product.offers).map((offer) => <div key={offer.offerId}>
                <Badge>{conditionLabel(offer.condition)}</Badge><strong>{money(offer.price, offer.currency)}</strong>
                <span>Số lượng khả dụng: {offer.availableQuantity}</span>
                <WarrantyDisplay months={offer.warrantyMonths} showMissing />
              </div>)}</div> : "Giá bán và tình trạng hàng chưa được cập nhật."}
            </td>)}</tr>
          </tbody>
        </table></div>
        <label className="v2-identical-toggle"><input type="checkbox" checked={hideIdentical} onChange={(event) => setHideIdentical(event.target.checked)} />Ẩn các thông số giống nhau</label>
        <SpecificationComparison products={products} definitions={definitions} hideIdentical={hideIdentical} showEnglishLabels={false} showInternalMetadata={false} />
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
      {result && <div className="v2-table-wrap"><table className="v2-table"><thead><tr><th>Model / mã</th><th>Loại / danh mục / thương hiệu</th><th>Thông số chính</th><th>Ưu đãi · điều kiện · tồn · bảo hành</th><th>Trạng thái / chi tiết</th></tr></thead><tbody>{result.data.map((product) => <tr key={product.productId}>
        <td>{product.productName}<small className="v2-table-subtext v2-mono">{product.modelCode}</small></td>
        <td>{product.productTypeName}<small className="v2-table-subtext">{product.categoryName} · {product.brandName ?? "Chưa có thương hiệu"}</small></td>
        <td><SpecificationHighlights productType={product.productType} specifications={product.specifications} definitions={definitions} limit={4} /></td>
        <td>{product.offers.length
          ? <div className="v2-admin-offer-summaries">{product.offers.map((offer) => <div key={offer.offerId}>
            <Badge>{offer.condition}</Badge><strong>{money(offer.price, offer.currency)}</strong>
            <span>Tồn khả dụng: {offer.availableQuantity}</span>
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
