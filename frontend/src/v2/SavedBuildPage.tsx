import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { addCartItem } from "../cart-api";
import { buildShareUrl, deleteSavedBuild, fetchSavedBuild } from "../builds-api";
import type { SavedBuild } from "../builds-api";
import { money } from "../money";
import { useAuth } from "./auth";
import { MySavedBuilds } from "./CustomerScreens";
import { Card, ErrorState, FormField, LoadingState, PrimaryButton, SecondaryButton } from "./components";
import { ProductArtwork } from "./storefront-components";

const SLOT_NAME: Record<string, string> = {
  CPU: "Vi xử lý (CPU)", MOTHERBOARD: "Bo mạch chủ", RAM: "Bộ nhớ RAM", GPU: "Card đồ họa (VGA)",
  STORAGE: "Ổ cứng SSD", PSU: "Nguồn", CASE: "Vỏ case", COOLER: "Tản nhiệt CPU",
};

/** Without a code: open a build by its share code, or list the customer's own saved builds. */
function SavedBuildsLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const openCode = (event: FormEvent) => {
    event.preventDefault();
    // Accept a pasted share link as well as the bare code.
    const value = code.trim();
    const fromLink = value.match(/[?&]code=([A-Za-z0-9]+)/)?.[1];
    navigate(`/build-pc/saved?code=${encodeURIComponent(fromLink ?? value)}`);
  };
  return <div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Build PC</p><h1>Cấu hình đã lưu</h1>
      <p>Mở lại cấu hình để xem báo giá mới nhất, in, chia sẻ hoặc thêm cả bộ vào giỏ hàng.</p></div></div>
    <div className="v2-account-grid">
      <Card title="Mở cấu hình bằng mã" description="Mã chia sẻ có trong đường link hoặc trên báo giá đã in.">
        <form className="v2-form-stack" onSubmit={openCode}>
          <FormField label="Mã cấu hình hoặc link chia sẻ" htmlFor="saved-build-code">
            <input className="v2-form-input" id="saved-build-code" required value={code} placeholder="Ví dụ: aB3xK9mPq2"
              onChange={(event) => setCode(event.target.value)} />
          </FormField>
          <PrimaryButton type="submit">Mở cấu hình</PrimaryButton>
        </form>
      </Card>
      {user?.roleCode === "CUSTOMER"
        ? <MySavedBuilds />
        : <Card title="Cấu hình của bạn" description="Cấu hình bạn lưu khi đã đăng nhập sẽ nằm ở đây.">
          <div className="v2-action-row">
            <Link className="v2-button v2-button-primary" to="/login?redirect=%2Fbuild-pc%2Fsaved">Đăng nhập</Link>
            <Link className="v2-button v2-button-secondary" to="/build-pc/start">Build cấu hình mới</Link>
          </div>
        </Card>}
    </div>
  </div>;
}

/** A saved build opened by share code: printable quotation, link sharing, add-to-cart. */
export function SavedBuildPage() {
  const [params] = useSearchParams();
  const code = (params.get("code") ?? "").trim();
  return code ? <SavedBuildQuote key={code} code={code} /> : <SavedBuildsLanding />;
}

function SavedBuildQuote({ code }: { code: string }) {
  const navigate = useNavigate();
  const [build, setBuild] = useState<SavedBuild>();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartMessage, setCartMessage] = useState<{ ok: boolean; text: string }>();

  useEffect(() => {
    const controller = new AbortController();
    setBuild(undefined);
    setError("");
    void fetchSavedBuild(code, controller.signal).then(setBuild, (reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không mở được cấu hình.");
    });
    return () => controller.abort();
  }, [code]);

  if (error) return <div className="v2-page"><ErrorState title="Không tìm thấy cấu hình" message={error} />
    <Link className="v2-button v2-button-primary" to="/build-pc/start">Tự build một cấu hình mới</Link></div>;
  if (!build) return <div className="v2-page"><LoadingState message="Đang mở cấu hình…" /></div>;

  const currency = build.currencyCode ?? "VND";
  const change = build.currentTotal - build.savedTotal;
  const unavailable = build.items.filter((item) => !item.available);
  const addAll = async () => {
    setCartBusy(true);
    setCartMessage(undefined);
    let added = 0;
    const failed: string[] = [];
    for (const item of build.items.filter((entry) => entry.available)) {
      try {
        await addCartItem(item.offerId, item.quantity);
        added++;
      } catch (reason) {
        failed.push(`${item.productName}: ${reason instanceof Error ? reason.message : "không thêm được"}`);
      }
    }
    setCartBusy(false);
    setCartMessage(failed.length
      ? { ok: false, text: `Đã thêm ${added} linh kiện. ${failed.join(" ")}` }
      : { ok: true, text: `Đã thêm ${added} linh kiện vào giỏ hàng.` });
  };

  return <div className="v2-page v2-quote-page">
    <div className="v2-page-title v2-no-print">
      <div>
        <p className="v2-eyebrow">Cấu hình đã lưu · mã {build.shareCode}</p>
        <h1>{build.name}</h1>
        <p>Lưu ngày {new Date(build.createdAt.replace(" ", "T")).toLocaleDateString("vi-VN")} · {build.items.length} linh kiện</p>
      </div>
      <div className="v2-quote-actions">
        <SecondaryButton type="button" onClick={() => window.print()}>🖨 In báo giá</SecondaryButton>
        <SecondaryButton type="button" onClick={() => {
          void navigator.clipboard?.writeText(buildShareUrl(build.shareCode)).then(() => setCopied(true), () => setCopied(false));
        }}>{copied ? "✓ Đã chép link" : "🔗 Chép link chia sẻ"}</SecondaryButton>
        <Link className="v2-button v2-button-secondary" to={`/build-pc/start?load=${encodeURIComponent(build.shareCode)}`}>Mở trong Build PC</Link>
        <PrimaryButton type="button" disabled={cartBusy || unavailable.length === build.items.length} onClick={() => void addAll()}>
          {cartBusy ? "Đang thêm…" : "🛒 Thêm cả cấu hình vào giỏ"}
        </PrimaryButton>
      </div>
    </div>
    {cartMessage && <p className={`${cartMessage.ok ? "v2-inline-success" : "v2-inline-error"} v2-no-print`} role="status">
      {cartMessage.text} {cartMessage.ok && <Link to="/customer/cart">Xem giỏ hàng →</Link>}</p>}
    {unavailable.length > 0 && <p className="v2-inline-error v2-no-print">
      {unavailable.length} linh kiện hiện không đủ hàng: {unavailable.map((item) => item.productName).join(", ")}. Bạn có thể mở trong Build PC để chọn món thay thế.</p>}

    <article className="v2-quote">
      <header className="v2-quote-header">
        <div>
          <strong>PC BUILDER STORE</strong>
          <span>PC lắp sẵn, linh kiện và gaming gear</span>
        </div>
        <div>
          <h2>BÁO GIÁ CẤU HÌNH MÁY TÍNH</h2>
          <span>{build.name} · Mã {build.shareCode}</span>
          <span>Ngày in: {new Date().toLocaleDateString("vi-VN")}</span>
        </div>
      </header>
      <div className="v2-table-wrap">
        <table className="v2-table v2-quote-table">
          <thead><tr>
            <th scope="col">#</th><th scope="col">Linh kiện</th><th scope="col">SL</th>
            <th scope="col">Đơn giá</th><th scope="col">Thành tiền</th>
          </tr></thead>
          <tbody>{build.items.map((item, index) => {
            const unit = item.currentUnitPrice ?? item.savedUnitPrice;
            const moved = item.currentUnitPrice !== null && item.currentUnitPrice !== item.savedUnitPrice;
            return <tr key={item.slot} className={item.available ? undefined : "is-unavailable"}>
              <td>{index + 1}</td>
              <td><div className="v2-quote-item">
                <Link className="v2-quote-image" to={`/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`}>
                  <ProductArtwork image={item.imageUrl ? { url: item.imageUrl, altText: item.productName, isPrimary: true } : undefined}
                    productName={item.productName} productType={item.productType} />
                </Link>
                <div>
                  <small>{SLOT_NAME[item.slot] ?? item.slot}</small>
                  <Link to={`/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`}>{item.productName}</Link>
                  {!item.available && <em>Tạm hết hàng</em>}
                </div>
              </div></td>
              <td>{item.quantity}</td>
              <td className="v2-quote-money">{money(unit, currency)}
                {moved && <small className={item.currentUnitPrice! > item.savedUnitPrice ? "is-up" : "is-down"}>
                  lúc lưu {money(item.savedUnitPrice, currency)}</small>}</td>
              <td className="v2-quote-money"><strong>{money(unit * item.quantity, currency)}</strong></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <footer className="v2-quote-total">
        <div><span>Tổng cộng (giá hiện tại)</span><strong>{money(build.currentTotal, currency)}</strong></div>
        {change !== 0 && <div className={change > 0 ? "is-up" : "is-down"}>
          <span>So với lúc lưu ({money(build.savedTotal, currency)})</span>
          <strong>{change > 0 ? "+" : "−"}{money(Math.abs(change), currency)}</strong>
        </div>}
        <p>Báo giá mang tính tham khảo, giá và tồn kho có thể thay đổi. Giá đã gồm khuyến mãi đang áp dụng tại thời điểm xem.</p>
      </footer>
    </article>

    {build.mine && <p className="v2-no-print v2-quote-owner">
      Cấu hình này thuộc tài khoản của bạn. <button type="button" className="v2-advisor-link" onClick={() => {
        void deleteSavedBuild(build.shareCode).then(() => navigate("/customer/account"), () => undefined);
      }}>Xóa cấu hình</button>
    </p>}
  </div>;
}
