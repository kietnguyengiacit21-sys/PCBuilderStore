import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  createStaffAccount,
  fetchAccountHistory,
  fetchDashboard,
  resetAccountPassword,
  searchAccounts,
  setAccountStatus,
  updateStaffAccountRole,
} from "../staff-accounts-api";
import type { AccountEvent, AccountWithPassword, DashboardOverview, StaffAccount } from "../staff-accounts-api";
import { money } from "../money";
import { useAuth } from "./auth";
import {
  Badge,
  Card,
  ConfirmationModal,
  DataTable,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  Modal,
  PrimaryButton,
  SecondaryButton,
} from "./components";
import { RoleGate } from "./CustomerScreens";

const errorText = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback;
const dateTime = (value: string | null | undefined) => value
  ? new Date(value.replace(" ", "T")).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

const ORDER_STATUS: Record<string, string> = {
  PENDING_CONFIRMATION: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", PROCESSING: "Đang xử lý", READY_TO_SHIP: "Sẵn sàng giao",
  SHIPPING: "Đang giao", CANCELLATION_REQUESTED: "Yêu cầu hủy", DELIVERED: "Đã giao", CANCELLED: "Đã hủy",
};
/** Statuses that need someone on the order desk to act. */
const WORK_QUEUE = ["PENDING_CONFIRMATION", "CANCELLATION_REQUESTED", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPING"];

// --- Dashboard ---------------------------------------------------------------------

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverview>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetchDashboard(controller.signal).then(setData, (reason: unknown) => {
      if (!controller.signal.aborted) setError(errorText(reason, "Không thể tải số liệu."));
    });
    return () => controller.abort();
  }, []);
  const isAdmin = user?.roleCode === "ADMIN";

  return <RoleGate audience="staff"><div className="v2-page v2-dashboard">
    <div className="v2-page-title"><div><p className="v2-eyebrow">{isAdmin ? "Quản trị viên" : "Nhân viên bán hàng"}</p><h1>Xin chào, {user?.fullName}</h1></div></div>
    {error && <ErrorState title="Không thể tải bảng điều khiển" message={error} />}
    {!data && !error && <LoadingState message="Đang tải số liệu…" />}
    {data && <>
      <div className="v2-dash-kpis">
        <Kpi label="Doanh thu hôm nay" value={money(data.revenueToday, "VND")} note={`${data.ordersToday} đơn mới hôm nay`} />
        <Kpi label="Doanh thu 30 ngày" value={money(data.revenue30Days, "VND")} note={`${data.orders30Days} đơn (không tính đơn hủy)`} />
        <Kpi label="Giá trị trung bình / đơn" value={money(data.averageOrderValue30Days, "VND")} note="Đơn đã thanh toán hoặc đã giao, 30 ngày" />
        <Kpi label="Khách hàng mới" value={String(data.newCustomers30Days)} note="Đăng ký trong 30 ngày" />
      </div>

      <Card title="Việc cần xử lý" description="Bấm vào một ô để mở danh sách đơn ở trạng thái đó.">
        <div className="v2-dash-queue">
          {WORK_QUEUE.map((status) => <Link key={status} to={`/admin/orders?status=${status}`}
            className={(data.ordersByStatus[status] ?? 0) > 0 && (status === "PENDING_CONFIRMATION" || status === "CANCELLATION_REQUESTED") ? "is-attention" : undefined}>
            <strong>{data.ordersByStatus[status] ?? 0}</strong><span>{ORDER_STATUS[status]}</span>
          </Link>)}
          <Link to="/admin/reviews" className={data.pendingReviews > 0 ? "is-attention" : undefined}>
            <strong>{data.pendingReviews}</strong><span>Đánh giá chờ duyệt</span>
          </Link>
        </div>
      </Card>

      <div className="v2-dash-grid">
        <Card title="Doanh thu 14 ngày gần nhất" description="Đơn đã thanh toán hoặc đã giao, theo ngày đặt.">
          <RevenueChart days={data.revenueByDay} />
        </Card>
        <Card title="Bán chạy 30 ngày">
          {data.topProducts.length ? <ol className="v2-dash-top">{data.topProducts.map((item) => <li key={item.productName}>
            <span>{item.productName}</span><b>{item.quantity} sp</b><small>{money(item.revenue, "VND")}</small>
          </li>)}</ol> : <EmptyState title="Chưa có đơn" message="Sản phẩm bán chạy sẽ hiện ở đây." />}
        </Card>
      </div>

      <div className="v2-dash-grid">
        <Card title="Đơn hàng gần đây" action={<Link to="/admin/orders">Tất cả đơn →</Link>}>
          {data.recentOrders.length ? <DataTable
            rows={data.recentOrders}
            getRowKey={(order) => order.orderNumber}
            columns={[
              { key: "code", header: "Mã đơn", render: (order) => <Link className="v2-mono" to={`/admin/orders?q=${encodeURIComponent(order.orderNumber)}`}>{order.orderNumber.slice(0, 13)}…</Link> },
              { key: "customer", header: "Khách", render: (order) => order.customerName },
              { key: "status", header: "Trạng thái", render: (order) => <Badge>{ORDER_STATUS[order.status] ?? order.status}</Badge> },
              { key: "total", header: "Tổng", render: (order) => money(order.total, "VND") },
            ]} /> : <EmptyState title="Chưa có đơn hàng" message="Đơn mới sẽ hiện ở đây." />}
        </Card>
        <Card title="Sắp hết hàng" description="Còn bằng hoặc dưới ngưỡng cảnh báo của từng sản phẩm.">
          {data.lowStock.length ? <ul className="v2-dash-stock">{data.lowStock.map((item) => <li key={item.modelCode}>
            {isAdmin ? <Link to={`/admin/product-edit?modelCode=${encodeURIComponent(item.modelCode)}`}>{item.productName}</Link> : <span>{item.productName}</span>}
            <b className={item.available === 0 ? "is-out" : undefined}>{item.available === 0 ? "Hết hàng" : `Còn ${item.available}`}</b>
          </li>)}</ul> : <EmptyState title="Đủ hàng" message="Không có sản phẩm nào dưới ngưỡng." />}
        </Card>
      </div>
    </>}
  </div></RoleGate>;
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="v2-dash-kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

/** Single-series bar chart: one hue, bars anchored to the baseline, hover tooltip, table fallback. */
function RevenueChart({ days }: { days: DashboardOverview["revenueByDay"] }) {
  const [hover, setHover] = useState<number>();
  const max = Math.max(1, ...days.map((day) => day.revenue));
  const label = (iso: string) => { const [, month, day] = iso.split("-"); return `${day}/${month}`; };
  const short = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr` : value.toLocaleString("vi-VN");
  const total = days.reduce((sum, day) => sum + day.revenue, 0);
  return <div className="v2-dash-chart">
    <div className="v2-dash-chart-head">
      <strong>{money(total, "VND")}</strong><span>tổng 14 ngày</span>
      {hover !== undefined && <span className="v2-dash-chart-tip" role="status">
        {label(days[hover].day)}: <b>{money(days[hover].revenue, "VND")}</b> · {days[hover].orders} đơn
      </span>}
    </div>
    {total === 0 && <p className="v2-dash-chart-empty">Chưa có doanh thu trong 14 ngày qua.</p>}
    <div className="v2-dash-bars" role="img" aria-label={`Doanh thu theo ngày, cao nhất ${short(max)}`} onMouseLeave={() => setHover(undefined)}>
      {total > 0 && <span className="v2-dash-axis-max" aria-hidden="true">{short(max)}</span>}
      {days.map((day, index) => <button type="button" key={day.day} className={hover === index ? "is-hover" : undefined}
        onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} onBlur={() => setHover(undefined)}
        aria-label={`${label(day.day)}: ${money(day.revenue, "VND")}, ${day.orders} đơn`}>
        <i style={{ height: `${day.revenue > 0 ? Math.max(3, (day.revenue / max) * 100) : 0}%` }} />
        <small>{index % 2 === 1 || index === days.length - 1 ? label(day.day) : ""}</small>
      </button>)}
    </div>
    <details className="v2-dash-table">
      <summary>Xem dạng bảng</summary>
      <table className="v2-table"><thead><tr><th>Ngày</th><th>Doanh thu</th><th>Số đơn</th></tr></thead>
        <tbody>{days.map((day) => <tr key={day.day}><td>{label(day.day)}</td><td>{money(day.revenue, "VND")}</td><td>{day.orders}</td></tr>)}</tbody></table>
    </details>
  </div>;
}

// --- Staff and accounts --------------------------------------------------------------

type RoleTab = "SALES" | "CUSTOMER" | "ADMIN" | "";
const TABS: { value: RoleTab; label: string }[] = [
  { value: "SALES", label: "Nhân viên" }, { value: "CUSTOMER", label: "Khách hàng" }, { value: "ADMIN", label: "Quản trị" }, { value: "", label: "Tất cả" },
];
const ROLE_LABEL: Record<string, string> = { ADMIN: "Quản trị", SALES: "Nhân viên", CUSTOMER: "Khách hàng" };
const EVENT_LABEL: Record<AccountEvent["type"], string> = {
  ROLE_CHANGED: "Đổi vai trò", CREATED: "Tạo tài khoản", LOCKED: "Khóa tài khoản", UNLOCKED: "Mở khóa",
  PASSWORD_RESET_BY_ADMIN: "Admin cấp mật khẩu tạm", PASSWORD_RESET_BY_EMAIL: "Tự đặt lại qua email",
  QUICK_PIN_SET: "Bật/đổi mã PIN đăng nhập nhanh", QUICK_PIN_REMOVED: "Tắt mã PIN đăng nhập nhanh",
};
const roleText = (code: string) => code.split(" -> ").map((part) => ROLE_LABEL[part] ?? part).join(" → ");

export function StaffRolesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<RoleTab>("SALES");
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<{ title: string; result: AccountWithPassword }>();
  const [copied, setCopied] = useState(false);
  const [roleChange, setRoleChange] = useState<StaffAccount>();
  const [locking, setLocking] = useState<StaffAccount>();
  const [lockNote, setLockNote] = useState("");
  const [resetting, setResetting] = useState<StaffAccount>();
  const [history, setHistory] = useState<{ account: StaffAccount; events?: AccountEvent[] }>();

  const reload = (nextTab = tab, nextQuery = query) => {
    setLoading(true);
    setError("");
    return searchAccounts(nextQuery, nextTab).then(setAccounts, (reason: unknown) => setError(errorText(reason, "Không thể tải tài khoản.")))
      .finally(() => setLoading(false));
  };
  useEffect(() => { void reload(tab, query); }, [tab]);

  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError("");
    try {
      await work();
      setNotice(done);
      await reload();
    } catch (reason) {
      setError(errorText(reason, "Thao tác không thành công."));
    } finally {
      setBusy(false);
    }
  };
  const create = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    void createStaffAccount(form).then((result) => {
      setCreating(false);
      setForm({ fullName: "", email: "", phone: "" });
      setCopied(false);
      setSecret({ title: "Đã tạo tài khoản nhân viên", result });
      setTab("SALES");
      return reload("SALES", "");
    }, (reason: unknown) => setFormError(errorText(reason, "Không thể tạo tài khoản."))).finally(() => setBusy(false));
  };
  const openHistory = (account: StaffAccount) => {
    setHistory({ account });
    void fetchAccountHistory(account.userId).then((events) => setHistory({ account, events }),
      (reason: unknown) => { setHistory(undefined); setError(errorText(reason, "Không thể tải lịch sử.")); });
  };

  return <RoleGate audience="admin"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Hệ thống</p><h1>Nhân viên và tài khoản</h1></div>
      <PrimaryButton type="button" onClick={() => { setFormError(""); setCreating(true); }}>+ Tạo tài khoản nhân viên</PrimaryButton></div>
    {notice && <p className="v2-inline-success" role="status">{notice}</p>}
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    <Card>
      <div className="v2-staff-toolbar">
        <div className="v2-admin-tabs" role="tablist" aria-label="Lọc theo vai trò">
          {TABS.map((item) => <button key={item.label} type="button" role="tab" aria-selected={tab === item.value}
            className={tab === item.value ? "is-active" : undefined} onClick={() => setTab(item.value)}>{item.label}</button>)}
        </div>
        <form className="v2-search-form" onSubmit={(event) => { event.preventDefault(); void reload(tab, query); }}>
          <input className="v2-form-input" type="search" value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên, email hoặc số điện thoại" aria-label="Tìm tài khoản" />
          <PrimaryButton type="submit" disabled={loading}>Tìm</PrimaryButton>
        </form>
      </div>
      {loading ? <LoadingState message="Đang tải tài khoản…" /> : <DataTable<StaffAccount>
        rows={accounts}
        getRowKey={(account) => account.userId}
        emptyMessage="Không có tài khoản khớp."
        columns={[
          { key: "who", header: "Tài khoản", render: (account) => <div className="v2-admin-cell"><strong>{account.fullName}</strong><span>{account.email}{account.phone ? ` · ${account.phone}` : ""}</span></div> },
          { key: "role", header: "Vai trò", render: (account) => <Badge tone={account.roleCode === "ADMIN" ? "primary" : account.roleCode === "SALES" ? "gold" : "neutral"}>{ROLE_LABEL[account.roleCode]}</Badge> },
          { key: "status", header: "Trạng thái", render: (account) => <div className="v2-admin-badges">
            <Badge tone={account.accountStatus === "ACTIVE" ? "success" : "error"}>{account.accountStatus === "ACTIVE" ? "Hoạt động" : "Đã khóa"}</Badge>
            {account.mustChangePassword && <Badge tone="warning">Mật khẩu tạm</Badge>}
          </div> },
          { key: "login", header: "Đăng nhập gần nhất", render: (account) => dateTime(account.lastLoginAt) },
          { key: "actions", header: "", className: "v2-admin-actions", render: (account) => {
            const self = account.userId === user?.userId;
            const manageable = account.roleCode !== "ADMIN" && !self;
            return <div className="v2-admin-row-actions">
              {manageable && <SecondaryButton type="button" disabled={busy} onClick={() => setRoleChange(account)}>
                {account.roleCode === "SALES" ? "Thu hồi quyền NV" : "Cấp quyền NV"}</SecondaryButton>}
              {manageable && <SecondaryButton type="button" disabled={busy} onClick={() => {
                if (account.accountStatus === "ACTIVE") { setLockNote(""); setLocking(account); }
                else void act(() => setAccountStatus(account.userId, "ACTIVE", ""), `Đã mở khóa ${account.fullName}.`);
              }}>{account.accountStatus === "ACTIVE" ? "Khóa" : "Mở khóa"}</SecondaryButton>}
              {manageable && <SecondaryButton type="button" disabled={busy} onClick={() => setResetting(account)}>Cấp mật khẩu tạm</SecondaryButton>}
              <SecondaryButton type="button" onClick={() => openHistory(account)}>Lịch sử</SecondaryButton>
              {self && <Link to="/admin/profile">Tài khoản của tôi</Link>}
            </div>;
          } },
        ]} />}
    </Card>

    <Modal open={creating} onClose={() => setCreating(false)} title="Tạo tài khoản nhân viên bán hàng"
      footer={<>
        <SecondaryButton type="button" disabled={busy} onClick={() => setCreating(false)}>Hủy</SecondaryButton>
        <PrimaryButton type="submit" form="create-staff" disabled={busy}>{busy ? "Đang tạo…" : "Tạo tài khoản"}</PrimaryButton>
      </>}>
      <form id="create-staff" className="v2-form-stack" onSubmit={create}>
        <p className="v2-muted">Hệ thống tạo mật khẩu tạm; nhân viên phải đổi sang mật khẩu riêng ở lần đăng nhập đầu tiên.</p>
        <FormField label="Họ và tên" htmlFor="staff-name">
          <input id="staff-name" className="v2-form-input" required minLength={2} maxLength={160} value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
        </FormField>
        <FormField label="Email đăng nhập" htmlFor="staff-email">
          <input id="staff-email" className="v2-form-input" type="email" required maxLength={254} value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        </FormField>
        <FormField label="Số điện thoại (không bắt buộc)" htmlFor="staff-phone">
          <input id="staff-phone" className="v2-form-input" type="tel" maxLength={20} value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
        </FormField>
        {formError && <p className="v2-inline-error" role="alert">{formError}</p>}
      </form>
    </Modal>

    <Modal open={Boolean(secret)} onClose={() => setSecret(undefined)} title={secret?.title ?? ""}
      footer={<PrimaryButton type="button" onClick={() => setSecret(undefined)}>Tôi đã lưu mật khẩu</PrimaryButton>}>
      {secret && <div className="v2-form-stack">
        <p>Gửi thông tin đăng nhập này cho <strong>{secret.result.account.fullName}</strong> qua kênh an toàn. Mật khẩu chỉ hiện <strong>một lần</strong> và phải đổi ở lần đăng nhập tiếp theo.</p>
        <dl className="v2-profile-grid">
          <div><dt>Email đăng nhập</dt><dd>{secret.result.account.email}</dd></div>
          <div><dt>Mật khẩu tạm</dt><dd className="v2-mono v2-temp-password">{secret.result.temporaryPassword}</dd></div>
        </dl>
        <SecondaryButton type="button" onClick={() => {
          void navigator.clipboard?.writeText(`Email: ${secret.result.account.email}\nMật khẩu tạm: ${secret.result.temporaryPassword}`)
            .then(() => setCopied(true), () => setCopied(false));
        }}>{copied ? "✓ Đã chép" : "Chép thông tin đăng nhập"}</SecondaryButton>
      </div>}
    </Modal>

    <ConfirmationModal open={Boolean(roleChange)} onClose={() => setRoleChange(undefined)} busy={busy}
      title={roleChange?.roleCode === "SALES" ? "Thu hồi quyền nhân viên" : "Cấp quyền nhân viên"}
      confirmLabel={roleChange?.roleCode === "SALES" ? "Thu hồi quyền" : "Cấp quyền"}
      message={roleChange?.roleCode === "SALES"
        ? <>Tài khoản <strong>{roleChange?.fullName}</strong> sẽ trở thành khách hàng và mất quyền vào trang quản trị ngay lập tức.</>
        : <>Tài khoản <strong>{roleChange?.fullName}</strong> sẽ được xử lý đơn, tra cứu khách hàng và duyệt đánh giá.</>}
      onConfirm={() => {
        const account = roleChange!;
        setRoleChange(undefined);
        void act(() => updateStaffAccountRole(account.userId, account.roleCode === "SALES" ? "CUSTOMER" : "SALES"),
          `Đã cập nhật vai trò cho ${account.fullName}.`);
      }} />

    <Modal open={Boolean(locking)} onClose={() => setLocking(undefined)} title={`Khóa tài khoản ${locking?.fullName ?? ""}`}
      footer={<>
        <SecondaryButton type="button" disabled={busy} onClick={() => setLocking(undefined)}>Hủy</SecondaryButton>
        <PrimaryButton type="button" disabled={busy} onClick={() => {
          const account = locking!;
          setLocking(undefined);
          void act(() => setAccountStatus(account.userId, "LOCKED", lockNote), `Đã khóa ${account.fullName}.`);
        }}>Khóa tài khoản</PrimaryButton>
      </>}>
      <div className="v2-form-stack">
        <p>Người này bị đăng xuất ngay và không đăng nhập được cho đến khi được mở khóa. Đơn hàng và dữ liệu vẫn giữ nguyên.</p>
        <FormField label="Lý do (lưu vào lịch sử)" htmlFor="lock-note">
          <input id="lock-note" className="v2-form-input" maxLength={500} value={lockNote} onChange={(event) => setLockNote(event.target.value)}
            placeholder="Ví dụ: Nghỉ việc, nghi ngờ lộ mật khẩu…" />
        </FormField>
      </div>
    </Modal>

    <ConfirmationModal open={Boolean(resetting)} onClose={() => setResetting(undefined)} busy={busy}
      title="Cấp mật khẩu tạm" confirmLabel="Cấp mật khẩu tạm"
      message={<>Mật khẩu hiện tại của <strong>{resetting?.fullName}</strong> sẽ ngừng hoạt động. Hệ thống tạo mật khẩu tạm để bạn gửi cho họ.</>}
      onConfirm={() => {
        const account = resetting!;
        setResetting(undefined);
        setBusy(true);
        void resetAccountPassword(account.userId).then((result) => {
          setCopied(false);
          setSecret({ title: "Mật khẩu tạm mới", result });
          return reload();
        }, (reason: unknown) => setError(errorText(reason, "Không thể cấp mật khẩu."))).finally(() => setBusy(false));
      }} />

    <Modal open={Boolean(history)} onClose={() => setHistory(undefined)} title={`Lịch sử: ${history?.account.fullName ?? ""}`}>
      {!history?.events ? <LoadingState message="Đang tải…" /> : history.events.length === 0
        ? <EmptyState title="Chưa có thay đổi" message="Tài khoản này chưa có thao tác quản trị nào." />
        : <ol className="v2-account-history">{history.events.map((event, index) => <li key={index}>
          <strong>{EVENT_LABEL[event.type] ?? event.type}</strong>
          {event.description && <span>{event.type === "ROLE_CHANGED" ? roleText(event.description) : event.description}</span>}
          <small>{dateTime(event.createdAt)}{event.actorEmail ? ` · ${event.actorEmail}` : ""}</small>
        </li>)}</ol>}
    </Modal>
  </div></RoleGate>;
}
