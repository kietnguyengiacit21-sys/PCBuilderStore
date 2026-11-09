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

function findMenuCategory(
  categories: CatalogFacets["categories"],
  terms: readonly string[],
) {
  const normalize = (value: string) => value.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ");
  return categories.find((category) => {
    const text = normalize(`${category.value} ${category.label}`);
    return terms.some((term) => text.includes(normalize(term)));
  });
}

export function ErrorState({ title = "Đã xảy ra lỗi", message }: { title?: string; message: string }) {
  return (
    <div className="v2-state v2-state-error" role="alert">
      <h3 className="v2-state-title">{title}</h3>
      <p className="v2-state-message">{message}</p>
    </div>
  );
}

export function CustomerHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogFacets, setCatalogFacets] = useState<CatalogFacets>();
  const [catalogFacetError, setCatalogFacetError] = useState("");
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogFacets(controller.signal).then(
      (response) => setCatalogFacets(response.data),
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setCatalogFacetError(reason instanceof Error ? reason.message : "Không thể tải danh mục sản phẩm.");
        }
      },
    );
    return () => controller.abort();
  }, []);

  return (
    <header className="v2-customer-header" data-shared-component="v2-customer-header">
      <div className="v2-customer-announcement">
        <div className="v2-customer-announcement-inner">
          <span>Khám phá phần cứng PC và thông tin kỹ thuật chi tiết</span>
          <Link to="/customer/parts">Khám phá danh mục <span aria-hidden="true">→</span></Link>
        </div>
      </div>
      <div className="v2-customer-header-inner">
        <Link className="v2-brand" to="/customer/home">
          <span className="v2-brand-mark" aria-hidden="true">⌘</span>
          <span>PC BUILDER STORE</span>
        </Link>
        <nav className="v2-customer-nav" aria-label="Điều hướng cửa hàng">
          <NavLink to="/customer/home">Trang chủ</NavLink>
          <button
            ref={menuTriggerRef}
            className="v2-header-link v2-product-menu-trigger"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="v2-product-category-menu"
            onClick={() => {
              const nextOpen = !menuOpen;
              setMenuOpen(nextOpen);
              if (nextOpen) window.requestAnimationFrame(() => menuPanelRef.current?.querySelector<HTMLElement>("a")?.focus());
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenuOpen(false);
                menuTriggerRef.current?.focus();
              }
            }}
          >
            Danh mục sản phẩm <span aria-hidden="true">⌄</span>
          </button>
          <NavLink to="/customer/compare">So sánh</NavLink>
          <NavLink to="/build-pc/start">Tự cấu hình PC</NavLink>
        </nav>
        <form
          className="v2-header-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const search = query.trim();
            navigate(`/customer/parts${search ? `?q=${encodeURIComponent(search)}` : ""}`);
          }}
        >
          <SearchInput
            aria-label="Tìm kiếm sản phẩm"
            placeholder="Tìm kiếm sản phẩm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <div className="v2-header-actions">
          <Link className="v2-header-link" to="/customer/cart">Giỏ hàng</Link>
          {user ? (
            <>
              <Link className="v2-header-link" to={user.roleCode === "CUSTOMER" ? "/customer/account" : "/admin/dashboard"}>{user.fullName} · {user.roleCode}</Link>
              <button className="v2-header-link" type="button" onClick={() => {
                setLogoutError("");
                void logout().then(() => navigate("/login")).catch((reason: unknown) =>
                  setLogoutError(reason instanceof Error ? reason.message : "Không thể đăng xuất."),
                );
              }}>Đăng xuất</button>
            </>
          ) : <Link className="v2-header-link" to="/login">Đăng nhập</Link>}
        </div>
      </div>
      {menuOpen && <div
        ref={menuPanelRef}
        className="v2-product-category-menu"
        id="v2-product-category-menu"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMenuOpen(false);
            menuTriggerRef.current?.focus();
          }
        }}
      >
        <div className="v2-product-category-menu-inner">
          <section>
            <h2>Máy tính bộ</h2>
            {catalogFacets?.productTypes.some((type) => type.value === "PC")
              ? <Link to="/customer/parts?type=PC" onClick={() => setMenuOpen(false)}>Tất cả máy tính bộ</Link>
              : <span className="is-unavailable">Máy tính bộ · chưa có dữ liệu danh mục</span>}
            {([
              { label: "PC Gaming", terms: ["gaming"], searchTerm: "gaming" },
              { label: "PC AI", terms: ["pc ai", "ai pc"] },
              { label: "PC Workstation / Đồ họa", terms: ["workstation", "do hoa"], searchTerm: "workstation" },
              { label: "PC Creator / Streaming", terms: ["creator", "streaming"], searchTerm: "creator" },
              { label: "PC Văn phòng", terms: ["van phong", "office"], searchTerm: "văn phòng" },
              { label: "PC Mini", terms: ["pc mini", "mini pc"] },
              { label: "PC AMD Gaming", terms: ["amd gaming", "pc amd"] },
            ]).map((item) => {
              const category = catalogFacets && findMenuCategory(catalogFacets.categories, item.terms);
              const destination = category
                ? `/customer/parts?type=PC&category=${encodeURIComponent(category.value)}`
                : item.searchTerm
                  ? `/customer/parts?type=PC&q=${encodeURIComponent(item.searchTerm)}`
                  : undefined;
              return destination
                ? <Link key={item.label} to={destination} onClick={() => setMenuOpen(false)}>{item.label}</Link>
                : null;
            })}
          </section>
          <section>
            <h2>Linh kiện</h2>
            {(catalogFacets?.productTypes ?? []).filter((type) => type.value !== "PC").map((type) => (
              <Link key={type.value} to={`/customer/parts?type=${encodeURIComponent(type.value)}`} onClick={() => setMenuOpen(false)}>
                {type.value === "MOTHERBOARD" ? "Mainboard" : type.value === "STORAGE" ? "Storage / SSD" : type.value === "PSU" ? "Nguồn" : type.value === "CASE" ? "Case" : type.value === "COOLER" ? "Tản nhiệt" : type.value === "GPU" ? "Card đồ họa" : type.value === "CPU" ? "CPU" : type.value === "RAM" ? "RAM" : type.value === "ACCESSORY" ? "Phụ kiện" : type.label}
              </Link>
            ))}
            {!catalogFacets?.productTypes.length && !catalogFacetError && <span className="is-unavailable">Đang tải danh mục…</span>}
            {catalogFacetError && <span className="v2-inline-error" role="alert">{catalogFacetError}</span>}
          </section>
          <section>
            <h2>Khám phá</h2>
            <Link to="/customer/parts" onClick={() => setMenuOpen(false)}>Tất cả sản phẩm</Link>
            <Link to="/customer/compare" onClick={() => setMenuOpen(false)}>So sánh sản phẩm</Link>
          </section>
        </div>
      </div>}
      {logoutError && <p className="v2-header-error" role="alert">{logoutError}</p>}
    </header>
  );
}

export function CustomerFooter() {
  return (
    <footer className="v2-customer-footer" data-shared-component="v2-customer-footer">
      <div className="v2-footer-inner">
        <div className="v2-footer-brand">
          <h2>PC BUILDER STORE</h2>
          <p>Khám phá linh kiện và thông tin sản phẩm.</p>
        </div>
        <div>
          <h2>Khám phá</h2>
          <nav className="v2-footer-links" aria-label="Khám phá">
            <Link to="/customer/parts">Linh kiện</Link>
            <Link to="/customer/compare">So sánh sản phẩm</Link>
          </nav>
        </div>
        <div>
          <h2>Tài khoản</h2>
          <nav className="v2-footer-links" aria-label="Tài khoản">
            <Link to="/customer/orders">Lịch sử đơn hàng</Link>
            <Link to="/customer/account">Tổng quan tài khoản</Link>
          </nav>
        </div>
      </div>
      <div className="v2-footer-bottom">PC Builder Store</div>
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
      <main className={`v2-customer-main${items.length ? ` has-comparison-selection${collapsed ? " is-comparison-collapsed" : ""}` : ""}`}>{children}</main>
      <CustomerFooter />
      <ComparisonTray />
    </div>
  );
}

const adminNavGroups = [
  {
    label: "Tổng quan",
    items: [{ label: "Bảng điều khiển", path: "/admin/dashboard" }],
  },
  {
    label: "Sản phẩm",
    items: [
      { label: "Quản lý sản phẩm", path: "/admin/products" },
      { label: "Tạo / sửa sản phẩm", path: "/admin/product-edit" },
      { label: "Nhập CSV", path: "/admin/csv-import" },
      { label: "Danh mục", path: "/admin/categories" },
      { label: "Thương hiệu", path: "/admin/brands" },
    ],
  },
  {
    label: "Bán hàng",
    items: [
      { label: "Đơn hàng", path: "/admin/orders" },
      { label: "Khuyến mãi", path: "/admin/promotions" },
      { label: "Tra cứu khách hàng", path: "/admin/customers" },
    ],
  },
  {
    label: "Hệ thống",
    items: [{ label: "Nhân viên và vai trò", path: "/admin/staff" }],
  },
];

export function AdminSidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();
  const visibleGroups = user?.roleCode === "ADMIN"
    ? adminNavGroups
    : adminNavGroups.filter((group) => group.items.some((item) => item.path === "/admin/dashboard"));
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
        <strong>Build-PC</strong><br />
        Sắp ra mắt · B01–B08
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
          {user && <span className="v2-admin-user">{user.fullName} · {user.roleCode}</span>}
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
          {breadcrumb && <Breadcrumb items={breadcrumb} />}
          {children}
        </main>
      </div>
    </div>
  );
}
