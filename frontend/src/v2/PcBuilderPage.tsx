import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addCartItem } from "../cart-api";
import {
  canPurchaseOffer,
  customerVisibleOffers,
  fetchCatalogFacets,
  fetchCatalogProducts,
  validatePcBuilderCompatibility,
} from "../catalog-api";
import type {
  CatalogOffer,
  CatalogProduct,
  CatalogProductPage,
  PcBuilderCompatibilityResult,
} from "../catalog-api";
import { money } from "../demo/demo-store";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
} from "./components";
import { ProductArtwork, productTypeLabel } from "./storefront-components";

const builderSlots = [
  { key: "CPU", title: "Bộ vi xử lý", types: ["CPU"] },
  { key: "MOTHERBOARD", title: "Bo mạch chủ", types: ["MOTHERBOARD", "MAINBOARD"] },
  { key: "RAM", title: "Bộ nhớ RAM", types: ["RAM"] },
  { key: "GPU", title: "Card đồ họa", types: ["GPU"] },
  { key: "STORAGE", title: "Lưu trữ", types: ["STORAGE"] },
  { key: "PSU", title: "Nguồn máy tính", types: ["PSU"] },
  { key: "CASE", title: "Vỏ máy tính", types: ["CASE"] },
  { key: "COOLER", title: "Tản nhiệt CPU", types: ["COOLER"] },
] as const;

interface BuilderPart {
  product: CatalogProduct;
  offer: CatalogOffer;
}

function purchasablePart(product: CatalogProduct): BuilderPart | undefined {
  const offer = customerVisibleOffers(product.offers).find((candidate) =>
    canPurchaseOffer(candidate, 1),
  );
  return offer ? { product, offer } : undefined;
}

export function PcBuilderPage() {
  const [products, setProducts] = useState<Record<string, CatalogProductPage>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [compatibility, setCompatibility] = useState<PcBuilderCompatibilityResult>();
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [compatibilityError, setCompatibilityError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartBusy, setCartBusy] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogFacets(controller.signal).then(async ({ data: facets }) => {
      const requests = builderSlots.flatMap((slot) => {
        const type = slot.types.find((candidate) =>
          facets.productTypes.some((item) => item.value === candidate),
        );
        return type ? [{ key: slot.key, type }] : [];
      });
      const results = await Promise.all(requests.map(async ({ key, type }) => ({
        key,
        page: await fetchCatalogProducts({
          page: 1,
          limit: 100,
          type,
          sort: "price",
          order: "asc",
        }, controller.signal),
      })));
      if (!controller.signal.aborted) {
        setProducts(Object.fromEntries(results.map(({ key, page }) => [key, page])));
        setError("");
      }
    }, (reason: unknown) => {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : "Không thể tải danh mục linh kiện.");
      }
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : "Không thể tải sản phẩm cấu hình.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const components = Object.fromEntries(
      Object.entries(selected).filter(([, modelCode]) => Boolean(modelCode)),
    );
    if (Object.keys(components).length === 0) {
      setCompatibility(undefined);
      setCompatibilityError("");
      setCompatibilityLoading(false);
      return;
    }
    const controller = new AbortController();
    setCompatibilityLoading(true);
    setCompatibilityError("");
    void validatePcBuilderCompatibility(components, controller.signal).then(
      setCompatibility,
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setCompatibility(undefined);
          setCompatibilityError(reason instanceof Error
            ? reason.message
            : "Không thể kiểm tra tương thích với backend.");
        }
      },
    ).finally(() => {
      if (!controller.signal.aborted) setCompatibilityLoading(false);
    });
    return () => controller.abort();
  }, [selected]);

  const parts = useMemo(() => builderSlots.flatMap((slot) => {
    const code = selected[slot.key];
    const product = products[slot.key]?.data.find((item) => item.modelCode === code);
    const part = product ? purchasablePart(product) : undefined;
    return part ? [{ slot, ...part }] : [];
  }), [products, selected]);
  const total = parts.reduce((sum, part) => sum + Number(part.offer.price), 0);

  const addSelectedPartsToCart = async () => {
    setCartBusy(true);
    setCartNotice("");
    setCartError("");
    let added = 0;
    const failures: string[] = [];
    for (const part of parts) {
      try {
        await addCartItem(part.offer.offerId, 1);
        added += 1;
      } catch (reason) {
        failures.push(`${part.product.productName}: ${reason instanceof Error ? reason.message : "không thể thêm vào giỏ"}`);
      }
    }
    setCartBusy(false);
    if (added > 0) setCartNotice(`Đã thêm ${added}/${parts.length} linh kiện vào giỏ hàng.`);
    if (failures.length > 0) setCartError(failures.join(" "));
  };

  return (
    <div className="v2-page v2-builder-page">
      <div className="v2-page-title">
        <div>
          <p className="v2-eyebrow">Cấu hình linh kiện</p>
          <h1>Xây dựng bộ PC của bạn</h1>
          <p>Chọn linh kiện từ danh mục đang bán và theo dõi tổng giá theo thời gian thực.</p>
        </div>
        <Link to="/customer/parts">Khám phá toàn bộ linh kiện →</Link>
      </div>

      <section className="v2-builder-intro">
        <div>
          <Badge tone="primary">8 nhóm linh kiện</Badge>
          <h2>Cấu hình theo nhu cầu, chọn từ sản phẩm thực</h2>
          <p>Giá và tình trạng hàng được lấy từ danh mục đang bán. Kiểm tra tương thích dựa trên thông số kỹ thuật hiện có.</p>
        </div>
        <div className="v2-builder-progress" aria-label={`${parts.length} trên ${builderSlots.length} nhóm đã chọn`}>
          <strong>{String(parts.length).padStart(2, "0")}<span> / {builderSlots.length}</span></strong>
          <small>nhóm đã chọn</small>
        </div>
      </section>

      {error && <ErrorState title="Không tải được linh kiện" message={error} />}
      {loading && <LoadingState message="Đang tải sản phẩm từ danh mục…" />}

      {!loading && !error && <div className="v2-builder-layout">
        <section className="v2-builder-slots" aria-label="Linh kiện cấu hình">
          {builderSlots.map((slot, index) => {
            const available = (products[slot.key]?.data ?? [])
              .map((product) => ({ product, part: purchasablePart(product) }))
              .filter((entry): entry is { product: CatalogProduct; part: BuilderPart } => Boolean(entry.part));
            const selectedPart = parts.find((part) => part.slot.key === slot.key);
            return <article className={`v2-builder-slot${selectedPart ? " is-selected" : ""}`} key={slot.key}>
              <span className="v2-builder-slot-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="v2-builder-slot-content">
                <div className="v2-builder-slot-heading">
                  <div><p className="v2-eyebrow">{productTypeLabel(slot.types[0])}</p><h2>{slot.title}</h2></div>
                  {selectedPart && <strong>{money(selectedPart.offer.price, selectedPart.offer.currency)}</strong>}
                </div>
                <label className="v2-field">
                  <span className="v2-sr-only">Chọn {slot.title}</span>
                  <select
                    className="v2-form-input"
                    value={selected[slot.key] ?? ""}
                    onChange={(event) => {
                      setSelected((current) => ({ ...current, [slot.key]: event.target.value }));
                      setCartNotice("");
                      setCartError("");
                    }}
                  >
                    <option value="">Chọn {slot.title.toLowerCase()}</option>
                    {available.map(({ product, part }) => <option key={product.modelCode} value={product.modelCode}>
                      {product.productName} · {money(part.offer.price, part.offer.currency)}
                    </option>)}
                  </select>
                </label>
                {available.length === 0 && <p className="v2-muted">Chưa có sản phẩm đang bán trong nhóm này.</p>}
                {selectedPart && <div className="v2-builder-selected">
                  <ProductArtwork
                    image={selectedPart.product.images.find((image) => image.isPrimary) ?? selectedPart.product.images[0]}
                    productName={selectedPart.product.productName}
                    productType={selectedPart.product.productType}
                  />
                  <div>
                    <strong>{selectedPart.product.productName}</strong>
                    <small>{selectedPart.product.brandName ?? "Thương hiệu chưa cập nhật"} · {selectedPart.product.modelCode}</small>
                    <small>Còn {selectedPart.offer.availableQuantity} sản phẩm · {selectedPart.offer.warrantyMonths ?? 0} tháng bảo hành</small>
                  </div>
                  <Link to={`/customer/product?modelCode=${encodeURIComponent(selectedPart.product.modelCode)}`}>Chi tiết</Link>
                </div>}
              </div>
            </article>;
          })}
        </section>

        <aside className="v2-builder-summary">
          <div className="v2-builder-summary-heading"><p className="v2-eyebrow">Tóm tắt cấu hình</p><h2>PC của bạn</h2></div>
          <div className={`v2-builder-compatibility v2-builder-compatibility-${compatibility?.status.toLowerCase() ?? "pending"}`}>
            <div className="v2-builder-compatibility-heading">
              <span className="v2-builder-status-mark" aria-hidden="true">
                {compatibilityLoading ? "…" : compatibility?.status === "COMPATIBLE" ? "✓" : compatibility?.status === "INCOMPATIBLE" ? "×" : "!"}
              </span>
              <div>
                <strong>{compatibilityLoading
                  ? "Đang kiểm tra tương thích…"
                  : compatibility?.status === "COMPATIBLE"
                    ? "Các kiểm tra dữ liệu hiện có đều đạt"
                    : compatibility?.status === "INCOMPATIBLE"
                      ? "Phát hiện thông số không tương thích"
                      : parts.length
                        ? "Cần thêm dữ liệu để xác nhận"
                        : "Chọn linh kiện để kiểm tra"}</strong>
                <small>Đánh giá được trả về từ dịch vụ tương thích backend.</small>
              </div>
            </div>
            {compatibilityError && <p className="v2-inline-error" role="alert">{compatibilityError}</p>}
            {compatibility?.checks.length ? <ul className="v2-builder-check-list">
              {compatibility.checks.map((check) => <li className={`is-${check.status.toLowerCase()}`} key={check.code}>
                <span aria-hidden="true">{check.status === "COMPATIBLE" ? "✓" : check.status === "INCOMPATIBLE" ? "×" : "!"}</span>
                <div><strong>{check.label}</strong><small>{check.detail}</small></div>
              </li>)}
            </ul> : null}
            {compatibility?.warnings.map((warning) => <p className="v2-builder-disclaimer" key={warning}>{warning}</p>)}
          </div>
          <ul className="v2-builder-summary-list">
            {builderSlots.map((slot) => {
              const part = parts.find((item) => item.slot.key === slot.key);
              return <li key={slot.key}>
                <span>{slot.title}</span>
                {part ? <strong>{money(part.offer.price, part.offer.currency)}</strong> : <small>Chưa chọn</small>}
              </li>;
            })}
          </ul>
          <div className="v2-builder-total"><span>Tạm tính</span><strong>{money(total, parts[0]?.offer.currency ?? "VND")}</strong></div>
          <PrimaryButton type="button" disabled={!parts.length || cartBusy} onClick={() => void addSelectedPartsToCart()}>
            {cartBusy ? "Đang thêm vào giỏ…" : `Thêm ${parts.length} linh kiện vào giỏ`}
          </PrimaryButton>
          {cartNotice && <p className="v2-inline-success" role="status">{cartNotice}</p>}
          {cartError && <p className="v2-inline-error" role="alert">{cartError}</p>}
          <SecondaryButton type="button" disabled={!parts.length || cartBusy} onClick={() => {
            setSelected({});
            setCartNotice("");
            setCartError("");
          }}>Xóa cấu hình</SecondaryButton>
          <p className="v2-builder-disclaimer">Tổng giá là tổng các offer đang hiển thị. Hãy kiểm tra khả năng tương thích trước khi mua.</p>
        </aside>
      </div>}

      {!loading && !error && !parts.length && Object.keys(products).length === 0 && <EmptyState
        title="Chưa có linh kiện để cấu hình"
        message="Danh mục chưa trả về nhóm linh kiện phù hợp."
        action={<Link to="/customer/parts">Mở danh mục sản phẩm</Link>}
      />}
    </div>
  );
}
