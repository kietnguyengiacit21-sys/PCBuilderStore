import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  fetchAdminCatalogAttributeDefinitions,
  fetchCatalogFacets,
  fetchAdminCatalogProduct,
  fetchCatalogProducts,
  updateGpuCatalogSpecifications,
} from "../catalog-api";
import {
  decideOrderCancellation,
  fetchAdminOrder,
  fetchAdminOrders,
  retryFailedOrderRefund,
  updateOrderShipping,
  updateOrderStatus,
} from "../orders-api";
import type {
  AdminCatalogAttributeDefinition,
  CatalogFacets,
  CatalogProduct,
} from "../catalog-api";
import type { OrderDetail, OrderStatus, OrderSummary } from "../orders-api";
import type { CatalogProductPage } from "../catalog-api";
import { fetchStaffAccounts, updateStaffAccountRole } from "../staff-accounts-api";
import type { StaffAccount } from "../staff-accounts-api";
import {
  getDemoCustomers,
  money,
} from "../demo/demo-store";
import type { DemoCustomer } from "../demo/demo-store";
import {
  Badge,
  Card,
  ConfirmationModal,
  DataTable,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  Toast,
} from "./components";
import { RoleGate } from "./CustomerScreens";
import { FacetManagementPage } from "./CatalogScreens";
import {
  attributeEnglishLabel,
  attributeLabel,
  groupSpecificationDefinitions,
  TechnicalSpecifications,
} from "./product-information";
import { specificationDisplayPolicy } from "./specification-metadata";
import { useAuth } from "./auth";

const draftKey = "pcbs.v2.demo.product-draft.v1";
const demoLabel = "DỮ LIỆU DEMO — CHƯA ĐƯỢC LƯU VÀO DATABASE";
const orderStatusText: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  READY_TO_SHIP: "Sẵn sàng giao",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLATION_REQUESTED: "Yêu cầu hủy",
  CANCELLED: "Đã hủy",
};
const nextOrderStatuses: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPING", "CANCELLATION_REQUESTED", "CANCELLED"],
  CONFIRMED: ["PENDING_CONFIRMATION", "PROCESSING", "READY_TO_SHIP", "SHIPPING", "CANCELLATION_REQUESTED", "CANCELLED"],
  PROCESSING: ["PENDING_CONFIRMATION", "CONFIRMED", "READY_TO_SHIP", "SHIPPING", "CANCELLATION_REQUESTED", "CANCELLED"],
  READY_TO_SHIP: ["PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "SHIPPING", "CANCELLATION_REQUESTED", "CANCELLED"],
  SHIPPING: ["DELIVERED"],
};

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

export function DashboardPage() {
  const [result, setResult] = useState<CatalogProductPage>();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogProducts({ page: 1, limit: 1 }, controller.signal).then(
      setResult,
      (reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải catalog."); },
    ).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (user?.roleCode !== "ADMIN") return;
    let active = true;
    void fetchAdminOrders().then((items) => {
      if (active) setOrders(items);
    }).catch((reason: unknown) => {
      if (active) setOrderError(reason instanceof Error ? reason.message : "Không thể tải đơn hàng.");
    });
    return () => { active = false; };
  }, [user?.roleCode]);
  return <RoleGate audience="staff"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Admin / Sales</p><h1>Tổng quan điều hành</h1></div></div>
    {loading && <LoadingState message="Đang tải số lượng catalog…" />}{error && <ErrorState title="Catalog không khả dụng" message={error} />}
    <div className="v2-metric-grid">
      <Card><p className="v2-metric-label">Sản phẩm trong catalog</p><strong className="v2-metric-value">{result?.pagination.total ?? "—"}</strong><span>Đếm từ API trực tiếp</span></Card>
      {user?.roleCode === "ADMIN" && <Card><p className="v2-metric-label">Đơn hàng trong hệ thống</p><strong className="v2-metric-value">{orders.length}</strong><span>Giới hạn tối đa 200 đơn mới nhất</span></Card>}
      {user?.roleCode === "ADMIN" && <Card><p className="v2-metric-label">Đơn đang chờ xử lý</p><strong className="v2-metric-value">{orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status)).length}</strong><span>Trạng thái do Admin cập nhật thủ công</span></Card>}
    </div>
    {user?.roleCode === "ADMIN" && <Card title="Đơn hàng gần đây" action={<Link to="/admin/orders">Quản lý đơn →</Link>}>
      {orderError && <ErrorState title="Không thể tải đơn hàng" message={orderError} />}
      {orders.length ? <DataTable<OrderSummary> columns={[
        { key: "code", header: "Mã đơn", render: (order) => <span className="v2-mono">{order.orderNumber}</span> },
        { key: "customer", header: "Khách hàng", render: (order) => order.customerName },
        { key: "status", header: "Trạng thái", render: (order) => <Badge>{orderStatusText[order.status]}</Badge> },
        { key: "payment", header: "Thanh toán", render: (order) => order.paymentStatus || "—" },
      ]} rows={orders.slice(0, 5)} getRowKey={(order) => order.orderNumber} /> : !orderError && <EmptyState title="Chưa có đơn hàng" message="Đơn hàng trong hệ thống sẽ hiển thị tại đây." />}
    </Card>}
    <div className="v2-quick-links">{[["Sản phẩm", "/admin/products"], ["Tạo / sửa bản nháp", "/admin/product-edit"], ["CSV preview", "/admin/csv-import"], ["Danh mục", "/admin/categories"], ["Thương hiệu", "/admin/brands"], ["Nhân viên", "/admin/staff"]].map(([label, path]) => <Link className="v2-category-card" key={path} to={path}>{label} →</Link>)}</div>
  </div></RoleGate>;
}

interface ProductDraft {
  productName: string;
  modelCode: string;
  productType: string;
  categoryCode: string;
  brandName: string;
  description: string;
  offerPrice: string;
  stockQuantity: string;
  condition: "NEW" | "LIKE_NEW" | "USED";
  warrantyMonths: string;
  productStatus: "ACTIVE";
  offerStatus: "ACTIVE";
  specifications: Record<string, string>;
}

const emptyDraft: ProductDraft = {
  productName: "", modelCode: "", productType: "", categoryCode: "", brandName: "",
  description: "", offerPrice: "", stockQuantity: "", condition: "NEW", warrantyMonths: "",
  productStatus: "ACTIVE", offerStatus: "ACTIVE",
  specifications: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDraft(): ProductDraft {
  const stored = localStorage.getItem(draftKey);
  if (stored === null) return emptyDraft;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch (reason) {
    throw new Error("The saved product draft is not valid JSON.", { cause: reason });
  }
  if (!isRecord(value)) {
    throw new Error("The saved product draft has an invalid format.");
  }
  const text = (key: string) => {
    const field = value[key];
    if (typeof field !== "string") throw new Error(`The saved product draft field "${key}" is invalid.`);
    return field;
  };
  const activeStatus = (key: string): "ACTIVE" => {
    const field = value[key] ?? "ACTIVE";
    if (field !== "ACTIVE") throw new Error(`The saved product draft field "${key}" is invalid.`);
    return field;
  };
  const condition = value.condition;
  if (condition !== "NEW" && condition !== "LIKE_NEW" && condition !== "USED") {
    throw new Error("The saved product draft condition is invalid.");
  }
  const specifications = value.specifications;
  if (!isRecord(specifications)) {
    throw new Error("The saved product draft specifications are invalid.");
  }
  const parsedSpecifications: Record<string, string> = {};
  for (const [key, item] of Object.entries(specifications)) {
    if (typeof item === "string") parsedSpecifications[key] = item;
    else if (typeof item === "number" || typeof item === "boolean") parsedSpecifications[key] = String(item);
    else parsedSpecifications[key] = JSON.stringify(item);
  }
  return {
    productName: text("productName"),
    modelCode: text("modelCode"),
    productType: text("productType"),
    categoryCode: text("categoryCode"),
    brandName: text("brandName"),
    description: text("description"),
    offerPrice: text("offerPrice"),
    stockQuantity: text("stockQuantity"),
    condition,
    warrantyMonths: text("warrantyMonths"),
    productStatus: activeStatus("productStatus"),
    offerStatus: activeStatus("offerStatus"),
    specifications: parsedSpecifications,
  };
}

function parseTypedSpecifications(
  input: Record<string, string>,
  productType: string,
  definitions: AdminCatalogAttributeDefinition[],
  clearEmpty = false,
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  for (const [code, rawValue] of Object.entries(input)) {
    const definition = definitions.find((item) => item.productType === productType && item.code === code);
    if (!definition) throw new Error(`Thuộc tính "${code}" không còn được định nghĩa cho loại sản phẩm này.`);
    if (rawValue === "") {
      if (clearEmpty) parsed[code] = null;
      continue;
    }
    switch (definition.dataType) {
      case "TEXT":
        if (definition.options?.length && !definition.options.includes(rawValue)) {
          throw new Error(`${definition.label} phải chọn một trong các giá trị đã định nghĩa.`);
        }
        parsed[code] = rawValue;
        break;
      case "INTEGER": {
        const value = Number(rawValue);
        if (!Number.isSafeInteger(value)) throw new Error(`${definition.label} phải là số nguyên.`);
        parsed[code] = value;
        break;
      }
      case "DECIMAL": {
        const value = Number(rawValue);
        if (!Number.isFinite(value)) throw new Error(`${definition.label} phải là số thập phân hợp lệ.`);
        parsed[code] = value;
        break;
      }
      case "BOOLEAN":
        if (rawValue !== "true" && rawValue !== "false") throw new Error(`${definition.label} phải là true hoặc false.`);
        parsed[code] = rawValue === "true";
        break;
      case "JSON":
        try {
          parsed[code] = JSON.parse(rawValue);
        } catch {
          throw new Error(`${definition.label} phải là JSON hợp lệ.`);
        }
        break;
    }
  }
  return parsed;
}

function specificationInputValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return typeof value === "object" ? JSON.stringify(value, null, 2) ?? "" : String(value);
}

function GpuSpecificationEditor({ definitions }: { definitions: AdminCatalogAttributeDefinition[] }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [modelCode, setModelCode] = useState("");
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const gpuDefinitions = definitions.filter((definition) => definition.productType === "GPU");
  const groups = groupSpecificationDefinitions("GPU", definitions, specifications);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogProducts({ type: "GPU", page: 1, limit: 100 }, controller.signal).then(
      (result) => setProducts(result.data),
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Không thể tải GPU từ catalog.");
        }
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoadingProducts(false);
    });
    return () => controller.abort();
  }, []);

  const selectProduct = async (nextModelCode: string) => {
    setModelCode(nextModelCode);
    setError("");
    setNotice("");
    setSpecifications({});
    if (!nextModelCode) return;
    setLoadingProduct(true);
    try {
      const { data } = await fetchAdminCatalogProduct(nextModelCode);
      if (data.productType !== "GPU") throw new Error("Sản phẩm được chọn không phải GPU.");
      setSpecifications(Object.fromEntries(
        gpuDefinitions.map((definition) => [
          definition.code,
          specificationInputValue(data.specifications[definition.code]),
        ]),
      ));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải thông số GPU.");
      setModelCode("");
    } finally {
      setLoadingProduct(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modelCode) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const typedSpecifications = parseTypedSpecifications(
        specifications,
        "GPU",
        definitions,
        true,
      );
      await updateGpuCatalogSpecifications(modelCode, typedSpecifications);
      const { data } = await fetchAdminCatalogProduct(modelCode);
      setSpecifications(Object.fromEntries(
        gpuDefinitions.map((definition) => [
          definition.code,
          specificationInputValue(data.specifications[definition.code]),
        ]),
      ));
      setNotice(`Đã lưu thông số cho ${modelCode} vào catalog.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu thông số GPU.");
    } finally {
      setSaving(false);
    }
  };

  return <Card
    title="Cập nhật thông số GPU trong catalog"
    description="Lưu vào product_attribute_definitions / product_attribute_values qua API có bảo vệ quyền nhân viên. Ô trống sẽ xóa giá trị của trường đó."
  >
    <FormField label="Model GPU hiện có" htmlFor="gpu-catalog-model">
      <select
        id="gpu-catalog-model"
        className="v2-form-input"
        value={modelCode}
        disabled={loadingProducts || saving}
        onChange={(event) => void selectProduct(event.target.value)}
      >
        <option value="">Chọn model GPU</option>
        {products.map((product) => (
          <option key={product.modelCode} value={product.modelCode}>
            {product.modelCode} · {product.productName}
          </option>
        ))}
      </select>
    </FormField>
    {loadingProducts && <LoadingState message="Đang tải GPU trong catalog…" />}
    {loadingProduct && <LoadingState message="Đang tải thông số model…" />}
    {modelCode && !loadingProduct && <form onSubmit={save}>
      {groups.map((group) => <details className="v2-editor-spec-group" key={group.id} open>
        <summary><strong>{group.label}</strong><span>{group.definitions.length} trường</span></summary>
        <div className="v2-form-grid">{group.definitions.map((attribute) => {
          const inputId = `gpu-catalog-${attribute.code}`;
          const label = `${attributeLabel(definitions, "GPU", attribute.code)}${attribute.unit ? ` (${attribute.unit})` : ""}`;
          const value = specifications[attribute.code] ?? "";
          const onChange = (next: string) => {
            setError("");
            setNotice("");
            setSpecifications((current) => ({ ...current, [attribute.code]: next }));
          };
          let control;
          if (attribute.dataType === "BOOLEAN") {
            control = <select id={inputId} className="v2-form-input" value={value}
              onChange={(event) => onChange(event.target.value)}>
              <option value="">Chưa có dữ liệu</option>
              <option value="true">Có</option>
              <option value="false">Không</option>
            </select>;
          } else if (attribute.options?.length) {
            control = <select id={inputId} className="v2-form-input" value={value}
              onChange={(event) => onChange(event.target.value)}>
              <option value="">Chưa có dữ liệu</option>
              {attribute.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>;
          } else if (attribute.dataType === "JSON" || attribute.inputMode === "TEXTAREA") {
            control = <textarea id={inputId} className="v2-form-input v2-mono" rows={4}
              value={value} onChange={(event) => onChange(event.target.value)}
              placeholder={attribute.dataType === "JSON" ? '["item"] or [{"type":"DisplayPort","count":3,"version":"2.1"}]' : undefined} />;
          } else {
            control = <input id={inputId} className="v2-form-input"
              type={attribute.dataType === "TEXT" ? "text" : "number"}
              step={attribute.dataType === "INTEGER" ? "1" : attribute.dataType === "DECIMAL" ? "any" : undefined}
              value={value} onChange={(event) => onChange(event.target.value)} />;
          }
          const englishLabel = attributeEnglishLabel(definitions, "GPU", attribute.code);
          const scopeHint = attribute.specificationScope === "GPU_SILICON"
            ? " · chip GPU (không tự sao chép)"
            : attribute.specificationScope === "BOARD_VARIANT" ? " · biến thể bo mạch" : "";
          return <FormField key={attribute.code} label={label} htmlFor={inputId}
            hint={`${attribute.dataType}${englishLabel ? ` · ${englishLabel}` : ""}${attribute.options?.length ? " · danh sách giá trị hợp lệ" : ""}${attribute.inputMode === "JSON_ARRAY" ? " · mảng JSON" : ""}${scopeHint}`}>
            {control}
          </FormField>;
        })}</div>
      </details>)}
      {error && <p className="v2-inline-error" role="alert">{error}</p>}
      {notice && <p className="v2-inline-success" role="status">{notice}</p>}
      <button className="v2-button v2-button-primary" type="submit" disabled={saving}>
        {saving ? "Đang lưu…" : "Lưu thông số GPU"}
      </button>
    </form>}
    {error && !modelCode && <p className="v2-inline-error" role="alert">{error}</p>}
  </Card>;
}

export function ProductEditPage() {
  const [draft, setDraft] = useState(readDraft);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [facets, setFacets] = useState<CatalogFacets>();
  const [definitions, setDefinitions] = useState<AdminCatalogAttributeDefinition[]>([]);
  const [facetError, setFacetError] = useState("");
  const [specificationError, setSpecificationError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogFacets(controller.signal).then(
      (response) => setFacets(response.data),
      (reason: unknown) => {
        if (!controller.signal.aborted) setFacetError(reason instanceof Error ? reason.message : "Không thể tải danh mục.");
      },
    );
    void fetchAdminCatalogAttributeDefinitions(controller.signal).then(
      (response) => setDefinitions(response.data),
      (reason: unknown) => {
        if (!controller.signal.aborted) setFacetError(reason instanceof Error ? reason.message : "Không thể tải định nghĩa thuộc tính.");
      },
    );
    return () => controller.abort();
  }, []);
  const setField = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const attributeGroups = draft.productType
    ? groupSpecificationDefinitions(draft.productType, definitions, draft.specifications)
    : [];
  const typedPreviewSpecifications = useMemo(() => {
    try {
      return parseTypedSpecifications(draft.specifications, draft.productType, definitions);
    } catch (reason) {
      return undefined;
    }
  }, [definitions, draft.productType, draft.specifications]);
  return <RoleGate audience="staff"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Quản lý catalog</p><h1>Thông số sản phẩm</h1></div><Badge tone="success">GPU lưu qua API</Badge></div>
    <GpuSpecificationEditor definitions={definitions} />
    <p className="v2-demo-banner">{demoLabel}. Lưu bản nháp chỉ trong trình duyệt này; không tạo sản phẩm/offer.</p>
    <Card title="Thông tin model" description="Thông tin danh tính sản phẩm, tách biệt với ưu đãi bán hàng.">
      <div className="v2-form-grid">
        <FormField label="Tên sản phẩm" htmlFor="draft-name"><input id="draft-name" className="v2-form-input" value={draft.productName} onChange={(event) => setField("productName", event.target.value)} /></FormField>
        <FormField label="Mã model" htmlFor="draft-model"><input id="draft-model" className="v2-form-input v2-mono" value={draft.modelCode} onChange={(event) => setField("modelCode", event.target.value)} /></FormField>
        <FormField label="Loại sản phẩm" htmlFor="draft-type"><select id="draft-type" className="v2-form-input" value={draft.productType} onChange={(event) => {
          setField("productType", event.target.value);
          setField("specifications", {});
        }}><option value="">Chọn loại</option>{(facets?.productTypes ?? []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FormField>
        <FormField label="Danh mục" htmlFor="draft-category"><select id="draft-category" className="v2-form-input" value={draft.categoryCode} onChange={(event) => setField("categoryCode", event.target.value)}><option value="">Chọn danh mục</option>{(facets?.categories ?? []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FormField>
        <FormField label="Thương hiệu" htmlFor="draft-brand"><select id="draft-brand" className="v2-form-input" value={draft.brandName} onChange={(event) => setField("brandName", event.target.value)}><option value="">Chọn thương hiệu</option>{(facets?.brands ?? []).map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}</select></FormField>
        <FormField label="Mô tả" htmlFor="draft-description"><textarea id="draft-description" className="v2-form-input" rows={3} value={draft.description} onChange={(event) => setField("description", event.target.value)} /></FormField>
      </div>
      {facetError && <p className="v2-inline-error" role="alert">Không tải được định nghĩa thuộc tính: {facetError}</p>}
      <h2 className="v2-card-title">Thuộc tính kỹ thuật theo catalog</h2>
      {attributeGroups.length > 0 ? <div className="v2-editor-spec-groups">{attributeGroups.map((group) => <details className="v2-editor-spec-group" key={group.id} open>
        <summary><strong>{group.label}</strong><span>{group.definitions.length} trường</span></summary>
        <div className="v2-form-grid">{group.definitions.map((attribute) => {
          const inputId = `draft-attribute-${attribute.productType}-${attribute.code}`;
          const label = `${attributeLabel(definitions, attribute.productType, attribute.code)}${attribute.unit ? ` (${attribute.unit})` : ""}`;
          const englishLabel = attributeEnglishLabel(definitions, attribute.productType, attribute.code);
          const value = draft.specifications[attribute.code] ?? "";
          const onChange = (next: string) => {
            setSpecificationError("");
            setField("specifications", { ...draft.specifications, [attribute.code]: next });
          };
          let control;
          if (attribute.dataType === "BOOLEAN") {
            control = <select id={inputId} className="v2-form-input" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Chưa nhập</option><option value="true">Có (true)</option><option value="false">Không (false)</option></select>;
          } else if (attribute.options?.length) {
            control = <select id={inputId} className="v2-form-input" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Chưa nhập</option>{attribute.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
          } else if (attribute.dataType === "JSON" || attribute.inputMode === "TEXTAREA") {
            control = <textarea id={inputId} className="v2-form-input v2-mono" rows={4} value={value} placeholder={attribute.dataType === "JSON" ? '["item"] or [{"type":"DisplayPort","count":3,"version":"2.1"}]' : undefined} onChange={(event) => onChange(event.target.value)} />;
          } else {
            control = <input id={inputId} className="v2-form-input" type={attribute.dataType === "TEXT" ? "text" : "number"} step={attribute.dataType === "INTEGER" ? "1" : attribute.dataType === "DECIMAL" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />;
          }
          const englishLabelHint = englishLabel ? ` · ${englishLabel}` : "";
          const scopeHint = attribute.specificationScope === "GPU_SILICON"
            ? " · chip GPU (không tự sao chép)"
            : attribute.specificationScope === "BOARD_VARIANT" ? " · biến thể bo mạch" : "";
          const policy = specificationDisplayPolicy(draft.productType, attribute);
          const policyLabel = { required: "Mức độ: Bắt buộc", conditional: "Mức độ: Theo loại", optional: "Mức độ: Tùy chọn" }[policy];
          return <FormField label={label} htmlFor={inputId} hint={`${attribute.productType}${englishLabelHint} · ${attribute.dataType} · ${policyLabel}${attribute.filterable ? " · có thể lọc" : ""}${scopeHint}`} key={`${attribute.productType}:${attribute.code}`}>
            {control}
          </FormField>;
        })}</div>
      </details>)}</div> : <p className="v2-muted">Chọn loại sản phẩm để tải định nghĩa thuộc tính từ PostgreSQL.</p>}
      {specificationError && <p className="v2-inline-error" role="alert">{specificationError}</p>}
    </Card>
    <Card title="Ưu đãi bán hàng" description="Các trường giá/tồn kho thuộc offer, không thuộc model.">
      <div className="v2-form-grid">
        <FormField label="Giá demo" htmlFor="draft-price"><input id="draft-price" className="v2-form-input" inputMode="decimal" value={draft.offerPrice} onChange={(event) => setField("offerPrice", event.target.value)} /></FormField>
        <FormField label="Số lượng minh họa" htmlFor="draft-stock"><input id="draft-stock" className="v2-form-input" inputMode="numeric" value={draft.stockQuantity} onChange={(event) => setField("stockQuantity", event.target.value)} /></FormField>
        <FormField label="Tình trạng" htmlFor="draft-condition"><select id="draft-condition" className="v2-form-input" value={draft.condition} onChange={(event) => setField("condition", event.target.value as ProductDraft["condition"])}><option>NEW</option><option>LIKE_NEW</option><option>USED</option></select></FormField>
        <FormField label="Bảo hành (tháng)" htmlFor="draft-warranty"><input id="draft-warranty" className="v2-form-input" inputMode="numeric" value={draft.warrantyMonths} onChange={(event) => setField("warrantyMonths", event.target.value)} /></FormField>
        <FormField label="Trạng thái sản phẩm theo nguồn hiện có" htmlFor="draft-product-status"><select id="draft-product-status" className="v2-form-input" value={draft.productStatus} disabled><option value="ACTIVE">ACTIVE</option></select></FormField>
        <FormField label="Trạng thái offer theo nguồn hiện có" htmlFor="draft-offer-status"><select id="draft-offer-status" className="v2-form-input" value={draft.offerStatus} disabled><option value="ACTIVE">ACTIVE</option></select></FormField>
      </div>
      <div className="v2-action-row"><PrimaryButton type="button" onClick={() => {
        try {
          const specifications = parseTypedSpecifications(draft.specifications, draft.productType, definitions);
          localStorage.setItem(draftKey, JSON.stringify({ ...draft, specifications }));
          setSaved(true);
          setSpecificationError("");
          setNotice("Bản nháp đã lưu trong trình duyệt này, chưa gửi tới backend.");
        } catch (reason) {
          setSaved(false);
          const message = reason instanceof Error ? reason.message : "Không thể lưu bản nháp vào trình duyệt.";
          setSpecificationError(message);
          setNotice(`Không thể lưu bản nháp: ${message}`);
        }
      }}>Lưu bản nháp cục bộ</PrimaryButton><SecondaryButton type="button" onClick={() => {
        try {
          localStorage.removeItem(draftKey);
          setDraft(emptyDraft);
          setSaved(false);
          setNotice("Đã xóa bản nháp cục bộ.");
        } catch (reason) {
          setSaved(false);
          setNotice(reason instanceof Error ? `Không thể xóa bản nháp: ${reason.message}` : "Không thể xóa bản nháp.");
        }
      }}>Xóa bản nháp</SecondaryButton></div>
      {notice && <p className={saved ? "v2-inline-success" : notice.startsWith("Không thể") ? "v2-inline-error" : "v2-muted"} role={notice.startsWith("Không thể") ? "alert" : "status"}>{notice}</p>}
    </Card>
    <Card title="Xem trước bản nháp">
      <div className="v2-draft-preview"><div className="v2-product-placeholder"><span aria-hidden="true">▦</span><p>Chưa có URL ảnh · minh họa trung tính</p></div><div><p className="v2-eyebrow">{draft.brandName || "Thương hiệu"} · {draft.productType || "Loại sản phẩm"}</p><h2>{draft.productName || "Tên sản phẩm"}</h2><p className="v2-mono">{draft.modelCode || "Mã model"}</p><p>{draft.description || "Mô tả sản phẩm"}</p><strong>{draft.offerPrice ? money(draft.offerPrice) : "Giá demo chưa nhập"}</strong><p className="v2-muted">Offer: {draft.condition} · tồn minh họa {draft.stockQuantity || "—"} · bảo hành {draft.warrantyMonths || "—"} tháng · product {draft.productStatus} · offer {draft.offerStatus}</p><p className="v2-muted">{Object.keys(draft.specifications).filter((code) => draft.specifications[code] !== "").length} thuộc tính kỹ thuật</p></div>
        {typedPreviewSpecifications && draft.productType && <TechnicalSpecifications productType={draft.productType} productTypeName={facets?.productTypes.find((item) => item.value === draft.productType)?.label ?? draft.productType} specifications={typedPreviewSpecifications} definitions={definitions} />}
      </div>
    </Card>
  </div></RoleGate>;
}

interface CsvPreview {
  fileName: string;
  headers: string[];
  rows: string[][];
  rowCount: number;
  errors: string[];
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(field.trim());
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field.trim());
  return fields;
}

export function CsvImportPage() {
  const [preview, setPreview] = useState<CsvPreview>();
  const [error, setError] = useState("");
  return <RoleGate audience="staff"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">CSV · preview cục bộ</p><h1>Nhập dữ liệu CSV</h1></div><Badge tone="gold">Chưa kết nối API import</Badge></div>
    <p className="v2-demo-banner">{demoLabel}. Chọn tệp chỉ đọc nội dung trong trình duyệt; không gọi startup importer và không ghi database.</p>
    <Card title="Chọn tệp CSV">
      <label className="v2-field">Tệp CSV<input className="v2-form-input" type="file" accept=".csv,text/csv" onChange={(event) => {
        const file = event.target.files?.[0];
        setPreview(undefined);
        setError("");
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".csv")) {
          setError("Vui lòng chọn tệp .csv.");
          return;
        }
        void file.text().then((text) => {
          const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
          if (!lines.length) {
            setError("Tệp CSV không có dữ liệu.");
            return;
          }
          const headers = parseCsvLine(lines[0]);
          const errors = headers.length === new Set(headers).size ? [] : ["Tên cột bị trùng."];
          if (!headers.length || headers.some((header) => !header)) errors.push("Có cột không có tên.");
          const rows = lines.slice(1).map(parseCsvLine);
          if (rows.some((row) => row.length !== headers.length)) errors.push("Một hoặc nhiều dòng có số cột không khớp tiêu đề.");
          setPreview({ fileName: file.name, headers, rows: rows.slice(0, 8), rowCount: rows.length, errors });
        }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể đọc tệp CSV."));
      }} /></label>
      {error && <p className="v2-inline-error" role="alert">{error}</p>}
      {preview && <div className="v2-csv-preview"><p><strong>{preview.fileName}</strong> · {preview.rowCount} dòng · hiển thị tối đa 8 dòng</p><p className="v2-muted">Các cột thông số và warranty trong tệp được giữ nguyên theo header/value để xem trước; chưa đối chiếu hoặc nhập vào schema.</p>{preview.errors.length ? <ul className="v2-inline-error">{preview.errors.map((item) => <li key={item}>{item}</li>)}</ul> : <Badge tone="success">Kiểm tra cấu trúc cơ bản đạt</Badge>}<div className="v2-table-wrap"><table className="v2-table"><thead><tr>{preview.headers.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead><tbody>{preview.rows.map((row, index) => <tr key={index}>{preview.headers.map((header, column) => <td key={`${header}-${column}`}>{row[column] ?? "—"}</td>)}</tr>)}</tbody></table></div></div>}
      <SecondaryButton type="button" disabled>Import vào database chưa khả dụng</SecondaryButton>
    </Card>
  </div></RoleGate>;
}

export function OrdersManagementPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<
    "cancelOrder" | "approveCancellation" | "retryRefund" | null
  >(null);

  const reload = async (search = query) => {
    setLoading(true);
    setError("");
    try {
      setOrders(await fetchAdminOrders({ q: search.trim() }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải đơn hàng.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void reload(""); }, []);

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

  const confirmPendingAction = async () => {
    if (!pendingConfirmation) return;
    if (pendingConfirmation === "cancelOrder") await saveStatus();
    else if (pendingConfirmation === "approveCancellation") await decideCancellation(true);
    else await retryRefund();
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

  return <RoleGate audience="admin"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Admin · vận hành đơn hàng</p><h1>Quản lý đơn hàng</h1></div><Badge>Trạng thái do Admin kiểm soát</Badge></div>
    {error && <ErrorState title="Thao tác đơn hàng không thành công" message={error} />}
    <Card title="Đơn hàng" action={<form className="v2-search-form" onSubmit={(event) => {
      event.preventDefault();
      void reload(query);
    }}>
      <input className="v2-form-input v2-management-search" placeholder="Tìm mã đơn, tên, email, điện thoại"
        value={query} onChange={(event) => setQuery(event.target.value)} />
      <PrimaryButton type="submit" disabled={loading}>Tìm kiếm</PrimaryButton>
    </form>}>
      {loading && <LoadingState message="Đang tải đơn hàng…" />}
      {!loading && orders.length === 0 && !error && <EmptyState title="Chưa có đơn hàng" message="Không có đơn hàng phù hợp trong dữ liệu đã lưu." />}
      {!loading && orders.length > 0 && <div className="v2-table-wrap"><table className="v2-table">
        <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Trạng thái</th><th>Thanh toán</th><th>Ngày đặt</th><th></th></tr></thead>
        <tbody>{orders.map((order) => <tr key={order.orderNumber}>
          <td className="v2-mono">{order.orderNumber}</td>
          <td>{order.customerName}<small className="v2-table-subtext">{order.customerEmail}</small></td>
          <td>{orderStatusText[order.status]}</td><td>{order.paymentStatus || "—"}</td>
          <td>{formatOrderDate(order.placedAt)}</td>
          <td><SecondaryButton type="button" onClick={() => void openOrder(order.orderNumber)}>Mở</SecondaryButton></td>
        </tr>)}</tbody>
      </table></div>}
    </Card>
    {selected && <Card title={`Đơn ${selected.order.orderNumber}`}>
      <dl className="v2-profile-grid">
        <div><dt>Khách hàng</dt><dd>{selected.order.customerName} · {selected.order.customerEmail}</dd></div>
        <div><dt>Điện thoại</dt><dd>{selected.order.customerPhone || "—"}</dd></div>
        <div><dt>Trạng thái hiện tại</dt><dd>{orderStatusText[selected.order.status]}</dd></div>
        <div><dt>Thanh toán (độc lập)</dt><dd>{selected.order.paymentStatus || "—"} · {selected.order.paymentMethod || "—"}</dd></div>
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

      {selected.refundRetryAvailable && <div className="v2-action-row">
        <p>Hoàn tiền lần trước thất bại.</p>
        <SecondaryButton type="button" disabled={busy} onClick={() => setPendingConfirmation("retryRefund")}>
          Thử lại hoàn tiền
        </SecondaryButton>
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
      {selected.statusHistory.length ? <ol className="v2-status-history">{selected.statusHistory.map((entry, index) => <li key={`${entry.createdAt}-${index}`}>
        <strong>{entry.action}</strong> · {entry.previousStatus ?? "—"} → {entry.newStatus}
        <small className="v2-table-subtext">{formatOrderDate(entry.createdAt)} · {entry.actorName} ({entry.actorRole})</small>
        {entry.note && <p>{entry.note}</p>}
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
          : "Xác nhận hủy đơn hàng"}
      message={pendingConfirmation === "retryRefund"
        ? "Bạn có chắc chắn muốn thử lại khoản hoàn tiền bị lỗi? Khoản hoàn tiền đã hoàn tất sẽ không thể thực hiện lại."
        : pendingConfirmation === "approveCancellation"
          ? "Bạn có chắc chắn muốn phê duyệt yêu cầu hủy đơn hàng này?"
          : "Bạn có chắc chắn muốn hủy đơn hàng này? Nếu đã thanh toán, hệ thống sẽ xử lý hoàn tiền mô phỏng."}
      details={selected ? [
        { label: "Mã đơn hàng", value: selected.order.orderNumber },
        { label: "Trạng thái hiện tại", value: orderStatusText[selected.order.status] },
        { label: "Thanh toán", value: selected.order.paymentStatus || "Chưa ghi nhận" },
      ] : []}
      confirmLabel={pendingConfirmation === "retryRefund"
        ? "Xác nhận thử lại"
        : pendingConfirmation === "approveCancellation"
          ? "Xác nhận phê duyệt"
          : "Xác nhận hủy đơn"}
    />
  </div></RoleGate>;
}

export function CustomerLookupPage() {
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const customers = getDemoCustomers();
  const matches = searched ? customers.filter((customer) => customer.phone === phone.trim()) : [];
  return <RoleGate audience="staff"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Tra cứu cục bộ</p><h1>Tra cứu khách hàng</h1></div><Badge tone="gold">Dữ liệu mẫu</Badge></div>
    <p className="v2-demo-banner">{demoLabel}. Đây không phải truy vấn tới tài khoản PostgreSQL.</p>
    <Card title="Tra cứu theo số điện thoại" description="Chỉ khớp chính xác với số điện thoại trong bộ dữ liệu mẫu.">
      <form className="v2-search-form" onSubmit={(event) => { event.preventDefault(); setSearched(true); }}>
        <input className="v2-form-input" type="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setSearched(false); }} placeholder="Nhập số điện thoại mẫu" aria-label="Số điện thoại" />
        <PrimaryButton type="submit">Tra cứu demo</PrimaryButton>
      </form>
      {searched && (matches.length ? <DataTable<DemoCustomer> columns={[
        { key: "name", header: "Tên mẫu", render: (customer) => customer.fullName },
        { key: "phone", header: "Điện thoại mẫu", render: (customer) => customer.phone },
        { key: "email", header: "Email mẫu", render: (customer) => customer.email },
        { key: "segment", header: "Nhóm", render: (customer) => customer.segment },
      ]} rows={matches} getRowKey={(customer) => customer.phone} /> : <EmptyState title="Không tìm thấy khách hàng mẫu" message="Không có kết quả khớp với số điện thoại đã nhập." />)}
    </Card>
  </div></RoleGate>;
}

export function StaffRolesPage() {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [pendingAccount, setPendingAccount] = useState<StaffAccount | null>(null);

  const refresh = async (search: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      setAccounts(await fetchStaffAccounts(search));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách tài khoản.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void refresh("");
  }, []);

  const search = (event: FormEvent) => {
    event.preventDefault();
    const nextQuery = query.trim();
    setAppliedQuery(nextQuery);
    void refresh(nextQuery);
  };

  const changeRole = async () => {
    if (!pendingAccount) return;
    const account = pendingAccount;
    const nextRole = account.roleCode === "CUSTOMER" ? "SALES" : "CUSTOMER";
    setSavingUserId(account.userId);
    setError("");
    setToast(null);
    try {
      const updatedAccount = await updateStaffAccountRole(account.userId, nextRole);
      setAccounts((current) => current.map((item) =>
        item.userId === updatedAccount.userId ? updatedAccount : item));
      setPendingAccount(null);
      setToast({ message: `Đã cập nhật vai trò cho ${updatedAccount.fullName}.`, tone: "success" });
      void refresh(appliedQuery, false);
    } catch (reason) {
      setPendingAccount(null);
      setToast({
        message: reason instanceof Error ? reason.message : "Không thể cập nhật vai trò tài khoản.",
        tone: "error",
      });
    } finally {
      setSavingUserId("");
    }
  };

  return <RoleGate audience="admin"><div className="v2-page">
    <div className="v2-page-title"><div><p className="v2-eyebrow">Quản lý quyền truy cập</p><h1>Nhân viên và vai trò</h1></div></div>
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    <Card title="Tài khoản hiện có">
      <form className="v2-search-form" onSubmit={search}>
        <input className="v2-form-input v2-management-search" value={query}
          onChange={(event) => setQuery(event.target.value)} maxLength={120}
          placeholder="Tìm theo tên hoặc email" aria-label="Tìm theo tên hoặc email" />
        <PrimaryButton type="submit" disabled={loading}>Tìm kiếm</PrimaryButton>
      </form>
      {loading && <LoadingState message="Đang tải tài khoản…" />}
      {!loading && accounts.length === 0 && !error && <EmptyState title="Không tìm thấy tài khoản" message="Thử tìm theo tên hoặc email khác." />}
      {!loading && accounts.length > 0 && <div className="v2-table-wrap">
        <table className="v2-table">
          <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái tài khoản</th><th>Thao tác</th></tr></thead>
          <tbody>{accounts.map((account) => {
            const canChange = account.roleCode === "CUSTOMER" || account.roleCode === "SALES";
            return <tr key={account.userId}>
              <td>{account.fullName}</td>
              <td>{account.email}</td>
              <td><Badge>{account.roleCode}</Badge></td>
              <td>{account.accountStatus}</td>
              <td>{canChange
                ? <SecondaryButton type="button" disabled={loading || savingUserId === account.userId}
                    onClick={() => { setToast(null); setPendingAccount(account); }}>
                    {savingUserId === account.userId
                      ? "Đang lưu…"
                      : account.roleCode === "CUSTOMER" ? "Cấp quyền SALES" : "Thu hồi quyền SALES"}
                  </SecondaryButton>
                : <span className="v2-muted">Không thể thay đổi</span>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </Card>
    <ConfirmationModal
      open={pendingAccount !== null}
      onClose={() => {
        if (!pendingAccount || savingUserId !== pendingAccount.userId) setPendingAccount(null);
      }}
      onConfirm={() => void changeRole()}
      busy={pendingAccount !== null && savingUserId === pendingAccount.userId}
      title={pendingAccount?.roleCode === "CUSTOMER"
        ? "Xác nhận cấp quyền nhân viên"
        : "Xác nhận thu hồi quyền nhân viên"}
      message={pendingAccount?.roleCode === "CUSTOMER"
        ? `Bạn có chắc chắn muốn cấp quyền Nhân viên bán hàng cho ${pendingAccount.fullName}?`
        : `Bạn có chắc chắn muốn thu hồi quyền Nhân viên bán hàng của ${pendingAccount?.fullName ?? ""}?`}
      details={pendingAccount ? [
        { label: "Email tài khoản", value: pendingAccount.email },
        { label: "Vai trò hiện tại", value: pendingAccount.roleCode === "CUSTOMER" ? "CUSTOMER · Khách hàng" : "SALES · Nhân viên bán hàng" },
        { label: "Vai trò mới", value: pendingAccount.roleCode === "CUSTOMER" ? "SALES · Nhân viên bán hàng" : "CUSTOMER · Khách hàng" },
      ] : []}
      confirmLabel={pendingAccount?.roleCode === "CUSTOMER"
        ? "Xác nhận cấp quyền"
        : "Xác nhận thu hồi quyền"}
    />
  </div></RoleGate>;
}

export function CategoriesAdminPage() {
  return <RoleGate audience="staff"><FacetManagementPage kind="categories" /></RoleGate>;
}

export function BrandsAdminPage() {
  return <RoleGate audience="staff"><FacetManagementPage kind="brands" /></RoleGate>;
}
