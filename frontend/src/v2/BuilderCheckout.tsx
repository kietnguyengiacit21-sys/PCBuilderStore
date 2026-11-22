import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addCartItem } from "../cart-api";
import { validatePcBuilderCompatibility } from "../catalog-api";
import type { CatalogOffer, CatalogProduct, PcBuilderCompatibilityResult } from "../catalog-api";
import { BUILD_SLOTS } from "./build-planner";
import type { BuildParts } from "./build-planner";
import { Modal, PrimaryButton, SecondaryButton } from "./components";
import { buildShareUrl, saveBuild } from "../builds-api";
import type { SavedBuild } from "../builds-api";

/** A catalog product together with the purchasable offer the builder prices it at. */
export interface Listing { product: CatalogProduct; offer: CatalogOffer }

/** Server-side compatibility check of the whole build plus "add everything to cart". */
export function CompatibilityAndCart({ parts, byCode, issues, resolution, suggestedName }: {
  parts: BuildParts;
  byCode: Map<string, Listing>;
  issues: string[];
  resolution?: string;
  suggestedName?: string;
}) {
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
      <SaveBuildButton parts={parts} resolution={resolution} suggestedName={suggestedName} disabled={!listings.length} />
      {cartNotice && <p className="v2-inline-success" role="status">{cartNotice} <Link to="/customer/cart">Xem giỏ hàng →</Link></p>}
      {cartError && <p className="v2-inline-error" role="alert">{cartError}</p>}
    </div>
  </section>;
}

/** Saves the build server-side and shows a share link to the printable quotation page. */
function SaveBuildButton({ parts, resolution, suggestedName, disabled }: {
  parts: BuildParts;
  resolution?: string;
  suggestedName?: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedBuild>();
  const [copied, setCopied] = useState(false);

  const save = () => {
    setBusy(true);
    setError("");
    const items = BUILD_SLOTS.flatMap((slot) => parts[slot] ? [{ slot, modelCode: parts[slot]!.modelCode }] : []);
    void saveBuild({ name: name.trim() || suggestedName || "Cấu hình PC", resolution, items })
      .then(setSaved, (reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể lưu cấu hình."))
      .finally(() => setBusy(false));
  };
  const link = saved ? buildShareUrl(saved.shareCode) : "";
  return <>
    <SecondaryButton type="button" disabled={disabled} onClick={() => {
      setOpen(true); setSaved(undefined); setError(""); setCopied(false); setName(suggestedName ?? "");
    }}>💾 Lưu, chia sẻ hoặc in báo giá</SecondaryButton>
    <Modal open={open} onClose={() => setOpen(false)} title={saved ? "Đã lưu cấu hình" : "Lưu cấu hình"}
      footer={saved ? <>
        <SecondaryButton type="button" onClick={() => setOpen(false)}>Đóng</SecondaryButton>
        <Link className="v2-button v2-button-primary" to={`/build-pc/saved?code=${encodeURIComponent(saved.shareCode)}`}>Mở trang báo giá →</Link>
      </> : <>
        <SecondaryButton type="button" disabled={busy} onClick={() => setOpen(false)}>Hủy</SecondaryButton>
        <PrimaryButton type="button" disabled={busy} onClick={save}>{busy ? "Đang lưu…" : "Lưu cấu hình"}</PrimaryButton>
      </>}>
      {saved ? <div className="v2-form-stack">
        <p>Ai có đường link dưới đây đều xem được cấu hình và báo giá. Giá được chụp lại tại thời điểm lưu để so sánh khi giá thay đổi.</p>
        <div className="v2-share-link">
          <input className="v2-form-input" readOnly value={link} aria-label="Đường link chia sẻ" onFocus={(event) => event.target.select()} />
          <SecondaryButton type="button" onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => setCopied(true), () => setCopied(false));
          }}>{copied ? "✓ Đã chép" : "Chép link"}</SecondaryButton>
        </div>
      </div> : <div className="v2-form-stack">
        <label className="v2-form-field" htmlFor="save-build-name">
          <span>Tên cấu hình</span>
          <input id="save-build-name" className="v2-form-input" maxLength={120} value={name} placeholder="Ví dụ: PC chơi game 25 triệu"
            onChange={(event) => setName(event.target.value)} />
        </label>
        <p className="v2-muted">Đăng nhập trước khi lưu để cấu hình xuất hiện trong trang Tài khoản của bạn.</p>
        {error && <p className="v2-inline-error" role="alert">{error}</p>}
      </div>}
    </Modal>
  </>;
}
