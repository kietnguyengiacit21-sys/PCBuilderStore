import { useEffect, useId, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { fetchCatalogFacets } from "../catalog-api";
import type { CatalogFacets } from "../catalog-api";
import { useAuth } from "./auth";
import { HeaderSearch } from "./HeaderSearch";
import { MegaMenu } from "./MegaMenu";
import { CONTACT_LINKS, FloatingContact } from "./FloatingContact";
import { ComparisonTray, useComparison } from "./comparison-store";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({
  label,
  className = "",
  type = "button",
  ...props
}: ButtonProps & { label: string }) {
  return (
    <button
      className={`v2-icon-button ${className}`}
      type={type}
      aria-label={label}
      {...props}
    />
  );
}

export function PrimaryButton({ className = "", ...props }: ButtonProps) {
  return <button className={`v2-button v2-button-primary ${className}`} {...props} />;
}

export function SecondaryButton({ className = "", ...props }: ButtonProps) {
  return <button className={`v2-button v2-button-secondary ${className}`} {...props} />;
}

export function ChevronIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      {direction === "previous"
        ? <path d="m15 18-6-6 6-6" />
        : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m18 6-12 12M6 6l12 12" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MinusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "gold" | "success" | "warning" | "error";
}) {
  return <span className={`v2-badge v2-badge-${tone}`}>{children}</span>;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="v2-form-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? (
        <span className="v2-form-error" role="alert">{error}</span>
      ) : hint ? (
        <span className="v2-form-help">{hint}</span>
      ) : null}
    </div>
  );
}

export function SearchInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className={`v2-search-wrap ${className}`}>
      <span className="v2-search-icon" aria-hidden="true">⌕</span>
      <input className="v2-search-input" type="search" {...props} />
    </span>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`v2-card ${className}`}>
      {(title || description || action) && (
        <header className="v2-card-header" data-shared-component="v2-card-header">
          <div>
            {title && <h2 className="v2-card-title">{title}</h2>}
            {description && <p className="v2-card-description">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  className?: string;
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "Không có dữ liệu.",
  className = "",
}: {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row, index: number) => string | number;
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <div className="v2-table-wrap">
      <table className={`v2-table ${className}`}>
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col">{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={getRowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.key} className={column.className}>{column.render(row)}</td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={Math.max(columns.length, 1)}>
                <EmptyState title="Nothing here yet" message={emptyMessage} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [dialog, open]);

  return (
    <dialog
      ref={setDialog}
      className={`v2-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="v2-dialog-inner">
        <div className="v2-dialog-header">
          <h2 className="v2-dialog-title" id={titleId}>{title}</h2>
          <IconButton label="Đóng hộp thoại" onClick={onClose}><CloseIcon /></IconButton>
        </div>
        {children}
        {footer && <div className="v2-dialog-footer">{footer}</div>}
      </div>
    </dialog>
  );
}

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  details = [],
  confirmLabel,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  details?: { label: string; value: ReactNode }[];
  confirmLabel: string;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="v2-confirmation-dialog"
      footer={<>
        <SecondaryButton type="button" disabled={busy} onClick={onClose}>Hủy</SecondaryButton>
        <PrimaryButton type="button" disabled={busy} onClick={onConfirm}>
          {busy ? "Đang xử lý…" : confirmLabel}
        </PrimaryButton>
      </>}
    >
      <div className="v2-confirmation-content">
        <p className="v2-confirmation-message">{message}</p>
        {details.length > 0 && (
          <dl className="v2-confirmation-details">
            {details.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Modal>
  );
}

export function Toast({
  message,
  tone = "success",
  onDismiss,
}: {
  message: string;
  tone?: "success" | "error";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  return (
    <div
      className={`v2-toast v2-toast-${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <span>{message}</span>
      <IconButton label="Đóng thông báo" onClick={onDismiss}><CloseIcon /></IconButton>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [dialog, open]);

  return (
    <dialog
      ref={setDialog}
      className="v2-dialog v2-dialog-drawer"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="v2-dialog-inner">
        <div className="v2-dialog-header">
          <h2 className="v2-dialog-title" id={titleId}>{title}</h2>
          <IconButton label="Đóng bảng lọc" onClick={onClose}><CloseIcon /></IconButton>
        </div>
        {children}
        {footer && <div className="v2-dialog-footer">{footer}</div>}
      </div>
    </dialog>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const validTotalPages = Math.max(0, Math.floor(totalPages));
  const currentPage = validTotalPages ? Math.min(Math.max(1, Math.floor(page)), validTotalPages) : 0;

  return (
    <nav className="v2-pagination" aria-label="Pagination">
      <span>{validTotalPages ? `Trang ${currentPage} / ${validTotalPages}` : "Không có trang"}</span>
      <div className="v2-pagination-controls">
        <SecondaryButton
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Trước
        </SecondaryButton>
        <SecondaryButton
          type="button"
          disabled={!validTotalPages || currentPage >= validTotalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Tiếp
        </SecondaryButton>
      </div>
    </nav>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="v2-state" role="status">
      <h3 className="v2-state-title">{title}</h3>
      <p className="v2-state-message">{message}</p>
      {action && <div className="v2-dialog-footer">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = "Đang tải…" }: { message?: string }) {
  return <div className="v2-state" role="status"><p className="v2-state-message">{message}</p></div>;
}

export function ErrorState({ title = "Đã xảy ra lỗi", message }: { title?: string; message: string }) {
  return (
    <div className="v2-state v2-state-error" role="alert">
      <h3 className="v2-state-title">{title}</h3>
      <p className="v2-state-message">{message}</p>
    </div>
  );
}

function CartIcon() {
  return <svg className="v2-header-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 4h2.2l2.3 10.3a1.6 1.6 0 0 0 1.6 1.2h8.3a1.6 1.6 0 0 0 1.5-1.2L20.8 8H6.1" />
    <circle cx="9.6" cy="19.4" r="1.4" />
    <circle cx="17.4" cy="19.4" r="1.4" />
  </svg>;
}

function UserIcon() {
  return <svg className="v2-header-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </svg>;
}

/** Signed-in header entry: given name plus a small menu, so the header never overflows. */
function AccountMenu({ fullName, staff, onLogout }: { fullName: string; staff: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Vietnamese names end with the given name ("Nguyễn Văn An" → "An").
  const shortName = fullName.trim().split(/\s+/).pop() || fullName;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const links = staff
    ? [{ to: "/admin/dashboard", label: "Trang quản trị" }, { to: "/admin/profile", label: "Tài khoản của tôi" }]
    : [
      { to: "/customer/account", label: "Tài khoản của tôi" },
      { to: "/customer/orders", label: "Đơn hàng của tôi" },
      { to: "/build-pc/saved", label: "Cấu hình đã lưu" },
    ];
  return <div className="v2-account-menu" ref={rootRef}>
    <button className="v2-header-link" type="button" aria-haspopup="menu" aria-expanded={open}
      title={fullName} onClick={() => setOpen((value) => !value)}>
      <UserIcon /><span className="v2-header-link-text">{shortName}</span>
      <span className="v2-account-menu-caret" aria-hidden="true">▾</span>
    </button>
    {open && <div className="v2-account-menu-panel" role="menu">
      <p className="v2-account-menu-name">{fullName}<small>{staff ? "Nhân viên cửa hàng" : "Khách hàng"}</small></p>
      {links.map((link) => <Link key={link.to} role="menuitem" to={link.to} onClick={() => setOpen(false)}>{link.label}</Link>)}
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>Đăng xuất</button>
    </div>}
  </div>;
}

export function CustomerHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const [catalogFacets, setCatalogFacets] = useState<CatalogFacets>();
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number>();

  // The header is position: fixed (a sticky header makes Chrome scroll the page while
  // typing in the search box). A spacer keeps page content below it; its height follows
  // the header's real height, which changes with breakpoints and the error banner.
  // Dropdowns/menus are absolutely positioned, so they do not affect the measurement.
  useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeaderHeight(Math.round(header.getBoundingClientRect().height)));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogFacets(controller.signal).then(
      (response) => setCatalogFacets(response.data),
      // Facets only populate the search category filter; search still works without them.
      () => undefined,
    );
    return () => controller.abort();
  }, []);

  return (
    <>
    <header ref={headerRef} className="v2-customer-header" data-shared-component="v2-customer-header">
      <div className="v2-customer-announcement">
        <div className="v2-customer-announcement-inner">
          <span>PC lắp sẵn, linh kiện và gaming gear · Giá và tồn kho cập nhật từ hệ thống</span>
          <nav className="v2-customer-announcement-links" aria-label="Lối tắt mua sắm">
            <Link to="/customer/parts?sale=true"><span aria-hidden="true">🔥</span> Hàng đang giảm giá</Link>
            <Link to="/customer/guest-order-lookup">Tra cứu đơn hàng</Link>
            <Link to="/build-pc/start">Tự build PC <span aria-hidden="true">→</span></Link>
          </nav>
        </div>
      </div>
      <div className="v2-customer-header-inner">
        <Link className="v2-brand" to="/customer/home">
          <span className="v2-brand-mark" aria-hidden="true">⌘</span>
          <span>PC BUILDER STORE</span>
        </Link>
        <nav className="v2-customer-nav" aria-label="Điều hướng cửa hàng">
          <NavLink to="/customer/home">Trang chủ</NavLink>
          <MegaMenu />
          <NavLink to="/customer/compare">So sánh</NavLink>
          <NavLink to="/build-pc/start">Tự cấu hình PC</NavLink>
        </nav>
        <HeaderSearch facets={catalogFacets} />
        <div className="v2-header-actions">
          <Link className="v2-header-link" to="/customer/cart"><CartIcon /><span className="v2-header-link-text">Giỏ hàng</span></Link>
          {user ? (
            <AccountMenu
              fullName={user.fullName}
              staff={user.roleCode !== "CUSTOMER"}
              onLogout={() => {
                setLogoutError("");
                void logout().then(() => navigate("/login")).catch((reason: unknown) =>
                  setLogoutError(reason instanceof Error ? reason.message : "Không thể đăng xuất."),
                );
              }}
            />
          ) : <Link className="v2-header-link" to="/login"><UserIcon /><span className="v2-header-link-text">Đăng nhập</span></Link>}
        </div>
      </div>
      {logoutError && <p className="v2-header-error" role="alert">{logoutError}</p>}
    </header>
    <div
      className="v2-customer-header-spacer"
      aria-hidden="true"
      style={headerHeight ? { height: headerHeight } : undefined}
    />
    </>
  );
}

export function CustomerFooter() {
  // Only channels the store has confirmed (non-empty href) are listed.
  const socialLinks = CONTACT_LINKS.filter((link) => link.href.startsWith("http"));
  return (
    <footer className="v2-customer-footer" data-shared-component="v2-customer-footer">
      <div className="v2-footer-inner">
        <div className="v2-footer-brand">
          <h2>PC BUILDER STORE</h2>
          <p>PC lắp sẵn, linh kiện và gaming gear với cấu hình minh bạch đến từng linh kiện.</p>
          {socialLinks.length > 0 && <div className="v2-footer-social">
            {socialLinks.map((link) => <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer"
              aria-label={`${link.label} (mở tab mới)`}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{link.icon}</svg>
            </a>)}
          </div>}
        </div>
        <div>
          <h2>Sản phẩm</h2>
          <nav className="v2-footer-links" aria-label="Sản phẩm">
            <Link to="/customer/parts?type=PC">PC lắp sẵn</Link>
            <Link to="/customer/parts">Linh kiện máy tính</Link>
            <Link to="/customer/parts?type=ACCESSORY">Gaming gear</Link>
            <Link to="/customer/parts?sale=true">Hàng đang giảm giá</Link>
          </nav>
        </div>
        <div>
          <h2>Công cụ</h2>
          <nav className="v2-footer-links" aria-label="Công cụ">
            <Link to="/build-pc/start">Tự build PC</Link>
            <Link to="/customer/compare">So sánh sản phẩm</Link>
          </nav>
        </div>
        <div>
          <h2>Hỗ trợ khách hàng</h2>
          <nav className="v2-footer-links" aria-label="Hỗ trợ khách hàng">
            <Link to="/customer/guest-order-lookup">Tra cứu đơn hàng</Link>
            <Link to="/customer/orders">Đơn hàng của tôi</Link>
            <Link to="/contact">Liên hệ</Link>
            <Link to="/about">Giới thiệu</Link>
          </nav>
        </div>
        <div>
          <h2>Chính sách</h2>
          <nav className="v2-footer-links" aria-label="Chính sách">
            <Link to="/policies/warranty">Bảo hành</Link>
            <Link to="/policies/returns">Đổi trả và hoàn tiền</Link>
            <Link to="/policies/shipping">Giao hàng</Link>
            <Link to="/policies/payment">Thanh toán</Link>
            <Link to="/policies/privacy">Bảo mật thông tin</Link>
          </nav>
        </div>
      </div>
      <div className="v2-footer-bottom">© {new Date().getFullYear()} PC Builder Store. Giá và tình trạng hàng được cập nhật từ hệ thống.</div>
    </footer>
  );
}

export function CustomerLayout({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { items, collapsed } = useComparison();
  return (
    <div className={`v2-theme v2-shell ${className}`}>
      <CustomerHeader />
      <main className={`v2-customer-main${items.length ? ` has-comparison-selection${collapsed ? " is-comparison-collapsed" : ""}` : ""}`}><TemporaryPasswordBanner />{children}</main>
      <CustomerFooter />
      <ComparisonTray />
      <FloatingContact />
    </div>
  );
}

type StaffRole = "ADMIN" | "SALES";
const BOTH: StaffRole[] = ["ADMIN", "SALES"];
const ADMIN_ONLY: StaffRole[] = ["ADMIN"];

/** Sales staff run orders, customers and reviews; catalog, promotions and accounts are admin-only. */
const adminNavGroups: { label: string; items: { label: string; path: string; roles: StaffRole[] }[] }[] = [
  {
    label: "Tổng quan",
    items: [{ label: "Bảng điều khiển", path: "/admin/dashboard", roles: BOTH }],
  },
  {
    label: "Bán hàng",
    items: [
      { label: "Đơn hàng", path: "/admin/orders", roles: BOTH },
      { label: "Tra cứu khách hàng", path: "/admin/customers", roles: BOTH },
      { label: "Đánh giá sản phẩm", path: "/admin/reviews", roles: BOTH },
      { label: "Khuyến mãi", path: "/admin/promotions", roles: ADMIN_ONLY },
    ],
  },
  {
    label: "Sản phẩm",
    items: [
      { label: "Quản lý sản phẩm", path: "/admin/products", roles: ADMIN_ONLY },
      { label: "Tạo / sửa sản phẩm", path: "/admin/product-edit", roles: ADMIN_ONLY },
      { label: "Nhập CSV", path: "/admin/csv-import", roles: ADMIN_ONLY },
      { label: "Danh mục", path: "/admin/categories", roles: ADMIN_ONLY },
      { label: "Thương hiệu", path: "/admin/brands", roles: ADMIN_ONLY },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { label: "Nhân viên và tài khoản", path: "/admin/staff", roles: ADMIN_ONLY },
      { label: "Tài khoản của tôi", path: "/admin/profile", roles: BOTH },
    ],
  },
];

export function AdminSidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();
  const role = user?.roleCode === "ADMIN" || user?.roleCode === "SALES" ? user.roleCode : undefined;
  const visibleGroups = adminNavGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => role && item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
  return (
    <aside
      className={`v2-admin-sidebar${open ? " is-open" : ""}`}
      id="v2-admin-navigation"
      aria-label="Admin navigation"
    >
      <Link className="v2-brand" to="/admin/dashboard" onClick={onNavigate}>
        <span className="v2-brand-mark" aria-hidden="true">⌘</span>
        <span>PC BUILDER STORE</span>
      </Link>
      {visibleGroups.map((group) => (
        <nav className="v2-admin-nav-group" key={group.label} aria-label={group.label}>
          <h2 className="v2-admin-nav-heading">{group.label}</h2>
          {group.items.map((item) => (
            <NavLink
              className="v2-admin-nav-link"
              key={item.path}
              to={item.path}
              onClick={onNavigate}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      ))}
      <div className="v2-admin-sidebar-footer">
        <Link to="/customer/home">← Xem cửa hàng</Link>
      </div>
    </aside>
  );
}

export function AdminTopbar({
  title = "Administration",
  onMenuClick,
  menuOpen = false,
}: {
  title?: string;
  onMenuClick?: () => void;
  menuOpen?: boolean;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");
  return (
    <header className="v2-admin-topbar" data-shared-component="v2-admin-topbar">
      <div className="v2-admin-topbar-inner">
        <div className="v2-preview-row">
          <SecondaryButton
            className="v2-admin-menu-button"
            type="button"
            aria-label="Mở điều hướng quản trị"
            aria-controls="v2-admin-navigation"
            aria-expanded={menuOpen}
            onClick={onMenuClick}
          >
            <MenuIcon />
          </SecondaryButton>
          <span className="v2-admin-topbar-title">{title}</span>
        </div>
        <div className="v2-preview-row">
          {user && <Link className="v2-admin-user" to="/admin/profile">{user.fullName} · {user.roleCode === "ADMIN" ? "Quản trị viên" : "Nhân viên"}</Link>}
          {user && <SecondaryButton type="button" onClick={() => {
            setLogoutError("");
            void logout().then(() => navigate("/login")).catch((reason: unknown) =>
              setLogoutError(reason instanceof Error ? reason.message : "Could not log out."),
            );
          }}>Đăng xuất</SecondaryButton>}
        </div>
      </div>
      {logoutError && <p className="v2-header-error" role="alert">{logoutError}</p>}
    </header>
  );
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="v2-breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span className="v2-preview-row" key={`${item.label}-${index}`}>
          {index > 0 && <span className="v2-breadcrumb-separator" aria-hidden="true">/</span>}
          {item.href && index < items.length - 1
            ? <Link to={item.href}>{item.label}</Link>
            : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

/** Shown until a user with an admin-issued temporary password picks their own. */
function TemporaryPasswordBanner() {
  const { user } = useAuth();
  if (!user?.mustChangePassword) return null;
  const path = user.roleCode === "CUSTOMER" ? "/customer/account?changePassword=1" : "/admin/profile?changePassword=1";
  return <div className="v2-temp-password-banner" role="alert">
    Bạn đang đăng nhập bằng mật khẩu tạm. <Link to={path}>Đặt mật khẩu của riêng bạn →</Link>
  </div>;
}

export function AdminLayout({
  children,
  title,
  breadcrumb,
}: {
  children: ReactNode;
  title?: string;
  breadcrumb?: BreadcrumbItem[];
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="v2-theme v2-admin-shell">
      <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="v2-admin-workspace">
        <AdminTopbar
          title={title}
          menuOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />
        <main className="v2-admin-main">
          <TemporaryPasswordBanner />
          {breadcrumb && <Breadcrumb items={breadcrumb} />}
          {children}
        </main>
      </div>
    </div>
  );
}
