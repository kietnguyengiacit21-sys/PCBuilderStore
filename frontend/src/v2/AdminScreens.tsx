import { useEffect, useState } from "react";
import {
  confirmOrderPayment,
  confirmOrderRefund,
  decideOrderCancellation,
  fetchAdminOrder,
  fetchAdminOrders,
  retryFailedOrderRefund,
  updateOrderShipping,
  updateOrderStatus,
} from "../orders-api";
import {
  historyActionText,
  label,
  orderStatusText,
  orderTone,
  paymentMethodText,
  paymentStatusText,
  paymentTone,
} from "../order-labels";
import type { OrderDetail, OrderStatus, OrderSummary } from "../orders-api";
import {
  Badge,
  Card,
  ConfirmationModal,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
} from "./components";
import { RoleGate } from "./CustomerScreens";
import { useAuth } from "./auth";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPING", "DELIVERED",
  "CANCELLATION_REQUESTED", "CANCELLED",
];
const nextOrderStatuses: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPING", "CANCELLATION_REQUESTED", "CANCELLED"],
  CONFIRMED: ["PENDING_CONFIRMATION", "PROCESSING", "READY_TO_SHIP", "SHIPPING", "CANCELLATION_REQUESTED", "CANCELLED"],
  PROCESSING: ["PENDING_CONFIRMATION", "CONFIRMED", "READY_TO_SHIP", "SHIPPING", "CANCELLATION_REQUESTED", "CANCELLED"],
  READY_TO_SHIP: ["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "SHIPPING", "CANCELLATION_REQUESTED", "CANCELLED"],
  SHIPPING: ["DELIVERED"],
};

function formatOrderDate(value: string): string {
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value
    : date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Money staff can confirm by hand: a bank transfer that arrived, or COD cash already collected. */
function canConfirmPayment(order: OrderSummary): boolean {
  return (order.paymentMethod === "BANK_TRANSFER" || order.paymentMethod === "COD")
    && ["UNPAID", "FAILED", "PENDING"].includes(order.paymentStatus)
    && order.status !== "CANCELLED" && order.status !== "CANCELLATION_REQUESTED";
}

function formatOrderMoney(value: number, currencyCode: string | null, verified: boolean): string {
  if (!verified || !currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) return "Chưa xác minh";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: currencyCode }).format(value);
  } catch {
    return "Chưa xác minh";
  }
}

export function OrdersManagementPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  // The customer lookup links here with ?q=<order number>.
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  // The dashboard links here with ?status=<order status>.
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">(() =>
    (new URLSearchParams(window.location.search).get("status") ?? "") as OrderStatus | "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<
    "cancelOrder" | "approveCancellation" | "retryRefund" | "confirmPayment" | "confirmRefund" | null
  >(null);

  const reload = async (search = query, status = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      setOrders(await fetchAdminOrders({ q: search.trim(), status }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải đơn hàng.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void reload(query); }, []);

  const openOrder = async (orderNumber: string) => {
    setError("");
    try {
      const detail = await fetchAdminOrder(orderNumber);
      setSelected(detail);
      setSelectedStatus("");
      setNote("");
      setCarrier(detail.order.shippingCarrier);
      setTrackingNumber(detail.order.trackingNumber);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải chi tiết đơn hàng.");
    }
  };

  const applyDetail = (detail: OrderDetail) => {
    setSelected(detail);
    setOrders((current) => current.map((item) =>
      item.orderNumber === detail.order.orderNumber ? detail.order : item));
    setSelectedStatus("");
    setNote("");
  };

  const saveStatus = async (): Promise<boolean> => {
    if (!selected || !selectedStatus) return false;
    setBusy(true);
    setError("");
    try {
      applyDetail(await updateOrderStatus(selected.order.orderNumber, selectedStatus, note));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật trạng thái.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const decideCancellation = async (approve: boolean): Promise<boolean> => {
    if (!selected) return false;
    setBusy(true);
    setError("");
    try {
      applyDetail(await decideOrderCancellation(selected.order.orderNumber, approve, note));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xử lý yêu cầu hủy.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const retryRefund = async (): Promise<boolean> => {
    if (!selected) return false;
    setBusy(true);
    setError("");
    try {
      applyDetail(await retryFailedOrderRefund(
        selected.order.orderNumber, crypto.randomUUID(), note));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thử lại hoàn tiền.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const manualMoney = async (kind: "confirmPayment" | "confirmRefund"): Promise<boolean> => {
    if (!selected) return false;
    setBusy(true);
    setError("");
    try {
      applyDetail(kind === "confirmPayment"
        ? await confirmOrderPayment(selected.order.orderNumber, note)
        : await confirmOrderRefund(selected.order.orderNumber, note));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật thanh toán.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingConfirmation) return;
    if (pendingConfirmation === "cancelOrder") await saveStatus();
    else if (pendingConfirmation === "approveCancellation") await decideCancellation(true);
    else if (pendingConfirmation === "confirmPayment" || pendingConfirmation === "confirmRefund") {
      await manualMoney(pendingConfirmation);
    } else await retryRefund();
    setPendingConfirmation(null);
  };

  const saveShipping = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const detail = await updateOrderShipping(
        selected.order.orderNumber, carrier, trackingNumber, note);
      applyDetail(detail);
      setCarrier(detail.order.shippingCarrier);
      setTrackingNumber(detail.order.trackingNumber);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật thông tin vận chuyển.");
    } finally {
      setBusy(false);
    }
  };

  return <RoleGate audience="staff"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Bán hàng</p><h1>Quản lý đơn hàng</h1></div></div>
    {error && <ErrorState title="Thao tác đơn hàng không thành công" message={error} />}
    <Card title="Đơn hàng" action={<form className="v2-search-form" onSubmit={(event) => {
      event.preventDefault();
      void reload(query);
    }}>
      <select className="v2-form-input" aria-label="Lọc theo trạng thái" value={statusFilter} onChange={(event) => {
        const next = event.target.value as OrderStatus | "";
        setStatusFilter(next);
        void reload(query, next);
      }}>
        <option value="">Mọi trạng thái</option>
        {ORDER_STATUSES.map((status) => <option key={status} value={status}>{orderStatusText[status]}</option>)}
      </select>
      <input className="v2-form-input v2-management-search" placeholder="Tìm mã đơn, tên, email, điện thoại"
        value={query} onChange={(event) => setQuery(event.target.value)} />
      <PrimaryButton type="submit" disabled={loading}>Tìm kiếm</PrimaryButton>
    </form>}>
      {loading && <LoadingState message="Đang tải đơn hàng…" />}
      {!loading && orders.length === 0 && !error && <EmptyState title="Chưa có đơn hàng" message="Không có đơn hàng phù hợp trong dữ liệu đã lưu." />}
      {!loading && orders.length > 0 && <div className="v2-table-wrap"><table className="v2-table">
        <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Trạng thái</th><th>Thanh toán</th><th>Tổng tiền</th><th>Ngày đặt</th><th></th></tr></thead>
        <tbody>{orders.map((order) => <tr key={order.orderNumber}>
          <td className="v2-mono">{order.orderNumber}</td>
          <td>{order.customerName}<small className="v2-table-subtext">{order.customerPhone || order.customerEmail}</small></td>
          <td><Badge tone={orderTone(order.status)}>{label(orderStatusText, order.status)}</Badge></td>
          <td><Badge tone={paymentTone(order.paymentStatus)}>{label(paymentStatusText, order.paymentStatus)}</Badge>
            <small className="v2-table-subtext">{order.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản" : order.paymentMethod === "COD" ? "COD" : label(paymentMethodText, order.paymentMethod)}</small></td>
          <td>{formatOrderMoney(order.total, order.currencyCode, order.showFinancials)}</td>
          <td>{formatOrderDate(order.placedAt)}</td>
          <td><SecondaryButton type="button" onClick={() => void openOrder(order.orderNumber)}>Mở</SecondaryButton></td>
        </tr>)}</tbody>
      </table></div>}
    </Card>
    {selected && <Card title={`Đơn ${selected.order.orderNumber}`}>
      <dl className="v2-profile-grid">
        <div><dt>Khách hàng</dt><dd>{selected.order.customerName} · {selected.order.customerEmail}</dd></div>
        <div><dt>Điện thoại</dt><dd>{selected.order.customerPhone || "—"}</dd></div>
        <div><dt>Trạng thái hiện tại</dt><dd>{label(orderStatusText, selected.order.status)}</dd></div>
        <div><dt>Thanh toán</dt><dd>{label(paymentStatusText, selected.order.paymentStatus)} · {label(paymentMethodText, selected.order.paymentMethod)}</dd></div>
        <div><dt>Địa chỉ giao hàng</dt><dd>{selected.shippingAddress}{selected.shippingRegion ? `, ${selected.shippingRegion}` : ""}{selected.shippingPostalCode ? ` ${selected.shippingPostalCode}` : ""}</dd></div>
        <div><dt>Tổng đơn</dt><dd>{formatOrderMoney(selected.order.total, selected.order.currencyCode, selected.order.showFinancials)}</dd></div>
      </dl>
      <h3>Sản phẩm</h3>
      {selected.items.length > 0 ? <div className="v2-table-wrap"><table className="v2-table">
        <thead><tr><th>Tên</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
        <tbody>{selected.items.map((item, index) => <tr key={`${item.productName}-${index}`}>
          <td>{item.productName}<small className="v2-table-subtext">{item.condition}</small></td>
          <td>{item.quantity}</td>
          <td>{formatOrderMoney(item.unitPrice, item.currencyCode, selected.order.showFinancials)}</td>
          <td>{formatOrderMoney(item.lineTotal, item.currencyCode, selected.order.showFinancials)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="v2-muted">Không có dòng sản phẩm đã xác minh để hiển thị.</p>}
      {!selected.order.showFinancials && <p className="v2-muted">Không thể hiển thị giá trị đơn do thiếu mặt hàng hoặc tiền tệ không nhất quán.</p>}

      {canConfirmPayment(selected.order) && <div className="v2-order-money-action">
        <p>{selected.order.paymentMethod === "BANK_TRANSFER"
          ? `Chờ khách chuyển khoản với nội dung "${selected.order.orderNumber}". Kiểm tra tài khoản ngân hàng rồi xác nhận.`
          : "Đơn thanh toán khi nhận hàng: hệ thống tự ghi nhận đã thu tiền khi đơn chuyển sang Đã giao."}</p>
        <PrimaryButton type="button" disabled={busy} onClick={() => setPendingConfirmation("confirmPayment")}>
          Xác nhận đã nhận tiền
        </PrimaryButton>
      </div>}
      {selected.order.paymentStatus === "REFUND_PENDING" && selected.order.paymentMethod !== "SIMULATED_ONLINE"
        && <div className="v2-order-money-action">
          <p>Đơn đã hủy sau khi khách thanh toán: cần chuyển trả {formatOrderMoney(selected.order.total, selected.order.currencyCode, selected.order.showFinancials)} cho khách.</p>
          {user?.roleCode === "ADMIN"
            ? <PrimaryButton type="button" disabled={busy} onClick={() => setPendingConfirmation("confirmRefund")}>Xác nhận đã hoàn tiền</PrimaryButton>
            : <span className="v2-muted">Báo quản trị viên để hoàn tiền cho khách.</span>}
        </div>}
      {selected.refundRetryAvailable && <div className="v2-action-row">
        <p>Hoàn tiền lần trước thất bại.</p>
        {user?.roleCode === "ADMIN"
          ? <SecondaryButton type="button" disabled={busy} onClick={() => setPendingConfirmation("retryRefund")}>
              Thử lại hoàn tiền
            </SecondaryButton>
          : <span className="v2-muted">Báo Admin để thử lại hoàn tiền.</span>}
      </div>}

      {selected.order.status === "CANCELLATION_REQUESTED" ? <div className="v2-action-row">
        <PrimaryButton type="button" disabled={busy} onClick={() => setPendingConfirmation("approveCancellation")}>Phê duyệt hủy</PrimaryButton>
        <SecondaryButton type="button" disabled={busy} onClick={() => void decideCancellation(false)}>Từ chối yêu cầu</SecondaryButton>
      </div> : (nextOrderStatuses[selected.order.status]?.length ?? 0) > 0 && <div className="v2-action-row">
        <FormField label="Trạng thái tiếp theo" htmlFor="order-next-status">
          <select id="order-next-status" className="v2-form-input" value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as OrderStatus | "")}>
            <option value="">Chọn trạng thái</option>
            {nextOrderStatuses[selected.order.status]?.map((status) => <option key={status} value={status}>{orderStatusText[status]}</option>)}
          </select>
        </FormField>
        <PrimaryButton type="button" disabled={busy || !selectedStatus} onClick={() => {
          if (selectedStatus === "CANCELLED") setPendingConfirmation("cancelOrder");
          else void saveStatus();
        }}>Lưu trạng thái</PrimaryButton>
      </div>}
      <FormField label="Ghi chú thay đổi" htmlFor="order-admin-note">
        <textarea id="order-admin-note" className="v2-form-input" rows={2} maxLength={2000}
          value={note} onChange={(event) => setNote(event.target.value)} />
      </FormField>
      {["READY_TO_SHIP", "SHIPPING", "DELIVERED"].includes(selected.order.status) && <div>
        <h3>Thông tin vận chuyển nhập thủ công</h3>
        <div className="v2-form-grid">
          <FormField label="Đơn vị vận chuyển" htmlFor="order-carrier">
            <input id="order-carrier" className="v2-form-input" maxLength={100} value={carrier}
              onChange={(event) => setCarrier(event.target.value)} />
          </FormField>
          <FormField label="Mã vận đơn" htmlFor="order-tracking">
            <input id="order-tracking" className="v2-form-input" maxLength={180} value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)} />
          </FormField>
        </div>
        <SecondaryButton type="button" disabled={busy} onClick={() => void saveShipping()}>Lưu thông tin vận chuyển</SecondaryButton>
      </div>}
      <h3>Lịch sử trạng thái</h3>
      {selected.statusHistory.length ? <ol className="v2-account-history">{[...selected.statusHistory].reverse().map((entry, index) => <li key={`${entry.createdAt}-${index}`}>
        <strong>{label(historyActionText, entry.action)}{entry.newStatus !== entry.previousStatus
          ? ` · ${label(orderStatusText, entry.previousStatus)} → ${label(orderStatusText, entry.newStatus)}` : ""}</strong>
        <small>{formatOrderDate(entry.createdAt)} · {entry.actorName} ({entry.actorRole === "ADMIN" ? "Quản trị viên" : entry.actorRole === "SALES" ? "Nhân viên" : entry.actorRole === "CUSTOMER" ? "Khách hàng" : entry.actorRole === "GUEST" ? "Khách vãng lai" : entry.actorRole})</small>
        {entry.note && <span>{entry.note}</span>}
      </li>)}</ol> : <p className="v2-muted">Chưa có bản ghi lịch sử.</p>}
    </Card>}
    <ConfirmationModal
      open={pendingConfirmation !== null}
      onClose={() => { if (!busy) setPendingConfirmation(null); }}
      onConfirm={() => void confirmPendingAction()}
      busy={busy}
      title={pendingConfirmation === "retryRefund"
        ? "Xác nhận thử lại hoàn tiền"
        : pendingConfirmation === "approveCancellation"
          ? "Xác nhận phê duyệt hủy đơn"
          : pendingConfirmation === "confirmPayment"
            ? "Xác nhận đã nhận tiền"
            : pendingConfirmation === "confirmRefund"
              ? "Xác nhận đã hoàn tiền"
              : "Xác nhận hủy đơn hàng"}
      message={pendingConfirmation === "retryRefund"
        ? "Bạn có chắc chắn muốn thử lại khoản hoàn tiền bị lỗi? Khoản hoàn tiền đã hoàn tất sẽ không thể thực hiện lại."
        : pendingConfirmation === "approveCancellation"
          ? "Bạn có chắc chắn muốn phê duyệt yêu cầu hủy đơn hàng này? Nếu khách đã thanh toán, đơn sẽ chuyển sang chờ hoàn tiền."
          : pendingConfirmation === "confirmPayment"
            ? "Chỉ xác nhận khi tiền đã thực sự vào tài khoản của cửa hàng (đúng số tiền và nội dung là mã đơn)."
            : pendingConfirmation === "confirmRefund"
              ? "Chỉ xác nhận sau khi đã chuyển trả đủ tiền cho khách."
              : "Bạn có chắc chắn muốn hủy đơn hàng này? Nếu khách đã thanh toán, đơn sẽ chuyển sang chờ hoàn tiền."}
      details={selected ? [
        { label: "Mã đơn hàng", value: selected.order.orderNumber },
        { label: "Số tiền", value: formatOrderMoney(selected.order.total, selected.order.currencyCode, selected.order.showFinancials) },
        { label: "Trạng thái hiện tại", value: label(orderStatusText, selected.order.status) },
        { label: "Thanh toán", value: label(paymentStatusText, selected.order.paymentStatus) },
      ] : []}
      confirmLabel={pendingConfirmation === "retryRefund"
        ? "Xác nhận thử lại"
        : pendingConfirmation === "approveCancellation"
          ? "Xác nhận phê duyệt"
          : pendingConfirmation === "confirmPayment"
            ? "Đã nhận tiền"
            : pendingConfirmation === "confirmRefund"
              ? "Đã hoàn tiền"
              : "Xác nhận hủy đơn"}
    />
  </div></RoleGate>;
}
