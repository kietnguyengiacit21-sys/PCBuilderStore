import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  deleteAdminProductImage,
  fetchAdminCatalogAttributeDefinitions,
  fetchAdminManagedProduct,
  fetchAdminProducts,
  fetchCatalogFacets,
  fetchCatalogProducts,
  saveAdminOffer,
  saveAdminProduct,
  saveAdminProductBom,
  saveAdminProductImages,
  updateAdminProductStatus,
  uploadAdminProductMedia,
} from "../catalog-api";
import type {
  AdminBomComponent,
  AdminCatalogAttributeDefinition,
  AdminImage,
  AdminOffer,
  AdminProduct,
  AdminProductSummary,
  AdminProductWrite,
  CatalogFacets,
  CatalogProduct,
} from "../catalog-api";
import { money } from "../demo/demo-store";
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
import { TechnicalSpecifications } from "./product-information";
import { ProductUpgradeAdminPanel } from "./ProductUpgradeAdminPanel";

type ProductFields = {
  modelCode: string;
  productName: string;
  sku: string;
  slug: string;
  productType: string;
  categoryCode: string;
  brandName: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  tags: string;
  featured: boolean;
  displayOrder: string;
  contentSections: string;
};

type OfferFields = {
  offerId: string;
  condition: AdminOffer["condition"];
  price: string;
  compareAtPrice: string;
  currency: string;
  stockQuantity: string;
  warrantyMonths: string;
  status: AdminOffer["status"];
  minimumPurchaseQuantity: string;
  maximumPurchaseQuantity: string;
  lowStockThreshold: string;
};

const emptyProduct: ProductFields = {
  modelCode: "", productName: "", sku: "", slug: "", productType: "",
  categoryCode: "", brandName: "", shortDescription: "", description: "",
  seoTitle: "", seoDescription: "", tags: "", featured: false, displayOrder: "0",
  contentSections: "[]",
};

const emptyOffer: OfferFields = {
  offerId: "", condition: "NEW", price: "", compareAtPrice: "", currency: "VND",
  stockQuantity: "0", warrantyMonths: "0", status: "INACTIVE",
  minimumPurchaseQuantity: "1", maximumPurchaseQuantity: "100", lowStockThreshold: "",
};

function productFields(product: AdminProduct): ProductFields {
  return {
    modelCode: product.modelCode,
    productName: product.productName,
    sku: product.sku ?? "",
    slug: product.slug ?? "",
    productType: product.productType,
    categoryCode: product.categoryCode,
    brandName: product.brandName ?? "",
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    tags: product.tags.join(", "),
    featured: product.featured,
    displayOrder: String(product.displayOrder),
    contentSections: JSON.stringify(product.contentSections ?? [], null, 2),
  };
}

function offerFields(offer?: AdminOffer): OfferFields {
  return offer ? {
    offerId: offer.offerId,
    condition: offer.condition,
    price: String(offer.price),
    compareAtPrice: offer.compareAtPrice === null ? "" : String(offer.compareAtPrice),
    currency: offer.currency,
    stockQuantity: String(offer.stockQuantity),
    warrantyMonths: String(offer.warrantyMonths),
    status: offer.status,
    minimumPurchaseQuantity: String(offer.minimumPurchaseQuantity),
    maximumPurchaseQuantity: String(offer.maximumPurchaseQuantity),
    lowStockThreshold: offer.lowStockThreshold === null ? "" : String(offer.lowStockThreshold),
  } : { ...emptyOffer };
}

function specificationText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}

function parseSpecifications(
  values: Record<string, string>,
  productType: string,
  definitions: AdminCatalogAttributeDefinition[],
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  for (const [code, raw] of Object.entries(values)) {
    const definition = definitions.find((item) => item.productType === productType && item.code === code);
    if (!definition) throw new Error(`Thuộc tính ${code} không được định nghĩa cho loại sản phẩm này.`);
    if (raw === "") {
      parsed[code] = null;
      continue;
    }
    if (definition.dataType === "TEXT") {
      if (definition.options?.length && !definition.options.includes(raw)) {
        throw new Error(`${definition.label} không nằm trong danh sách giá trị cho phép.`);
      }
      parsed[code] = raw;
    } else if (definition.dataType === "INTEGER") {
      const value = Number(raw);
      if (!Number.isSafeInteger(value)) throw new Error(`${definition.label} phải là số nguyên hợp lệ.`);
      parsed[code] = value;
    } else if (definition.dataType === "DECIMAL") {
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`${definition.label} phải là số hợp lệ.`);
      parsed[code] = value;
    } else if (definition.dataType === "BOOLEAN") {
      if (raw !== "true" && raw !== "false") throw new Error(`${definition.label} phải là true hoặc false.`);
      parsed[code] = raw === "true";
    } else {
      try {
        const value: unknown = JSON.parse(raw);
        if (typeof value !== "object" || value === null) throw new Error();
        parsed[code] = value;
      } catch {
        throw new Error(`${definition.label} phải là JSON dạng danh sách hoặc đối tượng.`);
      }
    }
  }
  return parsed;
}

function adminError(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

export function AdminProductManagementPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ data: AdminProductSummary[]; total: number; limit: number }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void fetchAdminProducts({
      q: query || undefined, status: status || undefined, type: type || undefined, page, limit: 50,
    }, controller.signal).then(
      setResult,
      (reason: unknown) => { if (!controller.signal.aborted) setError(adminError(reason, "Không thể tải sản phẩm.")); },
    ).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, query, refresh, status, type]);

  const totalPages = result ? Math.ceil(result.total / result.limit) : 0;
  return <div className="v2-page">
    <div className="v2-page-title">
      <div><p className="v2-eyebrow">Catalog</p><h1>Quản lý sản phẩm</h1></div>
      <div className="v2-action-row">
        <SecondaryButton type="button" onClick={() => setRefresh((value) => value + 1)}>Làm mới</SecondaryButton>
        <Link className="v2-button v2-button-primary" to="/admin/product-edit">Tạo sản phẩm</Link>
      </div>
    </div>
    <Card title="Danh mục sản phẩm" description="Quản lý nội dung, ưu đãi, tồn kho và trạng thái xuất bản.">
      <div className="v2-management-filters">
        <input className="v2-form-input v2-management-search" placeholder="Tên, model hoặc SKU"
          value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        <label className="v2-field">Trạng thái<select className="v2-form-input" value={status}
          onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">Tất cả</option><option value="DRAFT">Bản nháp</option>
          <option value="ACTIVE">Đang bán</option><option value="HIDDEN">Đang ẩn</option>
          <option value="ARCHIVED">Đã lưu trữ</option>
        </select></label>
        <label className="v2-field">Loại sản phẩm<select className="v2-form-input" value={type}
          onChange={(event) => { setType(event.target.value); setPage(1); }}>
          <option value="">Tất cả</option>
          {["CPU", "GPU", "RAM", "STORAGE", "MOTHERBOARD", "CASE", "PSU", "COOLER", "ACCESSORY", "PC"].map((item) =>
            <option key={item} value={item}>{item}</option>)}
        </select></label>
      </div>
      {loading && <LoadingState message="Đang tải sản phẩm…" />}
      {error && <ErrorState title="Không thể tải danh sách sản phẩm" message={error} />}
      {!loading && !error && result?.data.length === 0 && <EmptyState title="Không tìm thấy sản phẩm" message="Thử thay đổi bộ lọc hoặc tạo sản phẩm mới." />}
      {result && result.data.length > 0 && <div className="v2-table-wrap"><table className="v2-table">
        <thead><tr><th>Sản phẩm</th><th>Phân loại</th><th>Giá bán thấp nhất</th><th>Tồn khả dụng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{result.data.map((item) => <tr key={item.productId}>
          <td>{item.productName}<small className="v2-table-subtext v2-mono">{item.modelCode}</small></td>
          <td>{item.productType}<small className="v2-table-subtext">{item.categoryName} · {item.brandName ?? "Chưa có thương hiệu"}</small></td>
          <td>{item.minimumPrice === null || !item.currency ? "Chưa thiết lập" : money(item.minimumPrice, item.currency)}</td>
          <td>{item.availableQuantity}</td>
          <td><Badge tone={item.status === "ACTIVE" ? "success" : "neutral"}>{item.status}</Badge></td>
          <td><Link to={`/admin/product-edit?modelCode=${encodeURIComponent(item.modelCode)}`}>Chỉnh sửa</Link></td>
        </tr>)}</tbody>
      </table></div>}
      {result && totalPages > 1 && <div className="v2-pager">
        <SecondaryButton type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Trước</SecondaryButton>
        <span>Trang {page} / {totalPages} · {result.total} sản phẩm</span>
        <SecondaryButton type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Tiếp</SecondaryButton>
      </div>}
    </Card>
  </div>;
}

export function AdminProductEditorPage() {
  const [params, setParams] = useSearchParams();
  const modelCode = params.get("modelCode")?.trim() ?? "";
  const [facets, setFacets] = useState<CatalogFacets>();
  const [definitions, setDefinitions] = useState<AdminCatalogAttributeDefinition[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [product, setProduct] = useState<AdminProduct>();
  const [fields, setFields] = useState<ProductFields>(emptyProduct);
  const [offer, setOffer] = useState<OfferFields>(emptyOffer);
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [images, setImages] = useState<AdminImage[]>([]);
  const [components, setComponents] = useState<Omit<AdminBomComponent, "modelCode" | "productName" | "productType">[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkMediaType, setLinkMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void Promise.all([
      fetchCatalogFacets(controller.signal),
      fetchAdminCatalogAttributeDefinitions(controller.signal),
      fetchCatalogProducts({ page: 1, limit: 100 }, controller.signal),
      modelCode ? fetchAdminManagedProduct(modelCode, controller.signal) : Promise.resolve(undefined),
    ]).then(async ([facetResponse, definitionResponse, firstPage, existing]) => {
      let allProducts = firstPage.data;
      if (firstPage.pagination.totalPages > 1) {
        const rest = await Promise.all(Array.from(
          { length: firstPage.pagination.totalPages - 1 },
          (_, index) => fetchCatalogProducts({ page: index + 2, limit: 100 }, controller.signal),
        ));
        allProducts = allProducts.concat(...rest.map((pageResult) => pageResult.data));
      }
      if (controller.signal.aborted) return;
      setFacets(facetResponse.data);
      setDefinitions(definitionResponse.data);
      setProducts(allProducts);
      if (existing) {
        setProduct(existing);
        setFields(productFields(existing));
        setOffer(offerFields(existing.offers[0]));
        setSpecifications(Object.fromEntries(definitionResponse.data
          .filter((definition) => definition.productType === existing.productType)
          .map((definition) => [definition.code, specificationText(existing.specifications[definition.code])])));
        setImages(existing.images);
        setComponents(existing.bomComponents.map((component) => ({
          componentProductId: component.componentProductId ?? "",
          quantity: component.quantity,
          warrantyMonths: component.warrantyMonths,
          displayCategory: component.displayCategory,
          displayOrder: component.displayOrder,
          customerVisible: component.customerVisible,
        })));
      } else {
        setProduct(undefined);
        setFields(emptyProduct);
        setOffer(emptyOffer);
        setSpecifications({});
        setImages([]);
        setComponents([]);
      }
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(adminError(reason, "Không thể tải dữ liệu quản lý sản phẩm."));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [modelCode]);

  const setField = <K extends keyof ProductFields>(key: K, value: ProductFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
  };
  const availableDefinitions = useMemo(
    () => definitions.filter((definition) => definition.productType === fields.productType),
    [definitions, fields.productType],
  );
  const saveBasics = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      let sections: unknown;
      try {
        sections = JSON.parse(fields.contentSections);
      } catch {
        throw new Error("Nội dung bổ sung phải là JSON hợp lệ.");
      }
      const specValues = parseSpecifications(specifications, fields.productType, definitions);
      const payload: AdminProductWrite = {
        modelCode: fields.modelCode,
        productName: fields.productName,
        sku: fields.sku.trim() || null,
        slug: fields.slug.trim() || null,
        productType: fields.productType,
        categoryCode: fields.categoryCode,
        brandName: fields.brandName || null,
        shortDescription: fields.shortDescription || null,
        description: fields.description || null,
        seoTitle: fields.seoTitle || null,
        seoDescription: fields.seoDescription || null,
        tags: fields.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        featured: fields.featured,
        displayOrder: Number(fields.displayOrder),
        contentSections: sections,
        specifications: specValues,
      };
      const saved = await saveAdminProduct(modelCode || undefined, payload);
      setProduct(saved);
      setFields(productFields(saved));
      setSpecifications(Object.fromEntries(availableDefinitions.map((definition) =>
        [definition.code, specificationText(saved.specifications[definition.code])])));
      setNotice("Thông tin và thông số đã được lưu vào cơ sở dữ liệu.");
      if (!modelCode) setParams({ modelCode: saved.modelCode }, { replace: true });
    } catch (reason) {
      setError(adminError(reason, "Không thể lưu thông tin sản phẩm."));
    } finally {
      setSaving(false);
    }
  };
  const saveCurrentOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) {
      setError("Hãy lưu thông tin sản phẩm trước khi thêm ưu đãi.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (!offer.price.trim()) throw new Error("Nhập giá bán đã được phê duyệt; hệ thống không tự tạo giá.");
      const saved = await saveAdminOffer(product.modelCode, {
        offerId: offer.offerId || undefined,
        condition: offer.condition,
        price: Number(offer.price),
        compareAtPrice: offer.compareAtPrice.trim() ? Number(offer.compareAtPrice) : null,
        currency: offer.currency.toUpperCase(),
        stockQuantity: Number(offer.stockQuantity),
        warrantyMonths: Number(offer.warrantyMonths),
        status: offer.status,
        minimumPurchaseQuantity: Number(offer.minimumPurchaseQuantity),
        maximumPurchaseQuantity: Number(offer.maximumPurchaseQuantity),
        lowStockThreshold: offer.lowStockThreshold.trim() ? Number(offer.lowStockThreshold) : null,
      });
      const refreshed = await fetchAdminManagedProduct(product.modelCode);
      setProduct(refreshed);
      setOffer(offerFields(refreshed.offers.find((item) => item.offerId === saved.offerId)));
      setNotice("Ưu đãi và tồn kho đã được lưu.");
    } catch (reason) {
      setError(adminError(reason, "Không thể lưu ưu đãi."));
    } finally {
      setSaving(false);
    }
  };
  const saveBom = async () => {
    if (!product) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveAdminProductBom(product.modelCode, components);
      setComponents(saved);
      const refreshed = await fetchAdminManagedProduct(product.modelCode);
      setProduct(refreshed);
      setNotice("Danh sách linh kiện đã được lưu.");
    } catch (reason) {
      setError(adminError(reason, "Không thể lưu danh sách linh kiện."));
    } finally {
      setSaving(false);
    }
  };
  const saveGallery = async () => {
    if (!product) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveAdminProductImages(product.modelCode, images.map((image, index) => ({
        imageId: image.imageId,
        url: image.url,
        altText: image.altText,
        caption: image.caption,
        mediaType: image.mediaType,
        primary: image.primary,
        displayOrder: index,
      })));
      setImages(saved);
      setNotice("Thư viện media đã được lưu.");
    } catch (reason) {
      setError(adminError(reason, "Không thể lưu thư viện media."));
    } finally {
      setSaving(false);
    }
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !product) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const uploaded = await uploadAdminProductMedia(product.modelCode, file, {
        altText: fields.productName,
        primary: images.length === 0,
        displayOrder: images.length,
      });
      setImages((current) => [
        ...current.map((image) => uploaded.primary ? { ...image, primary: false } : image),
        uploaded,
      ]);
      setNotice("Tệp media đã được tải lên và lưu.");
    } catch (reason) {
      setError(adminError(reason, "Không thể tải tệp media lên."));
    } finally {
      setSaving(false);
    }
  };
  const addMediaLink = () => {
    if (!linkUrl.trim()) return;
    setImages((current) => [...current, {
      imageId: "",
      url: linkUrl.trim(),
      altText: fields.productName || null,
      caption: null,
      mediaType: linkMediaType,
      mimeType: null,
      fileName: null,
      primary: current.length === 0,
      displayOrder: current.length,
    }]);
    setLinkUrl("");
  };
  const removeMedia = async (image: AdminImage) => {
    setError("");
    try {
      if (image.imageId) await deleteAdminProductImage(product!.modelCode, image.imageId);
      setImages((current) => {
        const remaining = current.filter((item) => item !== image)
          .map((item, index) => ({ ...item, displayOrder: index }));
        if (image.primary && remaining.length > 0) {
          remaining[0] = { ...remaining[0], primary: true };
        }
        return remaining;
      });
      setNotice("Đã gỡ media khỏi sản phẩm.");
    } catch (reason) {
      setError(adminError(reason, "Không thể gỡ media."));
    }
  };
  const changeStatus = async () => {
    if (!product || !confirmStatus) return;
    setSaving(true);
    setError("");
    try {
      const saved = await updateAdminProductStatus(product.modelCode, confirmStatus);
      setProduct(saved);
      setConfirmStatus(undefined);
      setNotice(confirmStatus === "ACTIVE" ? "Sản phẩm đã được xuất bản." : "Trạng thái sản phẩm đã được cập nhật.");
    } catch (reason) {
      setError(adminError(reason, "Không thể cập nhật trạng thái sản phẩm."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="v2-page"><LoadingState message="Đang tải trình quản lý sản phẩm…" /></div>;
  if (error && !facets) return <div className="v2-page"><ErrorState title="Không thể mở trình quản lý" message={error} /></div>;
  const typeOptions = facets?.productTypes ?? [];
  const categoryOptions = facets?.categories ?? [];
  const brandOptions = facets?.brands ?? [];
  const updateOffer = <K extends keyof OfferFields>(key: K, value: OfferFields[K]) =>
    setOffer((current) => ({ ...current, [key]: value }));

  return <div className="v2-page">
    <div className="v2-page-title">
      <div><p className="v2-eyebrow">Quản lý catalog</p><h1>{product ? "Chỉnh sửa sản phẩm" : "Tạo sản phẩm"}</h1></div>
      <div className="v2-action-row">
        <Link className="v2-button v2-button-secondary" to="/admin/products">Danh sách sản phẩm</Link>
        {product && <Badge tone={product.status === "ACTIVE" ? "success" : "neutral"}>{product.status}</Badge>}
      </div>
    </div>
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    {notice && <p className="v2-inline-success" role="status">{notice}</p>}
    <form onSubmit={saveBasics}>
      <Card title="Thông tin cơ bản" description="Mã model được giữ cố định sau khi tạo. Dữ liệu kỹ thuật được lưu theo registry kiểu dữ liệu hiện có.">
        <div className="v2-form-grid">
          <FormField label="Tên sản phẩm" htmlFor="admin-product-name"><input id="admin-product-name" className="v2-form-input" required maxLength={240} value={fields.productName} onChange={(event) => setField("productName", event.target.value)} /></FormField>
          <FormField label="Mã model" htmlFor="admin-product-model"><input id="admin-product-model" className="v2-form-input v2-mono" required maxLength={100} disabled={Boolean(product)} value={fields.modelCode} onChange={(event) => setField("modelCode", event.target.value)} /></FormField>
          <FormField label="SKU" htmlFor="admin-product-sku"><input id="admin-product-sku" className="v2-form-input" maxLength={100} value={fields.sku} onChange={(event) => setField("sku", event.target.value)} /></FormField>
          <FormField label="Slug" htmlFor="admin-product-slug"><input id="admin-product-slug" className="v2-form-input" maxLength={180} value={fields.slug} onChange={(event) => setField("slug", event.target.value)} /></FormField>
          <FormField label="Loại sản phẩm" htmlFor="admin-product-type"><select id="admin-product-type" className="v2-form-input" required disabled={Boolean(product)} value={fields.productType} onChange={(event) => { setField("productType", event.target.value); setSpecifications({}); }}><option value="">Chọn loại</option>{typeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FormField>
          <FormField label="Danh mục" htmlFor="admin-product-category"><select id="admin-product-category" className="v2-form-input" required value={fields.categoryCode} onChange={(event) => setField("categoryCode", event.target.value)}><option value="">Chọn danh mục</option>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FormField>
          <FormField label="Thương hiệu" htmlFor="admin-product-brand"><select id="admin-product-brand" className="v2-form-input" value={fields.brandName} onChange={(event) => setField("brandName", event.target.value)}><option value="">Không chọn</option>{fields.brandName && !brandOptions.some((item) => item.label === fields.brandName) && <option value={fields.brandName}>{fields.brandName}</option>}{brandOptions.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}</select></FormField>
          <FormField label="Mô tả ngắn" htmlFor="admin-product-short"><textarea id="admin-product-short" className="v2-form-input" maxLength={500} rows={2} value={fields.shortDescription} onChange={(event) => setField("shortDescription", event.target.value)} /></FormField>
          <FormField label="Mô tả chi tiết" htmlFor="admin-product-description"><textarea id="admin-product-description" className="v2-form-input" maxLength={100000} rows={5} value={fields.description} onChange={(event) => setField("description", event.target.value)} /></FormField>
          <FormField label="Thẻ sản phẩm (phân tách bằng dấu phẩy)" htmlFor="admin-product-tags"><input id="admin-product-tags" className="v2-form-input" value={fields.tags} onChange={(event) => setField("tags", event.target.value)} /></FormField>
          <FormField label="Thứ tự hiển thị" htmlFor="admin-product-order"><input id="admin-product-order" className="v2-form-input" type="number" min="0" step="1" value={fields.displayOrder} onChange={(event) => setField("displayOrder", event.target.value)} /></FormField>
          <label className="v2-field">Sản phẩm nổi bật<input type="checkbox" checked={fields.featured} onChange={(event) => setField("featured", event.target.checked)} /></label>
        </div>
      </Card>
      <Card title="Thông số kỹ thuật" description="Giá trị được lưu theo các định nghĩa typed hiện có; không thay đổi nguồn hoặc metadata xác minh.">
        {!fields.productType && <p className="v2-muted">Chọn loại sản phẩm để tải các trường kỹ thuật tương ứng.</p>}
        {fields.productType && availableDefinitions.length === 0 && <p className="v2-muted">Loại sản phẩm này chưa có định nghĩa thuộc tính.</p>}
        <div className="v2-form-grid">{availableDefinitions.map((definition) => {
          const id = `admin-spec-${definition.code}`;
          const value = specifications[definition.code] ?? "";
          const change = (next: string) => setSpecifications((current) => ({ ...current, [definition.code]: next }));
          let field;
          if (definition.dataType === "BOOLEAN") {
            field = <select id={id} className="v2-form-input" value={value} onChange={(event) => change(event.target.value)}><option value="">Chưa nhập</option><option value="true">Có</option><option value="false">Không</option></select>;
          } else if (definition.options?.length) {
            field = <select id={id} className="v2-form-input" value={value} onChange={(event) => change(event.target.value)}><option value="">Chưa nhập</option>{definition.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
          } else if (definition.dataType === "JSON" || definition.inputMode === "TEXTAREA") {
            field = <textarea id={id} className="v2-form-input v2-mono" rows={3} value={value} onChange={(event) => change(event.target.value)} />;
          } else {
            field = <input id={id} className="v2-form-input" type={definition.dataType === "TEXT" ? "text" : "number"} step={definition.dataType === "INTEGER" ? "1" : definition.dataType === "DECIMAL" ? "any" : undefined} value={value} onChange={(event) => change(event.target.value)} />;
          }
          return <FormField key={definition.code} label={`${definition.label}${definition.unit ? ` (${definition.unit})` : ""}`} htmlFor={id} hint={`${definition.dataType}${definition.englishLabel ? ` · ${definition.englishLabel}` : ""}`}>{field}</FormField>;
        })}</div>
      </Card>
      <Card title="Nội dung bổ sung và SEO" description="Lưu trữ các mục nội dung dưới dạng JSON có cấu trúc; phần hiển thị công khai chỉ render văn bản và media an toàn.">
        <div className="v2-form-grid">
          <FormField label="Tiêu đề SEO" htmlFor="admin-seo-title"><input id="admin-seo-title" className="v2-form-input" maxLength={255} value={fields.seoTitle} onChange={(event) => setField("seoTitle", event.target.value)} /></FormField>
          <FormField label="Mô tả SEO" htmlFor="admin-seo-description"><textarea id="admin-seo-description" className="v2-form-input" maxLength={500} rows={2} value={fields.seoDescription} onChange={(event) => setField("seoDescription", event.target.value)} /></FormField>
          <FormField label="Các phần nội dung (JSON)" htmlFor="admin-content-sections"><textarea id="admin-content-sections" className="v2-form-input v2-mono" rows={5} value={fields.contentSections} onChange={(event) => setField("contentSections", event.target.value)} /></FormField>
        </div>
      </Card>
      <div className="v2-action-row">
        <PrimaryButton type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu sản phẩm và thông số"}</PrimaryButton>
      </div>
    </form>

    {product && <Card title="Giá bán và tồn kho" description="Giá phải do Admin nhập theo giá đã được phê duyệt. Tồn kho không được thấp hơn số lượng đang giữ cho đơn hàng.">
      {product.offers.length > 0 && <FormField label="Chọn ưu đãi cần chỉnh sửa" htmlFor="admin-offer-select"><select id="admin-offer-select" className="v2-form-input" value={offer.offerId} onChange={(event) => setOffer(offerFields(product.offers.find((item) => item.offerId === event.target.value)))}><option value="">Tạo ưu đãi mới</option>{product.offers.map((item) => <option key={item.offerId} value={item.offerId}>{item.condition} · {money(item.price, item.currency)} · {item.status}</option>)}</select></FormField>}
      <form onSubmit={saveCurrentOffer}><div className="v2-form-grid">
        <FormField label="Giá bán" htmlFor="admin-offer-price"><input id="admin-offer-price" className="v2-form-input" type="number" min="0" step="0.01" required value={offer.price} onChange={(event) => updateOffer("price", event.target.value)} /></FormField>
        <FormField label="Giá niêm yết (nếu có)" htmlFor="admin-offer-compare"><input id="admin-offer-compare" className="v2-form-input" type="number" min="0" step="0.01" value={offer.compareAtPrice} onChange={(event) => updateOffer("compareAtPrice", event.target.value)} /></FormField>
        <FormField label="Tiền tệ" htmlFor="admin-offer-currency"><input id="admin-offer-currency" className="v2-form-input" maxLength={3} value={offer.currency} onChange={(event) => updateOffer("currency", event.target.value.toUpperCase())} /></FormField>
        <FormField label="Tình trạng" htmlFor="admin-offer-condition"><select id="admin-offer-condition" className="v2-form-input" value={offer.condition} onChange={(event) => updateOffer("condition", event.target.value as OfferFields["condition"])}><option value="NEW">Mới</option><option value="LIKE_NEW">Gần như mới</option><option value="USED">Đã qua sử dụng</option></select></FormField>
        <FormField label="Tổng tồn kho" htmlFor="admin-offer-stock"><input id="admin-offer-stock" className="v2-form-input" type="number" min="0" step="1" value={offer.stockQuantity} onChange={(event) => updateOffer("stockQuantity", event.target.value)} /></FormField>
        <FormField label="Bảo hành (tháng)" htmlFor="admin-offer-warranty"><input id="admin-offer-warranty" className="v2-form-input" type="number" min="0" step="1" value={offer.warrantyMonths} onChange={(event) => updateOffer("warrantyMonths", event.target.value)} /></FormField>
        <FormField label="Số lượng mua tối thiểu" htmlFor="admin-offer-min"><input id="admin-offer-min" className="v2-form-input" type="number" min="1" max="100" step="1" value={offer.minimumPurchaseQuantity} onChange={(event) => updateOffer("minimumPurchaseQuantity", event.target.value)} /></FormField>
        <FormField label="Số lượng mua tối đa" htmlFor="admin-offer-max"><input id="admin-offer-max" className="v2-form-input" type="number" min="1" max="100" step="1" value={offer.maximumPurchaseQuantity} onChange={(event) => updateOffer("maximumPurchaseQuantity", event.target.value)} /></FormField>
        <FormField label="Ngưỡng cảnh báo tồn" htmlFor="admin-offer-low-stock"><input id="admin-offer-low-stock" className="v2-form-input" type="number" min="0" step="1" value={offer.lowStockThreshold} onChange={(event) => updateOffer("lowStockThreshold", event.target.value)} /></FormField>
        <FormField label="Trạng thái ưu đãi" htmlFor="admin-offer-status"><select id="admin-offer-status" className="v2-form-input" value={offer.status} onChange={(event) => updateOffer("status", event.target.value as OfferFields["status"])}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Tạm ngừng</option></select></FormField>
      </div><div className="v2-action-row"><PrimaryButton type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu ưu đãi"}</PrimaryButton></div></form>
      {product.offers.map((item) => <p className="v2-muted" key={item.offerId}>Đã đặt trước: {item.reservedQuantity} · Khả dụng: {item.availableQuantity}</p>)}
    </Card>}

    {product && <Card title="Thư viện ảnh và video" description="Hỗ trợ tải lên tệp media và liên kết HTTPS. Nội dung media được phục vụ từ máy chủ ứng dụng.">
      <div className="v2-form-grid">
        <FormField label="Tải ảnh hoặc video (tối đa 25 MB)" htmlFor="admin-media-upload"><input id="admin-media-upload" className="v2-form-input" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={saving} onChange={(event) => void upload(event)} /></FormField>
        <FormField label="Liên kết HTTPS" htmlFor="admin-media-url"><input id="admin-media-url" className="v2-form-input" type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} /></FormField>
        <FormField label="Loại media liên kết" htmlFor="admin-media-type"><select id="admin-media-type" className="v2-form-input" value={linkMediaType} onChange={(event) => setLinkMediaType(event.target.value as "IMAGE" | "VIDEO")}><option value="IMAGE">Ảnh</option><option value="VIDEO">Video</option></select></FormField>
      </div>
      <div className="v2-action-row"><SecondaryButton type="button" onClick={addMediaLink}>Thêm liên kết</SecondaryButton><PrimaryButton type="button" disabled={saving} onClick={() => void saveGallery()}>Lưu thứ tự và mô tả media</PrimaryButton></div>
      {images.length === 0 && <p className="v2-muted">Chưa có media cho sản phẩm.</p>}
      {images.map((image, index) => <div className="v2-category-card" key={`${image.imageId || image.url}-${index}`}>
        {image.mediaType === "IMAGE" ? <img src={image.url} alt={image.altText ?? fields.productName} width={90} height={70} /> : <span>Video</span>}
        <FormField label="Văn bản thay thế" htmlFor={`media-alt-${index}`}><input id={`media-alt-${index}`} className="v2-form-input" maxLength={300} value={image.altText ?? ""} onChange={(event) => setImages((current) => current.map((item) => item === image ? { ...item, altText: event.target.value } : item))} /></FormField>
        <FormField label="Chú thích" htmlFor={`media-caption-${index}`}><input id={`media-caption-${index}`} className="v2-form-input" maxLength={500} value={image.caption ?? ""} onChange={(event) => setImages((current) => current.map((item) => item === image ? { ...item, caption: event.target.value } : item))} /></FormField>
        <label><input type="radio" name="product-cover" checked={image.primary} onChange={() => setImages((current) => current.map((item) => ({ ...item, primary: item === image })))} />Ảnh bìa</label>
        <SecondaryButton type="button" disabled={index === 0} onClick={() => setImages((current) => {
          const next = [...current];
          [next[index - 1], next[index]] = [next[index], next[index - 1]];
          return next.map((item, order) => ({ ...item, displayOrder: order }));
        })}>Lên</SecondaryButton>
        <SecondaryButton type="button" disabled={index === images.length - 1} onClick={() => setImages((current) => {
          const next = [...current];
          [next[index], next[index + 1]] = [next[index + 1], next[index]];
          return next.map((item, order) => ({ ...item, displayOrder: order }));
        })}>Xuống</SecondaryButton>
        <SecondaryButton type="button" onClick={() => void removeMedia(image)}>Gỡ</SecondaryButton>
      </div>)}
    </Card>}

    {product?.productType === "PC" && <Card title="Cấu hình linh kiện máy bộ" description="Mỗi dòng tham chiếu đến một sản phẩm linh kiện đã tồn tại trong catalog.">
      {components.map((component, index) => <div className="v2-form-grid" key={`${component.componentProductId}-${index}`}>
        <FormField label="Linh kiện" htmlFor={`bom-product-${index}`}><select id={`bom-product-${index}`} className="v2-form-input" value={component.componentProductId ?? ""} onChange={(event) => setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, componentProductId: event.target.value } : item))}><option value="">Chọn linh kiện</option>{products.filter((item) => item.productType !== "PC").map((item) => <option key={item.productId} value={item.productId}>{item.modelCode} · {item.productName}</option>)}</select></FormField>
        <FormField label="Số lượng" htmlFor={`bom-quantity-${index}`}><input id={`bom-quantity-${index}`} className="v2-form-input" type="number" min="1" max="100" value={component.quantity} onChange={(event) => setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} /></FormField>
        <FormField label="Bảo hành riêng (tháng)" htmlFor={`bom-warranty-${index}`}><input id={`bom-warranty-${index}`} className="v2-form-input" type="number" min="0" value={component.warrantyMonths ?? ""} onChange={(event) => setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, warrantyMonths: event.target.value ? Number(event.target.value) : null } : item))} /></FormField>
        <FormField label="Nhóm hiển thị" htmlFor={`bom-category-${index}`}><input id={`bom-category-${index}`} className="v2-form-input" maxLength={80} value={component.displayCategory} onChange={(event) => setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, displayCategory: event.target.value } : item))} /></FormField>
        <label className="v2-field">Hiển thị cho khách<input type="checkbox" checked={component.customerVisible} onChange={(event) => setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, customerVisible: event.target.checked } : item))} /></label>
        <SecondaryButton type="button" onClick={() => setComponents((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Bỏ linh kiện</SecondaryButton>
      </div>)}
      <div className="v2-action-row"><SecondaryButton type="button" onClick={() => setComponents((current) => [...current, { componentProductId: "", quantity: 1, warrantyMonths: null, displayCategory: "Linh kiện", displayOrder: current.length, customerVisible: true }])}>Thêm linh kiện</SecondaryButton><PrimaryButton type="button" disabled={saving} onClick={() => void saveBom()}>Lưu cấu hình</PrimaryButton></div>
    </Card>}

    {product?.productType === "PC" && <ProductUpgradeAdminPanel
      modelCode={product.modelCode}
      bomComponents={product.bomComponents}
    />}

    {product && <Card title="Xem trước và xuất bản" description="Bản nháp chưa hiển thị trong danh mục khách hàng. Xuất bản yêu cầu ưu đãi hoạt động; máy bộ phải có BOM.">
      <h2>{fields.productName || "Tên sản phẩm"}</h2><p>{fields.shortDescription}</p><p>{fields.description}</p>
      <p className="v2-mono">{fields.modelCode}</p>
      {offer.price && <strong>{money(Number(offer.price), offer.currency)}</strong>}
      {fields.productType && <TechnicalSpecifications productType={fields.productType}
        productTypeName={facets?.productTypes.find((item) => item.value === fields.productType)?.label ?? fields.productType}
        specifications={(() => { try { return parseSpecifications(specifications, fields.productType, definitions); } catch { return {}; } })()}
        definitions={definitions} />}
      <div className="v2-action-row">
        <PrimaryButton type="button" disabled={saving || product.status === "ACTIVE"} onClick={() => setConfirmStatus("ACTIVE")}>Xuất bản</PrimaryButton>
        <SecondaryButton type="button" disabled={saving || product.status !== "ACTIVE"} onClick={() => setConfirmStatus("HIDDEN")}>Ẩn sản phẩm</SecondaryButton>
        <SecondaryButton type="button" disabled={saving || product.status === "ARCHIVED"} onClick={() => setConfirmStatus("ARCHIVED")}>Lưu trữ</SecondaryButton>
        <SecondaryButton type="button" disabled={saving} onClick={() => setConfirmStatus("DRAFT")}>Lưu về bản nháp</SecondaryButton>
      </div>
    </Card>}
    <ConfirmationModal
      open={Boolean(confirmStatus)}
      onClose={() => { if (!saving) setConfirmStatus(undefined); }}
      onConfirm={() => void changeStatus()}
      title={confirmStatus === "ACTIVE" ? "Xác nhận xuất bản" : "Xác nhận thay đổi trạng thái"}
      message={confirmStatus === "ACTIVE"
        ? `Bạn có chắc chắn muốn xuất bản ${fields.productName}?`
        : `Bạn có chắc chắn muốn chuyển ${fields.productName} sang trạng thái ${confirmStatus}?`}
      details={[{ label: "Mã model", value: fields.modelCode }, { label: "Trạng thái mới", value: confirmStatus ?? "" }]}
      confirmLabel={confirmStatus === "ACTIVE" ? "Xuất bản" : "Xác nhận"}
      busy={saving}
    />
  </div>;
}
