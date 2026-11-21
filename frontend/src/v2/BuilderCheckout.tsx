import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addCartItem } from "../cart-api";
import { validatePcBuilderCompatibility } from "../catalog-api";
import type { CatalogOffer, CatalogProduct, PcBuilderCompatibilityResult } from "../catalog-api";
import { BUILD_SLOTS } from "./build-planner";
import type { BuildParts } from "./build-planner";
import { PrimaryButton } from "./components";

/** A catalog product together with the purchasable offer the builder prices it at. */
export interface Listing { product: CatalogProduct; offer: CatalogOffer }

/** Server-side compatibility check of the whole build plus "add everything to cart". */
export function CompatibilityAndCart({ parts, byCode, issues }: { parts: BuildParts; byCode: Map<string, Listing>; issues: string[] }) {
  const [result, setResult] = useState<PcBuilderCompatibilityResult>();
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [cartBusy, setCartBusy] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [cartError, setCartError] = useState("");
  const components = useMemo(() => Object.fromEntries(BUILD_SLOTS.flatMap((slot) =>
    parts[slot] ? [[slot, parts[slot]!.modelCode]] : [])), [parts]);
  const key = JSON.stringify(components);

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setCheckError("");
    setCartNotice("");
    setCartError("");
    void validatePcBuilderCompatibility(JSON.parse(key) as Record<string, string>, controller.signal).then(setResult, (reason: unknown) => {
      if (!controller.signal.aborted) {
        setResult(undefined);
        setCheckError(reason instanceof Error ? reason.message : "Không kiểm tra được tương thích.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setChecking(false);
    });
    return () => controller.abort();
  }, [key]);

  const listings = BUILD_SLOTS.flatMap((slot) => {
    const listing = parts[slot] ? byCode.get(parts[slot]!.modelCode) : undefined;
    return listing ? [listing] : [];
  });
  const addAll = async () => {
    setCartBusy(true);
    setCartNotice("");
    setCartError("");
    const failures: string[] = [];
    for (const listing of listings) {
      try {
        await addCartItem(listing.offer.offerId, 1);
      } catch (reason) {
        failures.push(`${listing.product.productName}: ${reason instanceof Error ? reason.message : "không thể thêm"}`);
      }
    }
    setCartBusy(false);
    if (failures.length < listings.length) setCartNotice(`Đã thêm ${listings.length - failures.length}/${listings.length} linh kiện vào giỏ hàng.`);
    if (failures.length) setCartError(failures.join(" "));
  };
  const status = checking ? "pending" : result?.status.toLowerCase() ?? "pending";
  const blocking = issues.length > 0 || result?.status === "INCOMPATIBLE";

  return <section className="v2-advisor-checkout">
    <div className={`v2-advisor-compat is-${status}`}>
      <span aria-hidden="true">{checking ? "…" : result?.status === "INCOMPATIBLE" || issues.length ? "×" : result?.status === "COMPATIBLE" ? "✓" : "!"}</span>
      <div>
        <strong>{checking ? "Đang kiểm tra tương thích…"
          : blocking ? "Có linh kiện không hợp nhau"
            : result?.status === "COMPATIBLE" ? `Tương thích: đạt ${result.checks.filter((check) => check.status === "COMPATIBLE").length} bước kiểm tra`
              : "Cần thêm dữ liệu để xác nhận một vài điểm"}</strong>
        {checkError && <small>{checkError}</small>}
        {issues.map((issue) => <small key={issue}>• {issue}</small>)}
        {result && <details>
          <summary>Xem chi tiết {result.checks.length} bước kiểm tra</summary>
          <ul className="v2-builder-check-list">
            {result.checks.map((check) => <li className={`is-${check.status.toLowerCase()}`} key={check.code}>
              <span aria-hidden="true">{check.status === "COMPATIBLE" ? "✓" : check.status === "INCOMPATIBLE" ? "×" : "!"}</span>
              <div><strong>{check.label}</strong><small>{check.detail}</small></div>
            </li>)}
          </ul>
        </details>}
      </div>
    </div>
    <div className="v2-advisor-cart">
      <PrimaryButton type="button" disabled={!listings.length || cartBusy || blocking} onClick={() => void addAll()}>
        {cartBusy ? "Đang thêm vào giỏ…" : `🛒 Thêm cả cấu hình vào giỏ (${listings.length} linh kiện)`}
      </PrimaryButton>
      {cartNotice && <p className="v2-inline-success" role="status">{cartNotice} <Link to="/customer/cart">Xem giỏ hàng →</Link></p>}
      {cartError && <p className="v2-inline-error" role="alert">{cartError}</p>}
    </div>
  </section>;
}
