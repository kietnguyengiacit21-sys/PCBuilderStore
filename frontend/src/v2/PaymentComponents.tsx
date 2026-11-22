import { useEffect, useState } from "react";
import { fetchPaymentOptions } from "../orders-api";
import type { BankTransferAccount, OrderDetail, PaymentOptions } from "../orders-api";
import { money } from "../money";

/** Payment methods the shop offers; COD only until the options load (or if they fail to). */
export function usePaymentOptions(): PaymentOptions {
  const [options, setOptions] = useState<PaymentOptions>({ methods: ["COD"], bankTransfer: null });
  useEffect(() => {
    let active = true;
    void fetchPaymentOptions().then((loaded) => {
      if (active) setOptions(loaded);
    }, () => undefined);
    return () => { active = false; };
  }, []);
  return options;
}

/** VietQR image (napas247 standard) prefilled with amount and the order code as transfer note. */
export function vietQrUrl(account: BankTransferAccount, amount: number, note: string) {
  const params = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: note,
    accountName: account.accountName,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(account.bankBin)}-${encodeURIComponent(account.accountNumber)}-compact2.png?${params.toString()}`;
}

function CopyValue({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="v2-transfer-row">
    <dt>{label}</dt>
    <dd><strong>{display ?? value}</strong>
      <button type="button" onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }, () => undefined);
      }}>{copied ? "Đã chép" : "Chép"}</button>
    </dd>
  </div>;
}

/** Transfer instructions shown while a bank-transfer order is still unpaid. */
export function BankTransferPanel({ orderNumber, amount, currency, account }: {
  orderNumber: string;
  amount: number;
  currency: string;
  account: BankTransferAccount;
}) {
  const [qrFailed, setQrFailed] = useState(false);
  return <section className="v2-transfer-panel" aria-label="Hướng dẫn chuyển khoản">
    <div className="v2-transfer-qr">
      {qrFailed
        ? <p className="v2-muted">Không tải được mã QR. Vui lòng chuyển khoản theo thông tin bên cạnh.</p>
        : <img src={vietQrUrl(account, amount, orderNumber)} alt={`Mã QR chuyển khoản cho đơn ${orderNumber}`}
          width={260} height={260} loading="lazy" onError={() => setQrFailed(true)} />}
      <small>Mở ứng dụng ngân hàng và quét mã để điền sẵn số tiền và nội dung.</small>
    </div>
    <div className="v2-transfer-details">
      <h3>Chuyển khoản để hoàn tất đơn hàng</h3>
      <dl>
        {account.bankName && <div className="v2-transfer-row"><dt>Ngân hàng</dt><dd><strong>{account.bankName}</strong></dd></div>}
        <CopyValue label="Số tài khoản" value={account.accountNumber} />
        <div className="v2-transfer-row"><dt>Chủ tài khoản</dt><dd><strong>{account.accountName}</strong></dd></div>
        <CopyValue label="Số tiền" value={String(Math.round(amount))} display={money(amount, currency)} />
        <CopyValue label="Nội dung chuyển khoản" value={orderNumber} />
      </dl>
      <p className="v2-transfer-note">Vui lòng ghi đúng nội dung <strong>{orderNumber}</strong> để cửa hàng đối soát nhanh.
        Đơn hàng sẽ được xác nhận và giao đi sau khi cửa hàng nhận được tiền (thường trong giờ làm việc).</p>
    </div>
  </section>;
}

/** Renders transfer instructions when this order still waits for a bank transfer. */
export function OrderPaymentInstructions({ detail }: { detail: OrderDetail }) {
  const { bankTransfer } = usePaymentOptions();
  const order = detail.order;
  const waiting = order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus === "UNPAID"
    && order.status !== "CANCELLED" && order.status !== "CANCELLATION_REQUESTED";
  if (!waiting) return null;
  if (!bankTransfer) {
    return <p className="v2-cart-notice">Đơn hàng đang chờ chuyển khoản. Vui lòng liên hệ cửa hàng để nhận thông tin tài khoản.</p>;
  }
  return <BankTransferPanel orderNumber={order.orderNumber} amount={order.total}
    currency={order.currencyCode ?? "VND"} account={bankTransfer} />;
}
