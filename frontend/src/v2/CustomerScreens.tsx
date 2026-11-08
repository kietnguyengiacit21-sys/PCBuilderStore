import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import type { FormEvent, ReactNode } from "react";
import { useAuth } from "./auth";
import {
  fetchProductUpgrades,
} from "../catalog-api";
import type { PublicUpgradeConfiguration } from "../catalog-api";
import {
  fetchCart,
  removeCartItem,
  updateCartItem,
  updateCartItemGifts,
} from "../cart-api";
import type { CartItem, CartResponse, GiftSelection } from "../cart-api";
import {
  createOrder,
  fetchCustomerOrder,
  fetchCustomerOrders,
  processOrderPayment,
  requestOrderCancellation,
} from "../orders-api";
import type { CheckoutRequest, OrderDetail, OrderStatus, OrderSummary } from "../orders-api";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
} from "./components";

function redirectForRole(role: string): string {
  if (role === "ADMIN" || role === "SALES") return "/admin/dashboard";
  if (role === "CUSTOMER") return "/customer/home";
  return "/login";
}

export function RoleGate({ audience, children }: { audience: "customer" | "staff" | "admin"; children: ReactNode }) {
  const { user, loading, error } = useAuth();
  if (loading) return <div className="v2-page"><LoadingState message="Đang khôi phục phiên đăng nhập…" /></div>;
  if (error) return <div className="v2-page"><ErrorState title="Không thể kiểm tra phiên đăng nhập" message={error} /></div>;
  const valid = audience === "staff"
    ? user?.roleCode === "ADMIN" || user?.roleCode === "SALES"
    : audience === "admin" ? user?.roleCode === "ADMIN" : user?.roleCode === "CUSTOMER";
  if (!valid) {
    return <Navigate to={user ? redirectForRole(user.roleCode) : "/login"} replace />;
  }
  return <>{children}</>;
}

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return <div className="v2-theme v2-auth-page"><Card className="v2-auth-card"><LoadingState message="Đang tải…" /></Card></div>;
  }
  if (user) return <Navigate to={redirectForRole(user.roleCode)} replace />;
  return <div className="v2-theme v2-auth-page">
    <Card className="v2-auth-card">
      <p className="v2-eyebrow">PC Builder Store</p>
      <h1>Đăng nhập</h1>
      <p>Đăng nhập vào tài khoản PC Builder Store của bạn.</p>
      <form className="v2-form-stack" onSubmit={(event) => {
        event.preventDefault();
        setError("");
        setSubmitting(true);
        void login(email.trim(), password).then((authenticatedUser) => {
          navigate(redirectForRole(authenticatedUser.roleCode), { replace: true });
        }).catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "Không thể đăng nhập.");
        }).finally(() => setSubmitting(false));
      }}>
        <FormField label="Email" htmlFor="login-email">
          <input className="v2-form-input" id="login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </FormField>
        <FormField label="Mật khẩu" htmlFor="login-password">
          <input className="v2-form-input" id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </FormField>
        {error && <p className="v2-inline-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Đang đăng nhập…" : "Đăng nhập"}</PrimaryButton>
      </form>
    </Card>
  </div>;
}

export function RegisterPage() {
  return <div className="v2-auth-page"><Card className="v2-auth-card">
    <Badge tone="gold">Chưa khả dụng</Badge><p className="v2-eyebrow">Tài khoản khách hàng</p><h1>Tạo tài khoản</h1>
    <p>Đăng ký công khai hiện chưa khả dụng.</p>
    <form className="v2-form-stack" onSubmit={(event) => event.preventDefault()}>
      <FormField label="Họ và tên" htmlFor="register-name"><input className="v2-form-input" id="register-name" disabled placeholder="Nhập họ và tên" /></FormField>
      <FormField label="Email" htmlFor="register-email"><input className="v2-form-input" id="register-email" type="email" disabled placeholder="name@example.com" /></FormField>
      <FormField label="Nhóm khách hàng" htmlFor="register-segment"><select className="v2-form-input" id="register-segment" disabled><option>Chọn nhóm</option><option>IT</option><option>NON_IT</option></select></FormField>
      <PrimaryButton type="button" disabled>Chức năng đăng ký chưa được triển khai</PrimaryButton>
    </form>
    <Link className="v2-auth-link" to="/login">Đã có tài khoản? Đăng nhập</Link>
  </Card></div>;
}

export function CartPage() {
  const { user, loading, error } = useAuth();
  if (loading) return <div className="v2-page"><LoadingState message="Đang kiểm tra phiên đăng nhập…" /></div>;
  if (error) return <div className="v2-page"><ErrorState title="Không thể kiểm tra phiên đăng nhập" message={error} /></div>;
  if (user && user.roleCode !== "CUSTOMER") {
    return <Navigate to={redirectForRole(user.roleCode)} replace />;
  }
  return <CartContents />;
}

function CartContents() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyOfferId, setBusyOfferId] = useState("");
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    void fetchCart().then((result) => {
      if (active) setCart(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không thể tải giỏ hàng.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const items = cart?.items ?? [];
  const oneCurrency = new Set(items.map((item) => item.currency)).size === 1;
  const giftsComplete = items.every((item) => item.gifts.every((gift) =>
    !gift.selectionRequired || item.selectedGifts.some((selected) =>
      selected.promotionId === String(gift.promotionId) && selected.offerId === gift.offerId)));
  const update = async (offerId: string, operation: () => Promise<CartResponse>) => {
    setBusyOfferId(offerId);
    setError("");
    setNotice("");
    try {
      setCart(await operation());
      setNotice("Giỏ hàng đã được cập nhật.");
      setQuantityDrafts((drafts) => {
        const next = { ...drafts };
        delete next[offerId];
        return next;
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật giỏ hàng.");
    } finally {
      setBusyOfferId("");
    }
  };
  return <div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Giỏ hàng</p><h1>Sản phẩm của bạn</h1></div></div>
    {loading && <LoadingState message="Đang tải giỏ hàng…" />}
    {error && <ErrorState title="Không thể tải hoặc cập nhật giỏ hàng" message={error} />}
    {notice && <p className="v2-muted" role="status">{notice}</p>}
    {!loading && !error && !items.length && <EmptyState title="Giỏ hàng đang trống" message="Thêm sản phẩm từ danh mục để tiếp tục." action={<Link to="/customer/parts">Khám phá linh kiện</Link>} />}
    {!loading && items.length > 0 && <div className="v2-commerce-layout">
      <Card title={`${cart?.itemCount ?? 0} sản phẩm`}>
        <div className="v2-cart-items">{items.map((item) => <CartLine
          key={item.offerId}
          item={item}
          quantityDraft={quantityDrafts[item.offerId] ?? String(item.quantity)}
          busy={busyOfferId === item.offerId}
          onQuantityChange={(value) => setQuantityDrafts((drafts) => ({ ...drafts, [item.offerId]: value }))}
          onUpdate={() => {
            const quantity = Number(quantityDrafts[item.offerId] ?? item.quantity);
            if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
              setError("Số lượng phải từ 1 đến 100.");
              return;
            }
            void update(item.offerId, () => updateCartItem(item.offerId, quantity));
          }}
          onRemove={() => void update(item.offerId, () => removeCartItem(item.offerId))}
          onGiftsChange={(gifts) => void update(
            item.offerId,
            () => updateCartItemGifts(item.offerId, gifts),
          )}
        />)}</div>
      </Card>
      <Card title="Mua hàng">
        <p>Đơn giá và tạm tính sử dụng giá hiện được lưu cho sản phẩm.</p>
        {oneCurrency
          ? <strong>Tạm tính giỏ hàng: {formatCartMoney(items.reduce((sum, item) => sum + item.subtotal, 0), items[0].currency)}</strong>
          : <p className="v2-inline-error">Các sản phẩm có nhiều loại tiền tệ; vui lòng tách giao dịch.</p>}
        <div className="v2-action-row">
          <Link className="v2-button v2-button-secondary" to="/customer/parts">Tiếp tục mua sắm</Link>
          {items.every((item) => item.availability === "AVAILABLE") && oneCurrency && giftsComplete
            ? <Link className="v2-button v2-button-primary" to="/customer/checkout">Tiếp tục đặt hàng</Link>
            : <span className="v2-muted">{giftsComplete
              ? "Cập nhật hoặc xóa sản phẩm chưa đủ điều kiện trước khi đặt hàng."
              : "Vui lòng chọn đầy đủ quà tặng bắt buộc trước khi đặt hàng."}</span>}
        </div>
      </Card>
    </div>}
  </div>;
}

function CartLine({
  item,
  quantityDraft,
  busy,
  onQuantityChange,
  onUpdate,
  onRemove,
  onGiftsChange,
}: {
  item: CartItem;
  quantityDraft: string;
  busy: boolean;
  onQuantityChange: (value: string) => void;
  onUpdate: () => void;
  onRemove: () => void;
  onGiftsChange: (gifts: GiftSelection[]) => void;
}) {
  const [upgradeDetails, setUpgradeDetails] = useState<PublicUpgradeConfiguration>();
  useEffect(() => {
    if (!item.configuration) {
      setUpgradeDetails(undefined);
      return;
    }
    const controller = new AbortController();
    void fetchProductUpgrades(item.modelCode, item.offerId, controller.signal).then(
      setUpgradeDetails,
      () => {
        if (!controller.signal.aborted) setUpgradeDetails(undefined);
      },
    );
    return () => controller.abort();
  }, [item.modelCode, item.offerId, item.configuration]);
  const quantityChanged = quantityDraft !== String(item.quantity);
  const isGiftSelected = (gift: CartItem["gifts"][number]) =>
    item.selectedGifts.some((selected) =>
      selected.promotionId === String(gift.promotionId) && selected.offerId === gift.offerId);
  const changeGiftSelection = (gift: CartItem["gifts"][number], checked: boolean) => {
    const current = item.selectedGifts.filter((selected) =>
      selected.promotionId !== String(gift.promotionId) || selected.offerId !== gift.offerId);
    if (checked) current.push({
      promotionId: String(gift.promotionId),
      offerId: gift.offerId,
      quantity: gift.quantity,
    });
    onGiftsChange(current);
  };
  return <div className="v2-cart-item">
    <div>
      <Link to={`/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`}>{item.productName}</Link>
      <span className="v2-mono">{item.modelCode}</span>
      <span className="v2-table-subtext">
        Đơn giá: {formatCartMoney(item.unitPrice, item.currency)} · Tạm tính: {formatCartMoney(item.subtotal, item.currency)}
      </span>
      {item.baseUnitPrice > item.unitPrice && <span className="v2-table-subtext">
        Giá gốc {formatCartMoney(item.baseUnitPrice, item.currency)} · Tiết kiệm {formatCartMoney(item.discountAmount, item.currency)}
      </span>}
      {item.configuration && <div className="v2-cart-configuration">
        <strong>Lựa chọn cấu hình</strong>
        {upgradeDetails?.groups.map((group) => {
          const selection = item.configuration?.upgrades.find((choice) => choice.groupId === group.groupId);
          const option = group.options.find((choice) => choice.optionId === selection?.optionId);
          return option ? <span key={group.groupId}>
            {group.displayName}: {option.displayName} · {option.modelCode} × {selection?.quantity}
          </span> : null;
        })}
        {item.configuration.bundles.map((selection) => {
          const bundle = upgradeDetails?.bundles.find((choice) => choice.bundleId === selection.bundleId);
          const items = bundle?.items.filter((choice) => selection.offerIds.includes(choice.offerId)) ?? [];
          return <span key={selection.bundleId}>
            {bundle?.name ?? "Gói sản phẩm"}: {items.map((choice) => choice.productName).join(", ")}
          </span>;
        })}
        {!upgradeDetails && <span className="v2-muted">Chi tiết nâng cấp hiện không tải được.</span>}
      </div>}
      {item.promotionDisplayCopy && <Badge>{item.promotionDisplayCopy}</Badge>}
      {item.gifts.length > 0 && <fieldset className="v2-cart-gifts">
        <legend>Quà tặng khuyến mãi</legend>
        {item.gifts.map((gift) => {
          const enoughStock = gift.active && gift.availableQuantity >= gift.quantity * item.quantity;
          return <label key={`${gift.promotionId}-${gift.offerId}`} className="v2-cart-gift">
            <input
              type="checkbox"
              checked={isGiftSelected(gift)}
              disabled={busy
                || gift.selectionRequired && isGiftSelected(gift)
                || !enoughStock && !isGiftSelected(gift)}
              onChange={(event) => changeGiftSelection(gift, event.target.checked)}
            />
            <span>{gift.productName} ({gift.modelCode}) × {gift.quantity}
              {gift.selectionRequired ? " · Bắt buộc" : " · Tùy chọn"}
              {!enoughStock ? " · Tạm hết hàng" : ""}
            </span>
          </label>;
        })}
      </fieldset>}
      <span className="v2-table-subtext">Còn {item.availableQuantity} sản phẩm</span>
      {item.availability !== "AVAILABLE" && <p className="v2-inline-error" role="status">{item.availabilityMessage}</p>}
    </div>
    <label>Số lượng
      <input
        className="v2-form-input"
        type="number"
        min="1"
        max="100"
        value={quantityDraft}
        disabled={busy}
        onChange={(event) => onQuantityChange(event.target.value)}
      />
    </label>
    <div className="v2-action-row">
      <SecondaryButton type="button" disabled={busy || !quantityChanged} onClick={onUpdate}>
        {busy ? "Đang lưu…" : "Cập nhật"}
      </SecondaryButton>
      <SecondaryButton type="button" disabled={busy} onClick={onRemove}>Xóa</SecondaryButton>
    </div>
  </div>;
}

function formatCartMoney(value: number, currency: string): string {
  if (!Number.isFinite(value) || !/^[A-Z]{3}$/.test(currency)) return "Chưa xác minh";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(value);
  } catch {
    return "Chưa xác minh";
  }
}

export function CheckoutPage() {
  return <RoleGate audience="customer"><CheckoutContents /></RoleGate>;
}

function CheckoutContents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CheckoutRequest["paymentMethod"]>("COD");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const items = cart?.items ?? [];
  const cartPurchasable = items.length > 0
    && items.every((item) => item.availability === "AVAILABLE")
    && items.every((item) => item.gifts.every((gift) =>
      !gift.selectionRequired || item.selectedGifts.some((selected) =>
        selected.promotionId === String(gift.promotionId) && selected.offerId === gift.offerId)))
    && new Set(items.map((item) => item.currency)).size === 1;
  useEffect(() => {
    if (user && !name) setName(user.fullName);
  }, [name, user]);
  useEffect(() => {
    let active = true;
    void fetchCart().then((result) => {
      if (active) setCart(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không thể tải giỏ hàng.");
    }).finally(() => {
      if (active) setLoadingCart(false);
    });
    return () => { active = false; };
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!cartPurchasable) {
      setError("Hãy cập nhật hoặc xóa sản phẩm chưa đủ điều kiện trong giỏ hàng.");
      return;
    }
    setBusy(true);
    setError("");
    const checkout: CheckoutRequest = {
      customerName: name.trim(),
      customerPhone: phone.trim(),
      shippingAddress: address.trim(),
      shippingRegion: region.trim(),
      shippingPostalCode: postalCode.trim(),
      paymentMethod,
      items: items.map((item) => ({ offerId: item.offerId, quantity: item.quantity })),
    };
    void createOrder(checkout, idempotencyKey).then((detail) => {
      navigate(`/customer/order-detail?orderNumber=${encodeURIComponent(detail.order.orderNumber)}`);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Không thể tạo đơn hàng.");
    }).finally(() => setBusy(false));
  };
  return <div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Đặt hàng</p><h1>Thông tin giao hàng</h1></div></div>
    {loadingCart && <LoadingState message="Đang tải giỏ hàng…" />}
    {error && <ErrorState title="Không thể tải giỏ hàng" message={error} />}
    {!loadingCart && !cartPurchasable ? <EmptyState title="Giỏ hàng chưa sẵn sàng đặt hàng" message="Hãy kiểm tra tồn kho và chọn đủ quà tặng bắt buộc trong giỏ hàng." action={<Link to="/customer/cart">Quay lại giỏ hàng</Link>} /> : !loadingCart && <Card title="Địa chỉ và phương thức thanh toán">
      <p>Đơn giá, tổng tiền và tồn kho sẽ được máy chủ kiểm tra lại khi đặt hàng.</p>
      <form className="v2-form-stack" onSubmit={submit}>
        <FormField label="Người nhận" htmlFor="checkout-name"><input id="checkout-name" className="v2-form-input" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></FormField>
        <FormField label="Điện thoại" htmlFor="checkout-phone"><input id="checkout-phone" className="v2-form-input" type="tel" required maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} /></FormField>
        <FormField label="Địa chỉ" htmlFor="checkout-address"><textarea id="checkout-address" className="v2-form-input" required maxLength={2000} value={address} onChange={(event) => setAddress(event.target.value)} /></FormField>
        <div className="v2-form-grid">
          <FormField label="Tỉnh/thành" htmlFor="checkout-region"><input id="checkout-region" className="v2-form-input" maxLength={160} value={region} onChange={(event) => setRegion(event.target.value)} /></FormField>
          <FormField label="Mã bưu chính" htmlFor="checkout-postal"><input id="checkout-postal" className="v2-form-input" maxLength={30} value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></FormField>
        </div>
        <FormField label="Thanh toán" htmlFor="checkout-payment"><select id="checkout-payment" className="v2-form-input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as CheckoutRequest["paymentMethod"])}>
          <option value="COD">Thanh toán khi nhận hàng</option>
          <option value="SIMULATED_ONLINE">Thanh toán trực tuyến mô phỏng</option>
        </select></FormField>
        {error && <p className="v2-inline-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" disabled={busy || !cartPurchasable}>{busy ? "Đang kiểm tra và đặt hàng…" : "Tạo đơn hàng"}</PrimaryButton>
      </form>
    </Card>}
  </div>;
}

export function OrderResultPage() {
  return <div className="v2-page">
    <Card title="Đơn hàng">
      <p>Đơn hàng được lưu trong tài khoản sau khi máy chủ xác nhận đặt hàng.</p>
      <div className="v2-action-row"><Link className="v2-button v2-button-primary" to="/customer/orders">Xem lịch sử đơn hàng</Link>
        <Link className="v2-button v2-button-secondary" to="/customer/home">Tiếp tục mua sắm</Link></div>
    </Card>
  </div>;
}

export function AccountPage() {
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <RoleGate audience="customer"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Hồ sơ khách hàng</p><h1>Tài khoản của tôi</h1></div><Badge tone="success">Phiên đã xác thực</Badge></div>
    <Card title="Thông tin tài khoản" action={<PrimaryButton type="button" disabled={busy} onClick={() => {
      setBusy(true); setError("");
      void logout().then(() => window.location.assign("/login")).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể đăng xuất.")).finally(() => setBusy(false));
    }}>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</PrimaryButton>}>
      <dl className="v2-profile-grid"><div><dt>Họ tên</dt><dd>{user?.fullName}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Vai trò</dt><dd>{user?.roleCode}</dd></div><div><dt>Nhóm khách hàng</dt><dd>{user?.customerSegment ?? "Chưa cung cấp"}</dd></div></dl>
      {error && <p className="v2-inline-error" role="alert">{error}</p>}
    </Card>
    <Link to="/customer/orders">Lịch sử đơn hàng →</Link>
  </div></RoleGate>;
}

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetchCustomerOrders().then((result) => {
      if (active) setOrders(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không thể tải lịch sử đơn hàng.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  return <RoleGate audience="customer"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Tài khoản</p><h1>Lịch sử đơn hàng</h1></div></div>
    {loading && <LoadingState message="Đang tải đơn hàng…" />}
    {error && <ErrorState title="Không thể tải lịch sử đơn hàng" message={error} />}
    {!loading && !error && !orders.length && <EmptyState
      title="Chưa có đơn hàng"
      message="Các đơn hàng đã đặt sẽ hiển thị tại đây."
      action={<Link to="/customer/parts">Tiếp tục mua sắm</Link>}
    />}
    {!loading && !error && orders.map((order) => <Card
      key={order.orderNumber}
      title={order.orderNumber}
      action={<Link to={`/customer/order-detail?orderNumber=${encodeURIComponent(order.orderNumber)}`}>Chi tiết →</Link>}
    >
      <dl className="v2-profile-grid">
        <div><dt>Trạng thái đơn hàng</dt><dd>{orderStatusLabel[order.status]}</dd></div>
        <div><dt>Thanh toán</dt><dd>{order.paymentStatus || "Chưa ghi nhận"}</dd></div>
        <div><dt>Ngày đặt</dt><dd>{formatOrderDate(order.placedAt)}</dd></div>
        <div><dt>Tổng đơn</dt><dd>{formatOrderMoney(order.total, order.currencyCode, order.showFinancials)}</dd></div>
      </dl>
    </Card>)}
  </div></RoleGate>;
}

export function OrderDetailPage() {
  const [params] = useSearchParams();
  const orderNumber = params.get("orderNumber") ?? "";
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!orderNumber) {
      setError("Order number is missing.");
      setLoading(false);
      return () => { active = false; };
    }
    void fetchCustomerOrder(orderNumber).then((result) => {
      if (active) setDetail(result);
    }).catch((problem: unknown) => {
      if (active) setError(problem instanceof Error ? problem.message : "Không thể tải đơn hàng.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderNumber]);

  const submitCancellation = () => {
    setBusy(true);
    setError("");
    void requestOrderCancellation(orderNumber, reason.trim()).then(setDetail).then(() => setReason("")).catch(
      (problem: unknown) => setError(problem instanceof Error ? problem.message : "Không thể gửi yêu cầu hủy."),
    ).finally(() => setBusy(false));
  };
  const submitPayment = () => {
    setBusy(true);
    setError("");
    setPaymentMessage("");
    void processOrderPayment(orderNumber).then((result) => {
      setDetail(result);
      setPaymentMessage(`Kết quả mô phỏng thanh toán: ${result.order.paymentStatus}.`);
    }).catch((problem: unknown) => {
      setError(problem instanceof Error ? problem.message : "Không thể xử lý thanh toán.");
    }).finally(() => setBusy(false));
  };
  const order = detail?.order;
  return <RoleGate audience="customer"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Tài khoản</p><h1>Chi tiết đơn hàng</h1></div><Link to="/customer/orders">← Lịch sử đơn hàng</Link></div>
    {loading && <LoadingState message="Đang tải chi tiết đơn hàng…" />}
    {error && <ErrorState title="Không thể tải đơn hàng" message={error} />}
    {detail && order && <>
      {paymentMessage && <p className="v2-muted" role="status">{paymentMessage}</p>}
      <Card title={`Đơn ${order.orderNumber}`}>
        <dl className="v2-profile-grid">
          <div><dt>Trạng thái đơn hàng</dt><dd>{orderStatusLabel[order.status]}</dd></div>
          <div><dt>Trạng thái thanh toán</dt><dd>{order.paymentStatus || "Chưa ghi nhận"}</dd></div>
          <div><dt>Phương thức thanh toán</dt><dd>{order.paymentMethod || "Chưa ghi nhận"}</dd></div>
          <div><dt>Ngày đặt</dt><dd>{formatOrderDate(order.placedAt)}</dd></div>
          <div><dt>Người nhận</dt><dd>{order.customerName}</dd></div>
          <div><dt>Địa chỉ</dt><dd>{detail.shippingAddress}{detail.shippingRegion ? `, ${detail.shippingRegion}` : ""}{detail.shippingPostalCode ? ` ${detail.shippingPostalCode}` : ""}</dd></div>
          {order.shippingCarrier && <div><dt>Đơn vị vận chuyển</dt><dd>{order.shippingCarrier}</dd></div>}
          {order.trackingNumber && <div><dt>Mã vận đơn</dt><dd>{order.trackingNumber}</dd></div>}
        </dl>
      </Card>
      <Card title="Sản phẩm">
        {detail.items.length ? <div className="v2-table-wrap"><table className="v2-table">
          <thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
          <tbody>{detail.items.map((item, index) => <tr key={`${item.productName}-${index}`}>
            <td>{item.productName}<small className="v2-table-subtext">{item.condition}</small></td>
            <td>{item.quantity}</td>
            <td>{formatOrderMoney(item.unitPrice, item.currencyCode, order.showFinancials)}</td>
            <td>{formatOrderMoney(item.lineTotal, item.currencyCode, order.showFinancials)}</td>
          </tr>)}</tbody>
        </table></div> : <p>Đơn hàng không có dòng sản phẩm.</p>}
        {order.showFinancials && <><p>Tạm tính: {formatOrderMoney(detail.subtotal, order.currencyCode, true)} · Phí giao hàng: {formatOrderMoney(detail.shippingFee, order.currencyCode, true)} · Giảm giá: {formatOrderMoney(detail.discountAmount, order.currencyCode, true)}</p>
        <strong>Tổng đơn: {formatOrderMoney(order.total, order.currencyCode, true)}</strong></>}
        {!order.showFinancials && <p className="v2-muted">Giá trị đơn hàng chưa được xác minh.</p>}
      </Card>
      <Card title="Lịch sử trạng thái">
        {detail.statusHistory.length ? <ol className="v2-status-history">{detail.statusHistory.map((entry, index) => <li key={`${entry.createdAt}-${index}`}>
          <strong>{entry.action}</strong> · {entry.previousStatus ?? "—"} → {entry.newStatus}
          <small className="v2-table-subtext">{formatOrderDate(entry.createdAt)} · {entry.actorName} ({entry.actorRole})</small>
          {entry.note && <p>{entry.note}</p>}
        </li>)}</ol> : <p>Chưa có lịch sử trạng thái.</p>}
      </Card>
      {canRequestCancellation(order.status) && <Card title="Yêu cầu hủy đơn hàng">
        <FormField label="Lý do" htmlFor="cancellation-reason">
          <textarea id="cancellation-reason" className="v2-form-input" rows={3} maxLength={2000}
            value={reason} onChange={(event) => setReason(event.target.value)} />
        </FormField>
        <PrimaryButton type="button" disabled={busy || !reason.trim()} onClick={submitCancellation}>
          {busy ? "Đang gửi…" : "Gửi yêu cầu hủy"}
        </PrimaryButton>
      </Card>}
      {order.paymentMethod === "SIMULATED_ONLINE"
        && ["UNPAID", "FAILED", "CANCELLED"].includes(order.paymentStatus)
        && <Card title="Thanh toán mô phỏng">
        <p>Trạng thái fulfillment không thay đổi khi thanh toán được xử lý.</p>
        <PrimaryButton type="button" disabled={busy} onClick={submitPayment}>
          {busy ? "Đang xử lý…" : "Thử thanh toán"}
        </PrimaryButton>
      </Card>}
    </>}
  </div></RoleGate>;
}

const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  READY_TO_SHIP: "Sẵn sàng giao",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLATION_REQUESTED: "Đang yêu cầu hủy",
  CANCELLED: "Đã hủy",
};

function canRequestCancellation(status: OrderStatus): boolean {
  return ["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "READY_TO_SHIP"].includes(status);
}

function formatOrderDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

function formatOrderMoney(value: number, currencyCode: string | null, verified: boolean): string {
  if (!verified || !currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) return "Chưa xác minh";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: currencyCode }).format(value);
  } catch {
    return "Chưa xác minh";
  }
}
