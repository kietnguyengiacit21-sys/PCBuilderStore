import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { FormEvent, ReactNode } from "react";
import { useAuth } from "./auth";
import {
  getCart,
  getOrder,
  getOrders,
  orderTotal,
  saveCart,
  saveOrder,
} from "../demo/demo-store";
import type { DemoCartItem, DemoOrder } from "../demo/demo-store";
import { useCatalogAttributeDefinitions } from "./catalog-metadata";
import {
  SpecificationHighlights,
  TechnicalSpecifications,
  WarrantyDisplay,
} from "./product-information";
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
} from "./components";

const demoLabel = "DỮ LIỆU DEMO — CHƯA ĐƯỢC LƯU VÀO DATABASE";

function redirectForRole(role: string) {
  return role === "ADMIN" || role === "SALES" ? "/admin/dashboard" : "/customer/home";
}

function priceText(value: number | string, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value));
}

function OrderItemInformation({
  item,
  definitions,
}: {
  item: DemoCartItem;
  definitions: ReturnType<typeof useCatalogAttributeDefinitions>["definitions"];
}) {
  return <div className="v2-order-product">
    <div className="v2-order-line">
      <span><Link to={`/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`}>{item.productName}</Link> × {item.quantity}
        <small className="v2-table-subtext v2-mono">{item.modelCode}</small>
        {item.offerCode ? <small className="v2-table-subtext">Offer {item.offerCode} · {item.condition ?? "Điều kiện chưa lưu"}</small> : <small className="v2-table-subtext">Thông tin offer không được lưu trong bản demo cũ.</small>}
      </span>
      <strong>{priceText(Number(item.price) * item.quantity, item.currency)}</strong>
    </div>
    {item.offerCode
      ? <WarrantyDisplay months={item.warrantyMonths} showMissing />
      : <span className="v2-muted">Không có snapshot bảo hành lịch sử.</span>}
    {item.specifications && item.productType && <SpecificationHighlights
      productType={item.productType}
      specifications={item.specifications}
      definitions={definitions}
      limit={4}
    />}
    {item.specifications && item.productType && Object.keys(item.specifications).length > 0 && <details className="v2-order-spec-disclosure">
      <summary>Thông số đã lưu trong giỏ/đơn</summary>
      <TechnicalSpecifications
        productType={item.productType}
        productTypeName={item.productType}
        specifications={item.specifications}
        definitions={definitions}
      />
    </details>}
  </div>;
}

export function RoleGate({ audience, children }: { audience: "customer" | "staff"; children: ReactNode }) {
  const { user, loading, error } = useAuth();
  if (loading) return <div className="v2-page"><LoadingState message="Đang khôi phục phiên đăng nhập…" /></div>;
  if (error) return <div className="v2-page"><ErrorState title="Không thể kiểm tra phiên đăng nhập" message={error} /></div>;
  const valid = audience === "staff" ? user?.roleCode === "ADMIN" || user?.roleCode === "SALES" : user?.roleCode === "CUSTOMER";
  if (!valid) {
    const loginPath = audience === "staff" ? "/admin/login" : "/customer/login";
    return <div className="v2-page"><EmptyState
      title={user ? "Tài khoản không thuộc khu vực này" : "Cần đăng nhập"}
      message={user ? `Tài khoản ${user.email} có vai trò ${user.roleCode}.` : "Đăng nhập để xem thông tin tài khoản."}
      action={<Link to={loginPath}>Đi đến đăng nhập</Link>}
    /></div>;
  }
  return <>{children}</>;
}

export function LoginPage({ audience }: { audience: "customer" | "staff" }) {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const staff = audience === "staff";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) navigate(redirectForRole(user.roleCode), { replace: true });
  }, [loading, navigate, user]);
  return <div className="v2-theme v2-auth-page">
    <Card className="v2-auth-card">
      <Badge tone={staff ? "primary" : "gold"}>{staff ? "STAFF ACCESS" : "CUSTOMER ACCOUNT"}</Badge>
      <p className="v2-eyebrow">{staff ? "Admin / Sales" : "PC Builder Store"}</p>
      <h1>{staff ? "Đăng nhập nhân viên" : "Chào mừng trở lại"}</h1>
      <p>{staff ? "Đăng nhập bằng tài khoản ADMIN hoặc SALES." : "Đăng nhập bằng tài khoản CUSTOMER."}</p>
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
        <FormField label="Email" htmlFor={`${audience}-email`}>
          <input className="v2-form-input" id={`${audience}-email`} type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </FormField>
        <FormField label="Mật khẩu" htmlFor={`${audience}-password`}>
          <div className="v2-password-input"><input className="v2-form-input" id={`${audience}-password`} type={showPassword ? "text" : "password"} autoComplete={staff ? "current-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? "Ẩn" : "Hiện"}</button></div>
        </FormField>
        {error && <p className="v2-inline-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Đang đăng nhập…" : "Đăng nhập"}</PrimaryButton>
      </form>
      <p className="v2-auth-note">Xác thực email và mật khẩu trên máy chủ; phiên đăng nhập dùng cookie HttpOnly.</p>
      {!staff && <p className="v2-auth-link">Chưa có tài khoản? <Link to="/customer/register">Đăng ký (chưa khả dụng)</Link></p>}
      {staff && <Link className="v2-auth-link" to="/customer/home">Quay lại cửa hàng</Link>}
      {!staff && <Link className="v2-auth-link" to="/admin/login">Đăng nhập nhân viên</Link>}
    </Card>
  </div>;
}

export function RegisterPage() {
  return <div className="v2-auth-page"><Card className="v2-auth-card">
    <Badge tone="gold">Chưa triển khai</Badge><p className="v2-eyebrow">Tài khoản khách hàng</p><h1>Tạo tài khoản</h1>
    <p>Đăng ký công khai chưa được kết nối với backend. Biểu mẫu này chỉ là bản xem trước và không tạo tài khoản.</p>
    <form className="v2-form-stack" onSubmit={(event) => event.preventDefault()}>
      <FormField label="Họ và tên" htmlFor="register-name"><input className="v2-form-input" id="register-name" disabled placeholder="Nhập họ và tên" /></FormField>
      <FormField label="Email" htmlFor="register-email"><input className="v2-form-input" id="register-email" type="email" disabled placeholder="name@example.com" /></FormField>
      <FormField label="Nhóm khách hàng" htmlFor="register-segment"><select className="v2-form-input" id="register-segment" disabled><option>Chọn nhóm</option><option>IT</option><option>NON_IT</option></select></FormField>
      <PrimaryButton type="button" disabled>Chức năng đăng ký chưa được triển khai</PrimaryButton>
    </form>
    <Link className="v2-auth-link" to="/customer/login">Đã có tài khoản? Đăng nhập</Link>
  </Card></div>;
}

export function CartPage() {
  const [items, setItems] = useState(getCart);
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  const update = (next: DemoCartItem[]) => { saveCart(next); setItems(next); };
  return <div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Giỏ hàng</p><h1>Sản phẩm của bạn</h1></div><Badge tone="gold">Giỏ demo cục bộ</Badge></div>
    <p className="v2-demo-banner">{demoLabel}</p>
    {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
    {!items.length ? <EmptyState title="Giỏ hàng đang trống" message="Thêm sản phẩm từ danh mục để tiếp tục." action={<Link to="/customer/parts">Khám phá linh kiện</Link>} /> : <div className="v2-commerce-layout">
      <Card title={`${items.length} sản phẩm`}>
        <div className="v2-cart-items">{items.map((item, index) => <div className="v2-cart-item" key={`${item.modelCode}:${item.offerCode ?? "legacy"}:${index}`}>
          <div><Link to={`/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`}>{item.productName}</Link><span className="v2-mono">{item.modelCode}</span>
            <span>{item.offerCode ? `Offer ${item.offerCode} · ${item.condition ?? "Điều kiện chưa lưu"}` : "Offer chưa được lưu trong giỏ cũ"}</span>
            <strong>{priceText(item.price, item.currency)}</strong>
            {item.offerCode ? <WarrantyDisplay months={item.warrantyMonths} showMissing /> : <span className="v2-muted">Snapshot bảo hành chưa được lưu.</span>}
            {item.specifications && item.productType && <SpecificationHighlights productType={item.productType} specifications={item.specifications} definitions={definitions} />}
            {item.specifications && item.productType && Object.keys(item.specifications).length > 0 && <details className="v2-order-spec-disclosure">
              <summary>Xem thông số đã lưu</summary>
              <TechnicalSpecifications productType={item.productType} productTypeName={item.productType} specifications={item.specifications} definitions={definitions} />
            </details>}
          </div>
          <label>Số lượng<input className="v2-form-input" type="number" min="1" value={item.quantity} onChange={(event) => update(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity: Math.max(1, Number(event.target.value) || 1) } : entry))} /></label>
          <SecondaryButton type="button" onClick={() => update(items.filter((_, entryIndex) => entryIndex !== index))}>Xóa</SecondaryButton>
        </div>)}</div>
      </Card>
      <Card title="Tóm tắt đơn hàng"><div className="v2-summary-row"><span>Tạm tính</span><strong>{priceText(orderTotal(items))}</strong></div><p className="v2-muted">Phí giao hàng chưa được tính trong bản demo.</p><div className="v2-summary-total"><span>Tổng tạm tính</span><strong>{priceText(orderTotal(items))}</strong></div><Link className="v2-button v2-button-primary" to="/customer/checkout">Tiếp tục thanh toán</Link></Card>
    </div>}
  </div>;
}

export function CheckoutPage() {
  const [items] = useState(getCart);
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD (mô phỏng)");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Vui lòng nhập họ tên, số điện thoại và địa chỉ giao hàng.");
      return;
    }
    if (!/^[+()\d\s.-]{8,20}$/.test(phone.trim())) {
      setError("Số điện thoại chưa đúng định dạng.");
      return;
    }
    if (!items.length) {
      setError("Giỏ hàng đang trống.");
      return;
    }
    if (simulateFailure) {
      navigate("/customer/order-result?result=failed");
      return;
    }
    const order: DemoOrder = {
      orderCode: `DEMO-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customerName: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      paymentMethod,
      paymentStatus: "SIMULATED",
      status: "DEMO_RECEIVED",
      items,
      total: String(orderTotal(items)),
    };
    saveOrder(order);
    saveCart([]);
    navigate(`/customer/order-result?orderCode=${encodeURIComponent(order.orderCode)}`);
  };
  return <div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Thanh toán demo</p><h1>Thông tin giao hàng</h1></div><Badge tone="gold">Thanh toán mô phỏng</Badge></div>
    <p className="v2-demo-banner">{demoLabel}</p>
    {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
    {!items.length ? <EmptyState title="Không có sản phẩm để thanh toán" message="Thêm sản phẩm vào giỏ hàng trước." action={<Link to="/customer/parts">Tìm linh kiện</Link>} /> : <form className="v2-commerce-layout" onSubmit={submit}>
      <Card title="Người nhận" description="Cho phép thanh toán với tư cách khách.">
        {user?.roleCode === "CUSTOMER" && <p className="v2-muted">Đang đăng nhập: {user.fullName} · Bạn vẫn có thể chỉnh thông tin giao hàng.</p>}
        <div className="v2-form-stack">
          <FormField label="Họ và tên" htmlFor="checkout-name"><input className="v2-form-input" id="checkout-name" required value={name} onChange={(event) => setName(event.target.value)} /></FormField>
          <FormField label="Số điện thoại" htmlFor="checkout-phone"><input className="v2-form-input" id="checkout-phone" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} /></FormField>
          <FormField label="Địa chỉ giao hàng" htmlFor="checkout-address"><textarea className="v2-form-input" id="checkout-address" rows={3} required value={address} onChange={(event) => setAddress(event.target.value)} /></FormField>
          <FormField label="Phương thức thanh toán" htmlFor="checkout-payment"><select className="v2-form-input" id="checkout-payment" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>COD (mô phỏng)</option><option>Chuyển khoản (mô phỏng)</option></select></FormField>
          <label className="v2-checkbox"><input type="checkbox" checked={simulateFailure} onChange={(event) => setSimulateFailure(event.target.checked)} />Mô phỏng thanh toán thất bại</label>
          {error && <p className="v2-inline-error" role="alert">{error}</p>}
          <PrimaryButton type="submit">Đặt đơn demo · {priceText(orderTotal(items))}</PrimaryButton>
        </div>
      </Card>
      <Card title="Đơn hàng">{items.map((item, index) => <OrderItemInformation item={item} definitions={definitions} key={`${item.modelCode}:${item.offerCode ?? "legacy"}:${index}`} />)}<div className="v2-summary-total"><span>Tổng</span><strong>{priceText(orderTotal(items))}</strong></div><p className="v2-muted">Không kết nối cổng thanh toán hoặc API tạo đơn.</p></Card>
    </form>}
  </div>;
}

export function OrderResultPage() {
  const [params] = useSearchParams();
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  const order = getOrder(params.get("orderCode"));
  const paymentFailed = params.get("result") === "failed";
  return <div className="v2-page">
    {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
    {paymentFailed ? <Card className="v2-order-result"><Badge tone="error">Thanh toán thất bại (mô phỏng)</Badge><h1>Chưa tạo đơn hàng</h1><p>Giỏ hàng vẫn được giữ nguyên. Không có giao dịch hoặc đơn hàng thật nào được tạo.</p><Link to="/customer/checkout">Thử lại checkout</Link></Card> : order ? <Card className="v2-order-result"><Badge tone="success">Đơn demo đã tạo</Badge><h1>Đặt hàng thành công</h1><p>Đơn này chỉ được lưu trong trình duyệt hiện tại.</p><p className="v2-mono">{order.orderCode}</p><div className="v2-summary-total"><span>Tổng tiền mô phỏng</span><strong>{priceText(order.total)}</strong></div><div className="v2-order-items">{order.items.map((item, index) => <OrderItemInformation item={item} definitions={definitions} key={`${item.modelCode}:${item.offerCode ?? "legacy"}:${index}`} />)}</div><Link to={`/customer/order-detail?orderCode=${encodeURIComponent(order.orderCode)}`}>Xem chi tiết đơn</Link> · <Link to="/customer/orders">Lịch sử đơn hàng</Link></Card> : <EmptyState title="Không tìm thấy đơn demo" message="Trang này chỉ hiển thị sau khi hoàn tất checkout cục bộ." action={<Link to="/customer/cart">Quay lại giỏ hàng</Link>} />}
    <p className="v2-demo-banner">{demoLabel}</p>
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
      void logout().then(() => window.location.assign("/customer/login")).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể đăng xuất.")).finally(() => setBusy(false));
    }}>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</PrimaryButton>}>
      <dl className="v2-profile-grid"><div><dt>Họ tên</dt><dd>{user?.fullName}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Vai trò</dt><dd>{user?.roleCode}</dd></div><div><dt>Nhóm khách hàng</dt><dd>{user?.customerSegment ?? "Chưa cung cấp"}</dd></div></dl>
      {error && <p className="v2-inline-error" role="alert">{error}</p>}
    </Card>
    <p className="v2-demo-banner">{demoLabel}. Địa chỉ, điểm thưởng và lịch sử bảo hành chưa được hỗ trợ.</p>
    <Link to="/customer/orders">Xem đơn demo cục bộ →</Link>
  </div></RoleGate>;
}

export function OrderHistoryPage() {
  const orders = getOrders();
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  return <RoleGate audience="customer"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Tài khoản</p><h1>Lịch sử đơn hàng</h1></div><Badge tone="gold">Trình duyệt hiện tại</Badge></div>
    <p className="v2-demo-banner">{demoLabel}</p>
    {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
    {orders.length ? <DataTable<DemoOrder>
      columns={[
        { key: "code", header: "Mã đơn", render: (order) => <Link className="v2-mono" to={`/customer/order-detail?orderCode=${encodeURIComponent(order.orderCode)}`}>{order.orderCode}</Link> },
        { key: "date", header: "Ngày tạo", render: (order) => new Date(order.createdAt).toLocaleString("vi-VN") },
        { key: "status", header: "Trạng thái", render: (order) => <Badge>{order.status}</Badge> },
        { key: "items", header: "Sản phẩm / thông số", render: (order) => <div className="v2-order-history-products">{order.items.map((item, index) => <div key={`${item.modelCode}:${index}`}><Link to={`/customer/order-detail?orderCode=${encodeURIComponent(order.orderCode)}`}>{item.productName} · {item.offerCode ?? "offer snapshot chưa lưu"}</Link>{item.specifications && item.productType && <SpecificationHighlights productType={item.productType} specifications={item.specifications} definitions={definitions} limit={2} />}</div>)}</div> },
        { key: "warranty", header: "Snapshot bảo hành", render: (order) => {
          const known = order.items.filter((item) => item.offerCode && item.warrantyMonths !== undefined && item.warrantyMonths !== null).length;
          return known ? `${known}/${order.items.length} offer có thời hạn lưu lại` : "Không được lưu";
        } },
        { key: "total", header: "Tổng", render: (order) => priceText(order.total) },
      ]}
      rows={orders} getRowKey={(order) => order.orderCode}
    /> : <EmptyState title="Chưa có đơn hàng demo" message="Đơn hàng hoàn tất từ checkout sẽ xuất hiện trong trình duyệt này." action={<Link to="/customer/parts">Mua sắm</Link>} />}
  </div></RoleGate>;
}

export function OrderDetailPage() {
  const [params] = useSearchParams();
  const order = getOrder(params.get("orderCode"));
  const { definitions, error: definitionsError } = useCatalogAttributeDefinitions();
  return <RoleGate audience="customer"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Lịch sử đơn demo</p><h1>Chi tiết đơn hàng</h1></div><Link to="/customer/orders">← Lịch sử đơn hàng</Link></div>
    <p className="v2-demo-banner">{demoLabel}. Không có theo dõi vận chuyển hoặc lịch sử sửa chữa.</p>
    {definitionsError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thông số: {definitionsError}</p>}
    {order ? <div className="v2-commerce-layout"><Card title={order.orderCode}><dl className="v2-profile-grid"><div><dt>Khách hàng</dt><dd>{order.customerName}</dd></div><div><dt>Điện thoại</dt><dd>{order.phone}</dd></div><div><dt>Địa chỉ</dt><dd>{order.address}</dd></div><div><dt>Thanh toán</dt><dd>{order.paymentMethod} · {order.paymentStatus}</dd></div></dl></Card><Card title="Sản phẩm">{order.items.map((item, index) => <div className="v2-order-product" key={`${item.modelCode}:${item.offerCode ?? "legacy"}:${index}`}>
      <div className="v2-order-line"><span><Link to={`/customer/product?modelCode=${encodeURIComponent(item.modelCode)}`}>{item.productName} × {item.quantity}</Link><small className="v2-table-subtext v2-mono">{item.modelCode}</small></span><strong>{priceText(Number(item.price) * item.quantity, item.currency)}</strong></div>
      {item.offerCode ? <><p className="v2-muted">Offer snapshot: {item.offerCode} · {item.condition ?? "Điều kiện chưa lưu"}{item.isDemo ? " · giá/tồn kho minh họa" : ""}</p><WarrantyDisplay months={item.warrantyMonths} showMissing /></> : <p className="v2-muted">Không có snapshot offer hoặc bảo hành lịch sử cho dòng này; không khôi phục từ offer hiện tại.</p>}
      {item.specifications && item.productType && <SpecificationHighlights productType={item.productType} specifications={item.specifications} definitions={definitions} limit={4} />}
      {item.specifications && item.productType && Object.keys(item.specifications).length > 0 && <details className="v2-order-spec-disclosure">
        <summary>Xem snapshot thông số đã lưu</summary>
        <TechnicalSpecifications productType={item.productType} productTypeName={item.productType} specifications={item.specifications} definitions={definitions} />
      </details>}
    </div>)}<div className="v2-summary-total"><span>Tổng</span><strong>{priceText(order.total)}</strong></div></Card></div> : <EmptyState title="Không tìm thấy đơn demo" message="Chọn một đơn từ lịch sử đơn hàng." action={<Link to="/customer/orders">Lịch sử đơn hàng</Link>} />}
  </div></RoleGate>;
}
