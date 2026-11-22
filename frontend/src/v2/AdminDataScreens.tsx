import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  createBrand,
  createCategory,
  deleteBrand,
  deleteCategory,
  fetchAdminBrands,
  fetchAdminCategories,
  fetchCustomerDetail,
  importCatalogCsv,
  searchCustomers,
  updateBrand,
  updateCategory,
} from "../admin-data-api";
import type {
  AdminBrand,
  AdminCategory,
  CustomerDetail,
  CustomerSummary,
  ImportResult,
} from "../admin-data-api";
import { money } from "../money";
import { fetchAdminReviews, moderateReview, respondToReview } from "../reviews-api";
import type { AdminReview, ReviewStatus } from "../reviews-api";
import type { OrderStatus } from "../orders-api";
import { label, paymentStatusText } from "../order-labels";
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
const dateText = (value: string | null) => value
  ? new Date(value.replace(" ", "T")).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
  : "—";

function StatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? "Đang hiện" : "Đang ẩn"}</Badge>;
}

function PageTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <div className="v2-page-title"><div><p className="v2-eyebrow">{eyebrow}</p><h1>{title}</h1></div>{action}</div>;
}

// --- Categories ----------------------------------------------------------------

interface CategoryForm { categoryCode: string; categoryName: string; description: string; parentCategoryCode: string; active: boolean }
const emptyCategory: CategoryForm = { categoryCode: "", categoryName: "", description: "", parentCategoryCode: "", active: true };

export function CategoriesAdminPage() {
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<{ original?: AdminCategory; form: CategoryForm }>();
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<AdminCategory>();

  const reload = () => fetchAdminCategories().then(setItems, (reason: unknown) => setError(errorText(reason, "Không thể tải danh mục.")))
    .finally(() => setLoading(false));
  useEffect(() => { void reload(); }, []);

  const names = useMemo(() => new Map(items.map((item) => [item.categoryCode, item.categoryName])), [items]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setFormError("");
    try {
      const saved = editing.original
        ? await updateCategory(editing.original.categoryCode, editing.form)
        : await createCategory(editing.form);
      setNotice(`Đã lưu danh mục ${saved.categoryName}.`);
      setEditing(undefined);
      await reload();
    } catch (reason) {
      setFormError(errorText(reason, "Không thể lưu danh mục."));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (item: AdminCategory) => {
    setError("");
    try {
      await updateCategory(item.categoryCode, {
        categoryName: item.categoryName, description: item.description ?? "",
        parentCategoryCode: item.parentCategoryCode ?? "", active: !item.active,
      });
      setNotice(`${item.active ? "Đã ẩn" : "Đã hiện"} danh mục ${item.categoryName}.`);
      await reload();
    } catch (reason) {
      setError(errorText(reason, "Không thể cập nhật danh mục."));
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteCategory(deleting.categoryCode);
      setNotice(`Đã xóa danh mục ${deleting.categoryName}.`);
      setDeleting(undefined);
      await reload();
    } catch (reason) {
      setError(errorText(reason, "Không thể xóa danh mục."));
      setDeleting(undefined);
    } finally {
      setBusy(false);
    }
  };
  const setField = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) =>
    setEditing((current) => current && { ...current, form: { ...current.form, [key]: value } });

  return <RoleGate audience="admin"><div className="v2-page">
    <PageTitle eyebrow="Catalog" title="Quản lý danh mục"
      action={<PrimaryButton type="button" onClick={() => { setFormError(""); setEditing({ form: emptyCategory }); }}>+ Thêm danh mục</PrimaryButton>} />
    {notice && <p className="v2-inline-success" role="status">{notice}</p>}
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    <Card title={`${items.length} danh mục`} description="Danh mục đang ẩn sẽ không xuất hiện trong bộ lọc của cửa hàng. Chỉ xóa được danh mục chưa có sản phẩm.">
      {loading ? <LoadingState message="Đang tải danh mục…" /> : <DataTable<AdminCategory>
        rows={items}
        getRowKey={(item) => item.categoryCode}
        emptyMessage="Chưa có danh mục nào."
        columns={[
          { key: "name", header: "Danh mục", render: (item) => <div className="v2-admin-cell"><strong>{item.categoryName}</strong><span className="v2-mono">{item.categoryCode}</span></div> },
          { key: "parent", header: "Danh mục cha", render: (item) => item.parentCategoryCode ? names.get(item.parentCategoryCode) ?? item.parentCategoryCode : "—" },
          { key: "products", header: "Sản phẩm", render: (item) => <span>{item.activeProductCount} đang bán{item.productCount > item.activeProductCount ? ` · ${item.productCount} tổng` : ""}</span> },
          { key: "status", header: "Trạng thái", render: (item) => <StatusBadge active={item.active} /> },
          { key: "actions", header: "", className: "v2-admin-actions", render: (item) => <div className="v2-admin-row-actions">
            <SecondaryButton type="button" onClick={() => { setFormError(""); setEditing({ original: item, form: {
              categoryCode: item.categoryCode, categoryName: item.categoryName, description: item.description ?? "",
              parentCategoryCode: item.parentCategoryCode ?? "", active: item.active } }); }}>Sửa</SecondaryButton>
            <SecondaryButton type="button" onClick={() => void toggle(item)}>{item.active ? "Ẩn" : "Hiện"}</SecondaryButton>
            <SecondaryButton type="button" disabled={item.productCount > 0}
              title={item.productCount > 0 ? "Danh mục đang có sản phẩm, hãy ẩn thay vì xóa" : undefined}
              onClick={() => setDeleting(item)}>Xóa</SecondaryButton>
          </div> },
        ]} />}
    </Card>

    <Modal open={Boolean(editing)} onClose={() => setEditing(undefined)} title={editing?.original ? "Sửa danh mục" : "Thêm danh mục"}
      footer={<>
        <SecondaryButton type="button" disabled={busy} onClick={() => setEditing(undefined)}>Hủy</SecondaryButton>
        <PrimaryButton type="submit" form="category-form" disabled={busy}>{busy ? "Đang lưu…" : "Lưu danh mục"}</PrimaryButton>
      </>}>
      {editing && <form id="category-form" className="v2-form-stack" onSubmit={(event) => void save(event)}>
        <FormField label="Mã danh mục" htmlFor="category-code" hint="Chữ in hoa không dấu, số, dấu gạch dưới. Không đổi được sau khi tạo.">
          <input id="category-code" className="v2-form-input v2-mono" required maxLength={60} disabled={Boolean(editing.original)}
            value={editing.form.categoryCode} onChange={(event) => setField("categoryCode", event.target.value.toUpperCase())} />
        </FormField>
        <FormField label="Tên danh mục" htmlFor="category-name">
          <input id="category-name" className="v2-form-input" required maxLength={160} value={editing.form.categoryName}
            onChange={(event) => setField("categoryName", event.target.value)} />
        </FormField>
        <FormField label="Danh mục cha" htmlFor="category-parent">
          <select id="category-parent" className="v2-form-input" value={editing.form.parentCategoryCode}
            onChange={(event) => setField("parentCategoryCode", event.target.value)}>
            <option value="">Không có (danh mục gốc)</option>
            {items.filter((item) => item.categoryCode !== editing.original?.categoryCode)
              .map((item) => <option key={item.categoryCode} value={item.categoryCode}>{item.categoryName}</option>)}
          </select>
        </FormField>
        <FormField label="Mô tả" htmlFor="category-description">
          <textarea id="category-description" className="v2-form-input" rows={3} maxLength={4000} value={editing.form.description}
            onChange={(event) => setField("description", event.target.value)} />
        </FormField>
        <label className="v2-checkbox-row"><input type="checkbox" checked={editing.form.active}
          onChange={(event) => setField("active", event.target.checked)} /> Hiện trên cửa hàng</label>
        {formError && <p className="v2-inline-error" role="alert">{formError}</p>}
      </form>}
    </Modal>

    <ConfirmationModal open={Boolean(deleting)} onClose={() => setDeleting(undefined)} onConfirm={() => void remove()} busy={busy}
      title="Xóa danh mục" confirmLabel="Xóa danh mục"
      message={<>Xóa vĩnh viễn danh mục <strong>{deleting?.categoryName}</strong>? Thao tác này không hoàn tác được.</>} />
  </div></RoleGate>;
}

// --- Brands ----------------------------------------------------------------------

interface BrandForm { brandName: string; websiteUrl: string; description: string; active: boolean }
const emptyBrand: BrandForm = { brandName: "", websiteUrl: "", description: "", active: true };

export function BrandsAdminPage() {
  const [items, setItems] = useState<AdminBrand[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<{ original?: AdminBrand; form: BrandForm }>();
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<AdminBrand>();

  const reload = () => fetchAdminBrands().then(setItems, (reason: unknown) => setError(errorText(reason, "Không thể tải thương hiệu.")))
    .finally(() => setLoading(false));
  useEffect(() => { void reload(); }, []);

  const visible = items.filter((item) => item.brandName.toLowerCase().includes(query.trim().toLowerCase()));
  const formOf = (item: AdminBrand): BrandForm => ({
    brandName: item.brandName, websiteUrl: item.websiteUrl ?? "", description: item.description ?? "", active: item.active,
  });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setFormError("");
    try {
      const saved = editing.original ? await updateBrand(editing.original.brandId, editing.form) : await createBrand(editing.form);
      setNotice(`Đã lưu thương hiệu ${saved.brandName}.`);
      setEditing(undefined);
      await reload();
    } catch (reason) {
      setFormError(errorText(reason, "Không thể lưu thương hiệu."));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (item: AdminBrand) => {
    setError("");
    try {
      await updateBrand(item.brandId, { ...formOf(item), active: !item.active });
      setNotice(`${item.active ? "Đã ẩn" : "Đã hiện"} thương hiệu ${item.brandName}.`);
      await reload();
    } catch (reason) {
      setError(errorText(reason, "Không thể cập nhật thương hiệu."));
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteBrand(deleting.brandId);
      setNotice(`Đã xóa thương hiệu ${deleting.brandName}.`);
      setDeleting(undefined);
      await reload();
    } catch (reason) {
      setError(errorText(reason, "Không thể xóa thương hiệu."));
      setDeleting(undefined);
    } finally {
      setBusy(false);
    }
  };
  const setField = <K extends keyof BrandForm>(key: K, value: BrandForm[K]) =>
    setEditing((current) => current && { ...current, form: { ...current.form, [key]: value } });

  return <RoleGate audience="admin"><div className="v2-page">
    <PageTitle eyebrow="Catalog" title="Quản lý thương hiệu"
      action={<PrimaryButton type="button" onClick={() => { setFormError(""); setEditing({ form: emptyBrand }); }}>+ Thêm thương hiệu</PrimaryButton>} />
    {notice && <p className="v2-inline-success" role="status">{notice}</p>}
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    <Card title={`${items.length} thương hiệu`} description="Thương hiệu đang ẩn không xuất hiện trong bộ lọc và không chọn được khi tạo sản phẩm mới."
      action={<input className="v2-form-input v2-admin-filter" type="search" placeholder="Lọc theo tên…" aria-label="Lọc thương hiệu"
        value={query} onChange={(event) => setQuery(event.target.value)} />}>
      {loading ? <LoadingState message="Đang tải thương hiệu…" /> : <DataTable<AdminBrand>
        rows={visible}
        getRowKey={(item) => item.brandId}
        emptyMessage="Không có thương hiệu khớp."
        columns={[
          { key: "name", header: "Thương hiệu", render: (item) => <div className="v2-admin-cell"><strong>{item.brandName}</strong>{item.description && <span>{item.description}</span>}</div> },
          { key: "web", header: "Website", render: (item) => item.websiteUrl
            ? <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer">{new URL(item.websiteUrl).host}</a> : "—" },
          { key: "products", header: "Sản phẩm", render: (item) => <span>{item.activeProductCount} đang bán{item.productCount > item.activeProductCount ? ` · ${item.productCount} tổng` : ""}</span> },
          { key: "status", header: "Trạng thái", render: (item) => <StatusBadge active={item.active} /> },
          { key: "actions", header: "", className: "v2-admin-actions", render: (item) => <div className="v2-admin-row-actions">
            <SecondaryButton type="button" onClick={() => { setFormError(""); setEditing({ original: item, form: formOf(item) }); }}>Sửa</SecondaryButton>
            <SecondaryButton type="button" onClick={() => void toggle(item)}>{item.active ? "Ẩn" : "Hiện"}</SecondaryButton>
            <SecondaryButton type="button" disabled={item.productCount > 0}
              title={item.productCount > 0 ? "Thương hiệu đang có sản phẩm, hãy ẩn thay vì xóa" : undefined}
              onClick={() => setDeleting(item)}>Xóa</SecondaryButton>
          </div> },
        ]} />}
    </Card>

    <Modal open={Boolean(editing)} onClose={() => setEditing(undefined)} title={editing?.original ? "Sửa thương hiệu" : "Thêm thương hiệu"}
      footer={<>
        <SecondaryButton type="button" disabled={busy} onClick={() => setEditing(undefined)}>Hủy</SecondaryButton>
        <PrimaryButton type="submit" form="brand-form" disabled={busy}>{busy ? "Đang lưu…" : "Lưu thương hiệu"}</PrimaryButton>
      </>}>
      {editing && <form id="brand-form" className="v2-form-stack" onSubmit={(event) => void save(event)}>
        <FormField label="Tên thương hiệu" htmlFor="brand-name">
          <input id="brand-name" className="v2-form-input" required maxLength={120} value={editing.form.brandName}
            onChange={(event) => setField("brandName", event.target.value)} />
        </FormField>
        <FormField label="Website" htmlFor="brand-web" hint="Ví dụ: https://www.asus.com">
          <input id="brand-web" className="v2-form-input" type="url" maxLength={500} value={editing.form.websiteUrl}
            onChange={(event) => setField("websiteUrl", event.target.value)} />
        </FormField>
        <FormField label="Mô tả" htmlFor="brand-description">
          <textarea id="brand-description" className="v2-form-input" rows={3} maxLength={4000} value={editing.form.description}
            onChange={(event) => setField("description", event.target.value)} />
        </FormField>
        <label className="v2-checkbox-row"><input type="checkbox" checked={editing.form.active}
          onChange={(event) => setField("active", event.target.checked)} /> Hiện trên cửa hàng</label>
        {formError && <p className="v2-inline-error" role="alert">{formError}</p>}
      </form>}
    </Modal>

    <ConfirmationModal open={Boolean(deleting)} onClose={() => setDeleting(undefined)} onConfirm={() => void remove()} busy={busy}
      title="Xóa thương hiệu" confirmLabel="Xóa thương hiệu"
      message={<>Xóa vĩnh viễn thương hiệu <strong>{deleting?.brandName}</strong>? Thao tác này không hoàn tác được.</>} />
  </div></RoleGate>;
}

// --- Customer lookup ---------------------------------------------------------------

const orderStatusText: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", PROCESSING: "Đang xử lý", READY_TO_SHIP: "Sẵn sàng giao",
  SHIPPING: "Đang giao", DELIVERED: "Đã giao", CANCELLATION_REQUESTED: "Yêu cầu hủy", CANCELLED: "Đã hủy",
};
const segmentText: Record<string, string> = { IT: "Rành công nghệ", NON_IT: "Phổ thông", UNSPECIFIED: "Chưa rõ" };
const customerMoney = (value: number, currency: string | null) => currency ? money(value, currency) : value ? `${value.toLocaleString("vi-VN")} (nhiều loại tiền)` : "—";

export function CustomerLookupPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<CustomerDetail>();
  const [detailError, setDetailError] = useState("");

  const search = (text: string) => {
    setLoading(true);
    setError("");
    void searchCustomers(text).then(setResults, (reason: unknown) => setError(errorText(reason, "Không thể tra cứu khách hàng.")))
      .finally(() => setLoading(false));
  };
  useEffect(() => search(""), []);

  const open = (customer: CustomerSummary) => {
    setDetailError("");
    setDetail({ customer, orders: [] });
    void fetchCustomerDetail(customer).then(setDetail, (reason: unknown) => setDetailError(errorText(reason, "Không thể tải chi tiết.")));
  };

  return <RoleGate audience="staff"><div className="v2-page">
    <PageTitle eyebrow="Bán hàng" title="Tra cứu khách hàng" />
    <Card title="Tìm khách hàng" description="Tìm theo tên, email hoặc số điện thoại (không cần gõ đúng khoảng trắng). Bao gồm cả khách có tài khoản và khách đặt hàng không đăng nhập.">
      <form className="v2-search-form" onSubmit={(event) => { event.preventDefault(); search(query); }}>
        <input className="v2-form-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Ví dụ: Nguyễn Văn An, an@gmail.com, 0901 234 567" aria-label="Từ khóa khách hàng" />
        <PrimaryButton type="submit">Tìm</PrimaryButton>
      </form>
    </Card>
    {error && <ErrorState title="Không thể tra cứu" message={error} />}
    {loading ? <LoadingState message="Đang tìm khách hàng…" /> : !error && <Card title={query.trim() ? `${results.length} kết quả` : "Khách hàng gần đây"}>
      <DataTable<CustomerSummary>
        rows={results}
        getRowKey={(item) => `${item.type}:${item.userId ?? item.email}`}
        emptyMessage="Không tìm thấy khách hàng khớp từ khóa."
        columns={[
          { key: "name", header: "Khách hàng", render: (item) => <div className="v2-admin-cell"><strong>{item.fullName || "—"}</strong><span>{item.email}</span></div> },
          { key: "type", header: "Loại", render: (item) => item.type === "ACCOUNT"
            ? <Badge tone="primary">Có tài khoản</Badge> : <Badge>Khách vãng lai</Badge> },
          { key: "phone", header: "Điện thoại", render: (item) => item.phone || "—" },
          { key: "orders", header: "Đơn hàng", render: (item) => <span>{item.orderCount}{item.openOrderCount ? <small className="v2-table-subtext">{item.openOrderCount} đang xử lý</small> : null}</span> },
          { key: "value", header: "Giá trị đơn", render: (item) => customerMoney(item.orderValue, item.currencyCode) },
          { key: "last", header: "Đơn gần nhất", render: (item) => dateText(item.lastOrderAt) },
          { key: "open", header: "", render: (item) => <SecondaryButton type="button" onClick={() => open(item)}>Xem</SecondaryButton> },
        ]} />
    </Card>}

    <Modal open={Boolean(detail)} onClose={() => setDetail(undefined)} title={detail?.customer.fullName || "Khách hàng"} className="v2-customer-dialog">
      {detail && <div className="v2-form-stack">
        <dl className="v2-profile-grid">
          <div><dt>Email</dt><dd>{detail.customer.email}</dd></div>
          <div><dt>Điện thoại</dt><dd>{detail.customer.phone || "—"}</dd></div>
          <div><dt>Loại</dt><dd>{detail.customer.type === "ACCOUNT" ? "Có tài khoản" : "Khách vãng lai"}</dd></div>
          {detail.customer.type === "ACCOUNT" && <>
            <div><dt>Ngày đăng ký</dt><dd>{dateText(detail.customer.registeredAt)}</dd></div>
            <div><dt>Nhóm khách</dt><dd>{segmentText[detail.customer.customerSegment ?? ""] ?? "—"}</dd></div>
            <div><dt>Tài khoản</dt><dd>{detail.customer.accountStatus === "ACTIVE" ? "Đang hoạt động" : detail.customer.accountStatus}</dd></div>
          </>}
          <div><dt>Tổng giá trị đơn</dt><dd>{customerMoney(detail.customer.orderValue, detail.customer.currencyCode)}</dd></div>
        </dl>
        {detailError && <p className="v2-inline-error" role="alert">{detailError}</p>}
        <h3 className="v2-admin-subheading">Đơn hàng ({detail.customer.orderCount})</h3>
        {detail.orders.length ? <DataTable
          rows={detail.orders}
          getRowKey={(order) => order.orderNumber}
          columns={[
            { key: "code", header: "Mã đơn", render: (order) => <Link className="v2-mono" to={`/admin/orders?q=${encodeURIComponent(order.orderNumber)}`}>{order.orderNumber}</Link> },
            { key: "date", header: "Ngày đặt", render: (order) => dateText(order.placedAt) },
            { key: "status", header: "Trạng thái", render: (order) => orderStatusText[order.status] ?? order.status },
            { key: "pay", header: "Thanh toán", render: (order) => label(paymentStatusText, order.paymentStatus) },
            { key: "total", header: "Tổng", render: (order) => order.showFinancials && order.currencyCode ? money(order.total, order.currencyCode) : "—" },
          ]} /> : detail.customer.orderCount === 0 ? <EmptyState title="Chưa có đơn hàng" message="Khách này chưa đặt đơn nào." /> : <LoadingState message="Đang tải đơn hàng…" />}
      </div>}
    </Modal>
  </div></RoleGate>;
}

// --- Catalog CSV import --------------------------------------------------------------

export function CsvImportPage() {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<ImportResult>();
  const [result, setResult] = useState<ImportResult>();
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const check = (picked: File) => {
    setFile(picked);
    setPreview(undefined);
    setResult(undefined);
    setError("");
    setChecking(true);
    void importCatalogCsv(picked, false).then(setPreview, (reason: unknown) => setError(errorText(reason, "Không thể kiểm tra tệp.")))
      .finally(() => setChecking(false));
  };
  const apply = () => {
    if (!file) return;
    setImporting(true);
    setError("");
    void importCatalogCsv(file, true).then((done) => { setResult(done); setPreview(undefined); setConfirming(false); },
      (reason: unknown) => { setError(errorText(reason, "Không thể nhập dữ liệu.")); setConfirming(false); })
      .finally(() => setImporting(false));
  };
  const shown = result ?? preview;

  return <RoleGate audience="admin"><div className="v2-page">
    <PageTitle eyebrow="Catalog" title="Nhập dữ liệu CSV" />
    <Card title="1. Chọn tệp CSV" description="Dùng đúng định dạng của tệp catalog-import (model_code, product_name, brand, product_type_code, giá, ảnh, thông số…). Sản phẩm trùng mã model sẽ được cập nhật, mã mới sẽ được thêm.">
      <label className="v2-file-picker">
        <input type="file" accept=".csv,text/csv" disabled={checking || importing}
          onChange={(event) => { const picked = event.target.files?.[0]; if (picked) check(picked); event.target.value = ""; }} />
        <span>{file ? `📄 ${file.name} · ${(file.size / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} KB` : "Chọn tệp .csv (tối đa 10 MB)"}</span>
      </label>
      {checking && <LoadingState message="Đang kiểm tra toàn bộ tệp trên máy chủ…" />}
      {error && <p className="v2-inline-error v2-import-error" role="alert">{error}</p>}
    </Card>

    {shown && <Card title={result ? "Đã nhập xong" : "2. Kiểm tra trước khi nhập"}
      description={result ? "Toàn bộ sản phẩm đã được ghi vào database trong một lần." : "Tệp hợp lệ. Chưa có gì được ghi vào database."}
      action={result ? <Link className="v2-button v2-button-secondary" to="/admin/products">Xem sản phẩm →</Link>
        : <PrimaryButton type="button" disabled={importing} onClick={() => setConfirming(true)}>Nhập {shown.rowCount} sản phẩm vào database</PrimaryButton>}>
      <div className="v2-import-stats">
        <div><strong>{shown.rowCount}</strong><span>sản phẩm trong tệp</span></div>
        <div><strong>{shown.insertCount}</strong><span>{result ? "đã thêm mới" : "sẽ thêm mới"}</span></div>
        <div><strong>{shown.updateCount}</strong><span>{result ? "đã cập nhật" : "sẽ cập nhật"}</span></div>
        <div><strong>{shown.summary.attributeValues.toLocaleString("vi-VN")}</strong><span>giá trị thông số</span></div>
      </div>
      <DataTable
        rows={shown.rows}
        getRowKey={(row) => row.modelCode}
        columns={[
          { key: "row", header: "Dòng", render: (row) => row.csvRow },
          { key: "product", header: "Sản phẩm", render: (row) => <div className="v2-admin-cell"><strong>{row.productName}</strong><span className="v2-mono">{row.modelCode}</span></div> },
          { key: "type", header: "Loại", render: (row) => `${row.productType}${row.brandName ? ` · ${row.brandName}` : ""}` },
          { key: "price", header: "Giá", render: (row) => money(row.price, row.currencyCode) },
          { key: "data", header: "Dữ liệu", render: (row) => `${row.specificationCount} thông số · ${row.imageCount} ảnh` },
          { key: "action", header: "Thao tác", render: (row) => row.action === "INSERT" ? <Badge tone="success">Thêm mới</Badge> : <Badge tone="primary">Cập nhật</Badge> },
        ]} />
      {shown.rowCount > shown.rows.length && <p className="v2-muted">Hiển thị {shown.rows.length}/{shown.rowCount} dòng đầu.</p>}
    </Card>}

    <ConfirmationModal open={confirming} onClose={() => setConfirming(false)} onConfirm={apply} busy={importing}
      title="Nhập dữ liệu vào database" confirmLabel="Nhập dữ liệu"
      message="Toàn bộ tệp được ghi trong một giao dịch: nếu một dòng lỗi thì không dòng nào được ghi."
      details={preview ? [
        { label: "Thêm mới", value: `${preview.insertCount} sản phẩm` },
        { label: "Cập nhật", value: `${preview.updateCount} sản phẩm (giá, ảnh, thông số)` },
      ] : []} />
  </div></RoleGate>;
}

// --- Review moderation -----------------------------------------------------------------

const reviewStatusText: Record<ReviewStatus, string> = { PENDING: "Chờ duyệt", APPROVED: "Đang hiển thị", REJECTED: "Đã từ chối" };

export function ReviewsAdminPage() {
  const [status, setStatus] = useState<ReviewStatus | "">("PENDING");
  const [items, setItems] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replying, setReplying] = useState<AdminReview>();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = (filter = status) => {
    setLoading(true);
    setError("");
    return fetchAdminReviews(filter).then(setItems, (reason: unknown) => setError(errorText(reason, "Không thể tải đánh giá.")))
      .finally(() => setLoading(false));
  };
  useEffect(() => { void reload(status); }, [status]);

  const moderate = (review: AdminReview, next: ReviewStatus) => {
    setError("");
    void moderateReview(review.reviewId, next).then(() => reload(), (reason: unknown) => setError(errorText(reason, "Không thể cập nhật.")));
  };
  const saveReply = () => {
    if (!replying) return;
    setBusy(true);
    void respondToReview(replying.reviewId, reply).then(() => { setReplying(undefined); return reload(); },
      (reason: unknown) => setError(errorText(reason, "Không thể lưu phản hồi."))).finally(() => setBusy(false));
  };

  return <RoleGate audience="staff"><div className="v2-page">
    <PageTitle eyebrow="Bán hàng" title="Đánh giá sản phẩm" />
    <div className="v2-admin-tabs" role="tablist" aria-label="Lọc theo trạng thái">
      {(["PENDING", "APPROVED", "REJECTED", ""] as const).map((value) => <button key={value || "all"} type="button" role="tab"
        aria-selected={status === value} className={status === value ? "is-active" : undefined} onClick={() => setStatus(value)}>
        {value ? reviewStatusText[value] : "Tất cả"}</button>)}
    </div>
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    {loading ? <LoadingState message="Đang tải đánh giá…" /> : items.length === 0
      ? <EmptyState title="Không có đánh giá" message={status === "PENDING" ? "Không có đánh giá nào đang chờ duyệt." : "Chưa có đánh giá ở trạng thái này."} />
      : <div className="v2-admin-review-list">{items.map((review) => <article key={review.reviewId} className={`v2-admin-review is-${review.status.toLowerCase()}`}>
        <header>
          <div>
            <Link to={`/customer/product?modelCode=${encodeURIComponent(review.modelCode)}#reviews`}>{review.productName}</Link>
            <span>{review.authorName} · {review.authorEmail} · {dateText(review.createdAt)}</span>
          </div>
          <Badge tone={review.status === "APPROVED" ? "success" : review.status === "PENDING" ? "gold" : "neutral"}>{reviewStatusText[review.status]}</Badge>
        </header>
        <p className="v2-admin-review-stars" aria-label={`${review.rating} sao`}>{"★".repeat(review.rating)}<span>{"★".repeat(5 - review.rating)}</span>
          {review.verifiedPurchase && <small>✓ Đã mua hàng</small>}</p>
        {review.title && <strong>{review.title}</strong>}
        <p>{review.text}</p>
        {review.response && <blockquote><strong>Phản hồi của cửa hàng:</strong> {review.response}</blockquote>}
        <div className="v2-admin-row-actions">
          {review.status !== "APPROVED" && <PrimaryButton type="button" onClick={() => moderate(review, "APPROVED")}>Duyệt</PrimaryButton>}
          {review.status !== "REJECTED" && <SecondaryButton type="button" onClick={() => moderate(review, "REJECTED")}>Từ chối</SecondaryButton>}
          <SecondaryButton type="button" onClick={() => { setReplying(review); setReply(review.response ?? ""); }}>{review.response ? "Sửa phản hồi" : "Phản hồi"}</SecondaryButton>
        </div>
      </article>)}</div>}

    <Modal open={Boolean(replying)} onClose={() => setReplying(undefined)} title="Phản hồi đánh giá"
      footer={<>
        <SecondaryButton type="button" disabled={busy} onClick={() => setReplying(undefined)}>Hủy</SecondaryButton>
        <PrimaryButton type="button" disabled={busy} onClick={saveReply}>{busy ? "Đang lưu…" : reply.trim() ? "Lưu phản hồi" : "Xóa phản hồi"}</PrimaryButton>
      </>}>
      {replying && <div className="v2-form-stack">
        <p className="v2-muted">“{replying.text}” — {replying.authorName}</p>
        <FormField label="Phản hồi hiển thị công khai dưới đánh giá" htmlFor="review-reply">
          <textarea id="review-reply" className="v2-form-input" rows={4} maxLength={4000} value={reply} onChange={(event) => setReply(event.target.value)} />
        </FormField>
      </div>}
    </Modal>
  </div></RoleGate>;
}
