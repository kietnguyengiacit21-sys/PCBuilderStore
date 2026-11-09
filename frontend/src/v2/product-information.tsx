import type {
  CatalogAttributeDefinition,
  CatalogAttributeQuality,
  CatalogAttributeVerification,
  CatalogBomComponent,
  CatalogOffer,
  CatalogProduct,
  CatalogVerificationStatus,
} from "../catalog-api";
import { customerVisibleOffers, offerOriginalPrice } from "../catalog-api";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge, Card } from "./components";
import { money } from "../demo/demo-store";
import {
  getSpecificationGroups,
  specificationDefinitionsFor,
  specificationDisplayPolicy,
  specificationGroupFor,
  specificationHighlightPriority,
} from "./specification-metadata";
import {
  formatSystemDimensions,
  parseJsonAttributeValue,
  parsePCConfiguration,
  pcComponentTypeLabel,
  pcConfigurationSummaryEntries,
  pcConfigurationStatusLabel,
} from "./pc-configuration";
import { ProductArtwork } from "./storefront-components";

export function formatWarranty(months: number | null | undefined): string | null {
  if (typeof months !== "number" || !Number.isSafeInteger(months) || months <= 0) return null;
  return `${months} tháng`;
}

export function customerVisibleCopy(value: string | null | undefined): string | null {
  if (!value) return null;
  const internalCopy = /\b(?:demo|development|internal|catalog(?:ue)?|estimated?|sample|placeholder)\b|(?:giá|dữ liệu|thông số)\s+(?:demo|ước tính|thử nghiệm)|mua\s+thật/iu;
  const visibleCopy = value.split(/(?<=[.!?])\s+|\r?\n+/)
    .filter((sentence) => !internalCopy.test(sentence))
    .join(" ")
    .trim();
  return visibleCopy || null;
}

export function hasVerifiedPCConfiguration(
  verificationMetadata?: Record<string, CatalogAttributeVerification>,
): boolean {
  return ["bom_status", "component_details", "configuration_summary"].every((code) => {
    const status = verificationMetadata?.[code]?.verificationStatus;
    return status === "VERIFIED_EXACT_MODEL" || status === "VERIFIED_EXACT_VARIANT";
  });
}

export function WarrantyDisplay({
  months,
  showMissing = false,
}: {
  months: number | null | undefined;
  showMissing?: boolean;
}) {
  const warranty = formatWarranty(months);
  if (!warranty && !showMissing) return null;
  return <span className="v2-warranty"><strong>Bảo hành:</strong> {warranty ?? "Chưa có dữ liệu"}</span>;
}

function humanizeCode(code: string): string {
  return code.split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

const localizedUnits: Record<string, string> = {
  channels: "kênh",
  components: "linh kiện",
  cores: "nhân",
  count: "cái",
  cycles: "chu kỳ",
  displays: "màn hình",
  drives: "ổ",
  fans: "quạt",
  headers: "đầu cắm",
  heatsinks: "tản nhiệt",
  hours: "giờ",
  keys: "phím",
  modules: "thanh",
  pipes: "ống",
  ports: "cổng",
  profiles: "hồ sơ",
  slots: "khe",
  threads: "luồng",
  units: "đơn vị",
  years: "năm",
};

function formatStructuredListItem(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return formatSpecificationValue(value);
  }
  const record = value as Record<string, unknown>;
  const name = record.type ?? record.name ?? record.connector ?? record.connector_type ?? record.port;
  if (typeof name === "string") {
    const count = typeof record.count === "number" ? ` × ${record.count}` : "";
    const version = typeof record.version === "string" ? ` · ${record.version}` : "";
    return `${name}${count}${version}`;
  }
  return Object.entries(record)
    .map(([key, item]) => `${humanizeCode(key)}: ${formatSpecificationValue(item)}`)
    .join(" · ");
}

export function findAttributeDefinition(
  definitions: CatalogAttributeDefinition[],
  productType: string,
  code: string,
): CatalogAttributeDefinition | undefined {
  return definitions.find((definition) => definition.productType === productType && definition.code === code);
}

export function formatSpecificationValue(
  value: unknown,
  definition?: CatalogAttributeDefinition,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (definition?.dataType === "JSON") {
    const parsed = parseJsonAttributeValue(value);
    if (!parsed.valid) return "Dữ liệu JSON không hợp lệ";
    value = parsed.value;
  }
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object" && value !== null && !Array.isArray(value)
      && "status" in value && value.status === "NOT_APPLICABLE") {
    return "Không áp dụng";
  }
    if (definition?.code === "system_dimensions_mm") {
      return formatSystemDimensions(value) ?? "Dữ liệu kích thước không hợp lệ";
  }
  if (definition?.dataType === "BOOLEAN" && typeof value === "boolean") {
    return value ? "Có" : "Không";
  }
  if (typeof value === "number") {
    const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 }).format(value);
    const unit = definition?.unit ? localizedUnits[definition.unit] ?? definition.unit : undefined;
    return unit ? `${number} ${unit}` : number;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatSpecificationValue(item)).join(", ");
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .filter(([, nested]) => nested !== null && nested !== undefined && nested !== "")
      .map(([key, nested]) => `${humanizeCode(key)}: ${formatSpecificationValue(nested)}`)
      .join(" · ");
  }
  return String(value);
}

function SpecificationValue({
  value,
  definition,
}: {
  value: unknown;
  definition?: CatalogAttributeDefinition;
}) {
  const normalizedValue = definition?.dataType === "JSON"
    ? parseJsonAttributeValue(value)
    : { valid: true, value };
  if (!normalizedValue.valid) return <span>Dữ liệu JSON không hợp lệ</span>;
  value = normalizedValue.value;
  if (typeof value === "object" && value !== null && !Array.isArray(value)
      && "status" in value && value.status === "NOT_APPLICABLE") {
    return <span className="v2-spec-not-applicable">Không áp dụng</span>;
  }
  if (definition?.code === "system_dimensions_mm") {
    return formatSystemDimensions(value) ?? <span>Dữ liệu kích thước không hợp lệ</span>;
  }
  if (Array.isArray(value)) {
    return <div className="v2-spec-array-value">
      <ul>{value.map((item, index) => <li key={`${index}:${String(item)}`}>{formatStructuredListItem(item)}</li>)}</ul>
    </div>;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== null && nested !== undefined && nested !== "");
    return <dl className="v2-spec-json-value">
      {entries.map(([key, nested]) => <div key={key}>
        <dt>{humanizeCode(key)}</dt>
        <dd><SpecificationValue value={nested} /></dd>
      </div>)}
    </dl>;
  }
  return formatSpecificationValue(value, definition);
}

const verificationLabels: Record<CatalogVerificationStatus, string> = {
  VERIFIED_EXACT_MODEL: "Đã xác minh đúng model",
  VERIFIED_EXACT_VARIANT: "Đã xác minh đúng biến thể",
  NEEDS_REVIEW: "Cần xác minh",
  UNKNOWN: "Chưa rõ",
};

function verificationFor(
  metadata: Record<string, CatalogAttributeVerification> | undefined,
  code: string,
  hasSpecificationValue: boolean,
): CatalogAttributeVerification {
  const verification = metadata?.[code];
  if (verification && verificationLabels[verification.verificationStatus]) return verification;
  return {
    verificationStatus: hasSpecificationValue ? "NEEDS_REVIEW" : "UNKNOWN",
    sourceUrl: null,
    sourceLocator: null,
    verificationScope: null,
  };
}

function VerificationMetadataDisplay({ metadata }: { metadata: CatalogAttributeVerification }) {
  return <div className={`v2-spec-verification v2-spec-verification-${metadata.verificationStatus.toLowerCase()}`}>
    <span>{verificationLabels[metadata.verificationStatus]}</span>
    {metadata.verificationScope && <span>Phạm vi xác minh: {metadata.verificationScope === "EXACT_VARIANT"
      ? "đúng biến thể" : metadata.verificationScope === "EXACT_MODEL" ? "đúng model" : metadata.verificationScope}</span>}
    {metadata.sourceLocator && <span>Vị trí nguồn: {metadata.sourceLocator}</span>}
    {metadata.sourceUrl && <a href={metadata.sourceUrl} target="_blank" rel="noreferrer">Mở nguồn</a>}
  </div>;
}

export function attributeLabel(
  definitions: CatalogAttributeDefinition[],
  productType: string,
  code: string,
): string {
  const vietnameseLabels: Record<string, string> = {
    "ACCESSORY:accessory_type": "Loại phụ kiện",
    "CASE:max_cooler_height_mm": "Chiều cao tản nhiệt tối đa",
    "CASE:max_gpu_length_mm": "Chiều dài GPU tối đa",
    "CASE:motherboard_form_factors": "Chuẩn bo mạch chủ hỗ trợ",
    "COOLER:cooler_height_mm": "Chiều cao bộ tản nhiệt",
    "COOLER:supported_sockets": "Socket hỗ trợ",
    "CPU:core_count": "Số nhân",
    "CPU:socket": "Socket CPU",
    "CPU:tdp_watt": "TDP",
    "CPU:thread_count": "Số luồng",
    "GPU:vram_gb": "Dung lượng VRAM",
    "MOTHERBOARD:form_factor": "Kích thước bo mạch chủ",
    "MOTHERBOARD:memory_type": "Thế hệ bộ nhớ hỗ trợ",
    "MOTHERBOARD:socket": "Socket CPU hỗ trợ",
    "PC:bom_status": "Trạng thái thông tin cấu hình",
    "PC:configuration_summary": "Tóm tắt cấu hình được ghi nhận",
    "PSU:efficiency_rating": "Mức hiệu suất",
    "PSU:modularity": "Thiết kế dây nguồn",
    "PSU:wattage": "Công suất định mức",
    "RAM:capacity_gb": "Dung lượng",
    "RAM:memory_type": "Thế hệ bộ nhớ",
    "RAM:speed_mhz": "Tốc độ dữ liệu",
    "STORAGE:capacity_gb": "Dung lượng",
    "STORAGE:form_factor": "Kích thước ổ",
    "STORAGE:interface": "Giao tiếp",
  };
  return vietnameseLabels[`${productType}:${code}`]
    ?? findAttributeDefinition(definitions, productType, code)?.label
    ?? humanizeCode(code);
}

export function attributeEnglishLabel(
  definitions: CatalogAttributeDefinition[],
  productType: string,
  code: string,
): string | undefined {
  const definition = findAttributeDefinition(definitions, productType, code);
  return definition?.englishLabel ?? (definition ? humanizeCode(code) : undefined);
}

interface SpecificationGroup {
  id: string;
  label: string;
  order: number;
}

const typeGroups: Record<string, SpecificationGroup[]> = {
  CPU: [
    { id: "identity", label: "Nhận diện và kiến trúc", order: 0 },
    { id: "compute", label: "Nhân xử lý và hiệu năng", order: 1 },
    { id: "memory", label: "Bộ nhớ", order: 2 },
    { id: "graphics", label: "Đồ họa tích hợp", order: 3 },
    { id: "power", label: "Điện năng và nhiệt", order: 4 },
    { id: "expansion", label: "Kết nối và mở rộng", order: 5 },
  ],
  GPU: [
    { id: "processor", label: "Bộ xử lý đồ họa", order: 0 },
    { id: "memory", label: "Bộ nhớ", order: 1 },
    { id: "interface", label: "Giao tiếp", order: 2 },
    { id: "outputs", label: "Cổng xuất hình", order: 3 },
    { id: "display", label: "Hiển thị", order: 4 },
    { id: "power", label: "Nguồn", order: 5 },
    { id: "technology", label: "Công nghệ", order: 6 },
    { id: "cooling", label: "Tản nhiệt và kích thước", order: 7 },
    { id: "compatibility", label: "Tương thích", order: 8 },
    { id: "accessories", label: "Phụ kiện", order: 9 },
  ],
  MOTHERBOARD: [
    { id: "identity", label: "Nhận diện và nền tảng", order: 0 },
    { id: "memory", label: "Bộ nhớ", order: 1 },
    { id: "expansion", label: "Khe cắm và lưu trữ", order: 2 },
    { id: "connectivity", label: "Kết nối", order: 3 },
    { id: "power", label: "Nguồn và tản nhiệt", order: 4 },
    { id: "physical", label: "Kích thước và thiết kế", order: 5 },
  ],
  RAM: [
    { id: "identity", label: "Nhận diện và cấu hình", order: 0 },
    { id: "memory", label: "Dung lượng và tổ chức", order: 1 },
    { id: "performance", label: "Tốc độ và độ trễ", order: 2 },
    { id: "power", label: "Điện áp", order: 3 },
    { id: "features", label: "Tính năng và tương thích", order: 4 },
    { id: "physical", label: "Kích thước và thiết kế", order: 5 },
  ],
  STORAGE: [
    { id: "identity", label: "Nhận diện và định dạng", order: 0 },
    { id: "interface", label: "Giao tiếp và giao thức", order: 1 },
    { id: "performance", label: "Hiệu năng", order: 2 },
    { id: "endurance", label: "Độ bền và độ tin cậy", order: 3 },
    { id: "power", label: "Điện năng và nhiệt độ", order: 4 },
    { id: "physical", label: "Kích thước", order: 5 },
  ],
  PSU: [
    { id: "identity", label: "Nhận diện và tiêu chuẩn", order: 0 },
    { id: "output", label: "Công suất và hiệu suất", order: 1 },
    { id: "electrical", label: "Thông số điện", order: 2 },
    { id: "connectors", label: "Đầu nối", order: 3 },
    { id: "cooling", label: "Quạt và độ ồn", order: 4 },
    { id: "physical", label: "Kích thước", order: 5 },
    { id: "protection", label: "Bảo vệ", order: 6 },
  ],
  CASE: [
    { id: "identity", label: "Nhận diện và kiểu dáng", order: 0 },
    { id: "compatibility", label: "Tương thích linh kiện", order: 1 },
    { id: "clearance", label: "Không gian lắp đặt", order: 2 },
    { id: "cooling", label: "Quạt và tản nhiệt", order: 3 },
    { id: "storage", label: "Khay lưu trữ", order: 4 },
    { id: "io", label: "Cổng kết nối", order: 5 },
    { id: "physical", label: "Kích thước và vật liệu", order: 6 },
  ],
  COOLER: [
    { id: "identity", label: "Nhận diện và loại tản nhiệt", order: 0 },
    { id: "compatibility", label: "Socket và tương thích", order: 1 },
    { id: "radiator", label: "Két nước và quạt", order: 2 },
    { id: "performance", label: "Hiệu năng và độ ồn", order: 3 },
    { id: "electrical", label: "Kết nối và điện năng", order: 4 },
    { id: "physical", label: "Kích thước và khối lượng", order: 5 },
  ],
  ACCESSORY: [
    { id: "identity", label: "Nhận diện và loại phụ kiện", order: 0 },
    { id: "display", label: "Màn hình", order: 1 },
    { id: "input", label: "Thiết bị nhập liệu", order: 2 },
    { id: "audio", label: "Âm thanh", order: 3 },
    { id: "connectivity", label: "Kết nối", order: 4 },
    { id: "physical", label: "Kích thước và thiết kế", order: 5 },
  ],
  PC: [
    { id: "configuration", label: "Cấu hình được ghi nhận", order: 0 },
    { id: "identity", label: "Nhận diện hệ thống", order: 1 },
    { id: "connectivity", label: "Kết nối", order: 2 },
    { id: "physical", label: "Kích thước và khối lượng", order: 3 },
  ],
};

const fieldGroups: Record<string, Record<string, string>> = {
  CPU: { core_count: "compute", thread_count: "compute", socket: "identity", tdp_watt: "power" },
  GPU: { vram_gb: "memory" },
  MOTHERBOARD: { socket: "identity", form_factor: "identity", memory_type: "memory" },
  RAM: { capacity_gb: "memory", memory_type: "identity", speed_mhz: "performance" },
  STORAGE: { capacity_gb: "identity", form_factor: "identity", interface: "interface" },
  PSU: { wattage: "output", efficiency_rating: "output", modularity: "connectors" },
  CASE: {
    motherboard_form_factors: "compatibility",
    max_gpu_length_mm: "clearance",
    max_cooler_height_mm: "clearance",
  },
  COOLER: { supported_sockets: "compatibility", cooler_height_mm: "physical" },
  ACCESSORY: { accessory_type: "identity" },
  PC: { configuration_summary: "configuration", bom_status: "identity" },
};

function specificationGroup(type: string, code: string): SpecificationGroup {
  const metadataGroup = specificationGroupFor(type, code);
  if (metadataGroup.order !== Number.MAX_SAFE_INTEGER) return metadataGroup;
  const groups = typeGroups[type] ?? [];
  const id = fieldGroups[type]?.[code] ?? "other";
  return groups.find((group) => group.id === id) ?? {
    id: "other",
    label: "Thông số khác",
    order: Number.MAX_SAFE_INTEGER,
  };
}

function orderedSpecificationDefinitions(
  productType: string,
  definitions: CatalogAttributeDefinition[],
  specifications?: Record<string, unknown>,
): CatalogAttributeDefinition[] {
  return specificationDefinitionsFor(productType, definitions, specifications);
}

function hasValue(specifications: Record<string, unknown>, code: string): boolean {
  return Object.prototype.hasOwnProperty.call(specifications, code)
    && specifications[code] !== null
    && specifications[code] !== undefined
    && specifications[code] !== "";
}

export function groupSpecificationDefinitions(
  productType: string,
  definitions: CatalogAttributeDefinition[],
  specifications?: Record<string, unknown>,
): { id: string; label: string; definitions: CatalogAttributeDefinition[] }[] {
  const grouped = new Map<string, { id: string; label: string; order: number; definitions: CatalogAttributeDefinition[] }>();
  for (const definition of orderedSpecificationDefinitions(productType, definitions, specifications)) {
    const group = specificationGroup(productType, definition.code);
    const existing = grouped.get(group.id);
    if (existing) existing.definitions.push(definition);
    else grouped.set(group.id, { ...group, definitions: [definition] });
  }
  return [...grouped.values()].sort((left, right) => left.order - right.order);
}

export function TechnicalSpecifications({
  productType,
  productTypeName,
  specifications,
  definitions,
  verificationMetadata,
  specificationQuality,
  showEnglishLabels = true,
  showInternalMetadata = true,
}: {
  productType: string;
  productTypeName: string;
  specifications: Record<string, unknown>;
  definitions: CatalogAttributeDefinition[];
  verificationMetadata?: Record<string, CatalogAttributeVerification>;
  specificationQuality?: Record<string, CatalogAttributeQuality>;
  showEnglishLabels?: boolean;
  showInternalMetadata?: boolean;
}) {
  const isPCConfigurationField = (code: string) => productType === "PC"
    && ["component_details", "configuration_items", "configuration_summary", "bom_status"].includes(code);
  const applicable = orderedSpecificationDefinitions(productType, definitions, specifications)
    .filter((definition) => !isPCConfigurationField(definition.code));
  const knownCodes = new Set(applicable.map((definition) => definition.code));
  const additionalCodes = Object.keys(specifications)
    .filter((code) => !knownCodes.has(code) && !isPCConfigurationField(code))
    .sort((left, right) => left.localeCompare(right));
  const allRows = [
    ...applicable.map((definition) => ({
      code: definition.code,
      definition,
      value: specifications[definition.code],
      present: hasValue(specifications, definition.code),
      verification: showInternalMetadata
        ? verificationFor(verificationMetadata, definition.code, hasValue(specifications, definition.code))
        : undefined,
      quality: specificationQuality?.[definition.code],
    })),
    ...additionalCodes.map((code) => ({
      code,
      definition: undefined,
      value: specifications[code],
      present: hasValue(specifications, code),
      verification: showInternalMetadata
        ? verificationFor(verificationMetadata, code, hasValue(specifications, code))
        : undefined,
      quality: specificationQuality?.[code],
    })),
  ];
  const rows = showInternalMetadata ? allRows : allRows.filter((row) => row.present);

  if (rows.length === 0) {
    if (productType === "PC" && parsePCConfiguration(specifications.configuration_items)?.length) return null;
    return <p>Hiện chưa có thông số kỹ thuật được công khai cho model này.</p>;
  }

  const groups = new Map<string, { group: SpecificationGroup; rows: typeof rows }>();
  for (const row of rows) {
    const group = specificationGroup(productType, row.code);
    const existing = groups.get(group.id);
    if (existing) existing.rows.push(row);
    else groups.set(group.id, { group, rows: [row] });
  }
  const groupOrder = new Map(getSpecificationGroups(productType).map((group) => [group.id, group.order]));
  const orderedGroups = [...groups.values()].sort((left, right) =>
    (groupOrder.get(left.group.id) ?? left.group.order) - (groupOrder.get(right.group.id) ?? right.group.order));

  return <div className={`v2-technical-groups${showInternalMetadata ? "" : " is-customer-view"}`}>
    {showInternalMetadata
      ? <p className="v2-spec-dictionary-note">
        {productTypeName || productType} · Trạng thái xác minh được hiển thị riêng cho từng giá trị; trường thiếu được ghi là “Chưa có dữ liệu”.
        Các thông số không tự xác nhận tính tương thích hay tính năng.
        {productType === "GPU" && " Thông số GPU silicon và bo mạch có phạm vi khác nhau; không suy rộng giữa hãng hoặc model."}
      </p>
      : <p className="v2-spec-customer-note">Thông số kỹ thuật được trình bày theo nhóm để bạn dễ tham khảo.</p>}
    {orderedGroups.map(({ group, rows: groupRows }) => {
      const populated = groupRows.filter((row) => row.present).length;
      return <details className="v2-technical-group" key={group.id} open>
        <summary className="v2-technical-group-header">
          <h3>{group.label}</h3>
          {showInternalMetadata && <span>{populated}/{groupRows.length} trường có dữ liệu</span>}
        </summary>
        <dl className="v2-spec-grid">
          {groupRows.map(({ code, definition, value, present, verification, quality }) => (
            <div key={code}>
              <dt>{attributeLabel(definitions, productType, code)}
                {showInternalMetadata && showEnglishLabels && definition && <small className="v2-spec-english-label">{attributeEnglishLabel(definitions, productType, code)}</small>}
                {showInternalMetadata && definition && <small className="v2-spec-policy">{{
                  required: "Mức độ: Bắt buộc",
                  conditional: "Mức độ: Theo loại",
                  optional: "Mức độ: Tùy chọn",
                }[specificationDisplayPolicy(productType, definition)]}</small>}
                {showInternalMetadata && definition?.specificationScope && <small className="v2-spec-policy">
                  {definition.specificationScope === "GPU_SILICON" ? "Phạm vi: chip GPU" : "Phạm vi: biến thể bo mạch"}
                </small>}
              </dt>
              <dd>
                {present
                  ? <SpecificationValue value={value} definition={definition} />
                  : <span className="v2-spec-missing">Chưa có dữ liệu</span>}
                {showInternalMetadata && present && quality && <small className="v2-spec-quality-label">{quality.displayLabel}</small>}
                {showInternalMetadata && verification && <VerificationMetadataDisplay metadata={verification} />}
              </dd>
            </div>
          ))}
        </dl>
      </details>;
    })}
  </div>;
}

export function SpecificationComparison({
  products,
  definitions,
  hideIdentical,
  showEnglishLabels = true,
  showInternalMetadata = true,
}: {
  products: CatalogProduct[];
  definitions: CatalogAttributeDefinition[];
  hideIdentical: boolean;
  showEnglishLabels?: boolean;
  showInternalMetadata?: boolean;
}) {
  if (!products.length || products.some((product) => product.productType !== products[0].productType)) {
    return null;
  }
  const productType = products[0].productType;
  const isPCConfigurationField = (code: string) => productType === "PC"
    && ["component_details", "configuration_items", "configuration_summary", "bom_status"].includes(code);
  const applicableCodes = new Set(products.flatMap((product) =>
    orderedSpecificationDefinitions(productType, definitions, product.specifications)
      .map((definition) => definition.code)
      .filter((code) => !isPCConfigurationField(code))));
  const defined = orderedSpecificationDefinitions(productType, definitions)
    .filter((definition) => applicableCodes.has(definition.code) && !isPCConfigurationField(definition.code));
  const knownCodes = new Set(defined.map((definition) => definition.code));
  const extraCodes = [...new Set(products.flatMap((product) => Object.keys(product.specifications)))]
    .filter((code) => !knownCodes.has(code) && !isPCConfigurationField(code))
    .sort((left, right) => left.localeCompare(right));
  const rows = [
    ...defined.map((definition) => ({ code: definition.code, definition })),
    ...extraCodes.map((code) => ({ code, definition: undefined })),
  ];
  const grouped = new Map<string, { group: SpecificationGroup; rows: typeof rows }>();
  for (const row of rows) {
    const group = specificationGroup(productType, row.code);
    const existing = grouped.get(group.id);
    if (existing) existing.rows.push(row);
    else grouped.set(group.id, { group, rows: [row] });
  }
  const groups = [...grouped.values()].sort((left, right) => left.group.order - right.group.order);
  const valueFor = (product: CatalogProduct, code: string, definition?: CatalogAttributeDefinition) => (
    hasValue(product.specifications, code)
      ? formatSpecificationValue(product.specifications[code], definition)
      : "Chưa có dữ liệu"
  );
  const comparisonKey = (product: CatalogProduct, code: string, definition?: CatalogAttributeDefinition) => JSON.stringify([
    valueFor(product, code, definition),
    showInternalMetadata
      ? verificationFor(product.verificationMetadata, code, hasValue(product.specifications, code))
      : null,
  ]);
  const presentCount = (product: CatalogProduct) => rows.filter((row) => hasValue(product.specifications, row.code)).length;

  return <section className={`v2-spec-comparison${showInternalMetadata ? "" : " is-customer-view"}`}>
    <div className="v2-spec-comparison-heading">
      <div>
        <h2>So sánh thông số kỹ thuật</h2>
        {showInternalMetadata && <p>Số trường có dữ liệu được tính trên từ điển hiện tại, không phải đánh giá mức độ đầy đủ tổng thể.</p>}
      </div>
      {showInternalMetadata && <div className="v2-spec-coverage">
        {products.map((product) => <span key={product.modelCode}>
          <span className="v2-mono">{product.modelCode}</span>
          <strong>{presentCount(product)}/{rows.length} trường hiện có dữ liệu</strong>
        </span>)}
      </div>}
    </div>
    {showInternalMetadata && <p className="v2-spec-dictionary-note">
      Trạng thái xác minh được hiển thị riêng cho từng giá trị; không dùng bảng này làm kết luận tương thích.
      {productType === "GPU" && " Chip GPU và biến thể bo mạch có phạm vi thông số khác nhau; không suy rộng giữa hãng hoặc mã model."}
    </p>}
    {groups.map(({ group, rows: groupRows }) => {
      const visibleRows = groupRows.filter(({ code, definition }) => {
        if (!hideIdentical) return true;
        const values = products.map((product) => comparisonKey(product, code, definition));
        return new Set(values).size > 1;
      });
      return <details className="v2-compare-spec-group" key={group.id} open>
        <summary>
          <strong>{group.label}</strong>
          {showInternalMetadata && <span>{visibleRows.length}{hideIdentical ? `/${groupRows.length}` : ""} trường</span>}
        </summary>
        {visibleRows.length ? <div className="v2-table-wrap">
          <table className="v2-table v2-compare-spec-table">
            <thead><tr><th scope="col">Thông số</th>{products.map((product) => (
              <th scope="col" key={product.modelCode}>{product.productName}<small className="v2-mono">{product.modelCode}</small></th>
            ))}</tr></thead>
            <tbody>{visibleRows.map(({ code, definition }) => {
              const values = products.map((product) => comparisonKey(product, code, definition));
              const differs = new Set(values).size > 1;
              return <tr className={differs ? "v2-diff-row" : ""} key={code}>
                <th scope="row">{attributeLabel(definitions, productType, code)}
                  {showInternalMetadata && showEnglishLabels && definition && <small className="v2-spec-english-label">{attributeEnglishLabel(definitions, productType, code)}</small>}
                  {showInternalMetadata && definition?.specificationScope && <small className="v2-spec-policy">
                    {definition.specificationScope === "GPU_SILICON" ? "Phạm vi: chip GPU" : "Phạm vi: biến thể bo mạch"}
                  </small>}
                  {showInternalMetadata && definition && <small className="v2-spec-policy">{{
                    required: "Mức độ: Bắt buộc",
                    conditional: "Mức độ: Theo loại",
                    optional: "Mức độ: Tùy chọn",
                  }[specificationDisplayPolicy(productType, definition)]}</small>}
                </th>
                {products.map((product) => <td key={product.modelCode}>
                  {hasValue(product.specifications, code)
                    ? <SpecificationValue value={product.specifications[code]} definition={definition} />
                    : "Chưa có dữ liệu"}
                  {showInternalMetadata && hasValue(product.specifications, code) && product.specificationQuality?.[code]
                    && <small className="v2-spec-quality-label">{product.specificationQuality[code].displayLabel}</small>}
                  {showInternalMetadata && <VerificationMetadataDisplay metadata={verificationFor(
                      product.verificationMetadata,
                    code,
                    hasValue(product.specifications, code),
                  )} />}
                </td>)}
              </tr>;
            })}</tbody>
          </table>
        </div> : <p className="v2-muted">Không có thông số khác biệt trong nhóm này.</p>}
      </details>;
    })}
  </section>;
}

interface StructuredConfigurationComponent {
  componentType: string;
  modelCode: string;
  productName?: string;
  quantity?: number;
  componentWarrantyMonths?: number;
  keySpecifications?: Record<string, unknown>;
}

const componentTypeOrder = ["CPU", "GPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "COOLER", "CASE", "ACCESSORY", "OTHER"];
const componentSpecificationLabels: Record<string, string> = {
  boost_GHz: "Xung tăng tối đa",
  capacity_GB: "Dung lượng",
  capacity_gb: "Dung lượng",
  CAS: "Độ trễ CAS",
  cas_latency_cycles: "Độ trễ CAS",
  chipset: "Chipset",
  cores: "Số nhân",
  data_rate_MT_s: "Tốc độ dữ liệu",
  data_rate_mt_s: "Tốc độ dữ liệu",
  drive_type: "Loại ổ đĩa",
  efficiency: "Hiệu suất",
  form_factor: "Chuẩn kích thước",
  height_mm: "Chiều cao",
  interface: "Giao tiếp",
  max_GPU_length_mm: "Chiều dài GPU tối đa",
  max_gpu_length_mm: "Chiều dài GPU tối đa",
  memory_bus_bit: "Độ rộng bus bộ nhớ",
  memory_type: "Loại bộ nhớ",
  modularity: "Thiết kế cáp nguồn",
  processor_units: "Số đơn vị xử lý",
  protocol: "Giao thức",
  read_MB_s: "Tốc độ đọc tuần tự",
  sequential_read_mb_s: "Tốc độ đọc tuần tự",
  sequential_write_mb_s: "Tốc độ ghi tuần tự",
  vram_gb: "Bộ nhớ đồ họa",
  wattage_w: "Công suất định mức",
  socket: "Socket",
  sockets: "Socket hỗ trợ",
  threads: "Số luồng",
  type: "Loại tản nhiệt",
  VRAM_GB: "Bộ nhớ đồ họa",
  wattage_W: "Công suất định mức",
  write_MB_s: "Tốc độ ghi tuần tự",
};
const componentSpecificationUnits: Record<string, string> = {
  boost_GHz: "GHz",
  capacity_GB: "GB",
  capacity_gb: "GB",
  data_rate_MT_s: "MT/s",
  data_rate_mt_s: "MT/s",
  cas_latency_cycles: "chu kỳ",
  height_mm: "mm",
  max_GPU_length_mm: "mm",
  max_gpu_length_mm: "mm",
  memory_bus_bit: "bit",
  read_MB_s: "MB/s",
  sequential_read_mb_s: "MB/s",
  sequential_write_mb_s: "MB/s",
  VRAM_GB: "GB",
  vram_gb: "GB",
  wattage_W: "W",
  wattage_w: "W",
  write_MB_s: "MB/s",
};

const componentSpecificationPriority: Record<string, string[]> = {
  CPU: ["socket", "cores", "threads", "boost_GHz"],
  GPU: ["memory_type", "VRAM_GB", "memory_bus_bit"],
  MOTHERBOARD: ["socket", "chipset", "memory_type", "form_factor"],
  RAM: ["memory_type", "capacity_gb", "data_rate_mt_s", "cas_latency_cycles"],
  STORAGE: ["capacity_gb", "interface", "protocol", "drive_type", "sequential_read_mb_s", "sequential_write_mb_s"],
  PSU: ["wattage_W", "efficiency", "modularity", "form_factor"],
  COOLER: ["type", "socket", "height_mm"],
  CASE: ["form_factor", "max_gpu_length_mm", "height_mm"],
};

function componentSpecificationEntries(
  componentType: string,
  specifications: Record<string, unknown> | undefined,
): { code: string; label: string; value: string }[] {
  if (!specifications) return [];
  const priority = componentSpecificationPriority[componentType.toUpperCase()] ?? [];
  const entries = Object.entries(specifications)
    .filter(([, value]) => value !== null && value !== undefined
      && value !== "" && (!Array.isArray(value) || value.length > 0));
  const prioritized = priority
    .map((code) => entries.find(([entryCode]) => entryCode === code))
    .filter((entry): entry is [string, unknown] => entry !== undefined);
  const prioritizedCodes = new Set(priority);
  const remaining = entries
    .filter(([code]) => !prioritizedCodes.has(code))
    .sort(([left], [right]) => left.localeCompare(right));
  const selected = [...prioritized, ...remaining];
  return selected
    .slice(0, 6)
    .map(([code, value]) => {
      const formatted = formatPCComponentSpecification(code, value);
      const separator = formatted.indexOf(":");
      return {
        code,
        label: separator < 0 ? humanizeCode(code) : formatted.slice(0, separator),
        value: separator < 0 ? formatted : formatted.slice(separator + 1).trim(),
      };
    });
}

export function formatPCComponentSpecification(code: string, value: unknown): string {
  const formatted = typeof value === "boolean" ? (value ? "Có" : "Không") : formatSpecificationValue(value);
  const unit = componentSpecificationUnits[code];
  return `${componentSpecificationLabels[code] ?? humanizeCode(code)}: ${formatted}${unit && typeof value === "number" ? ` ${unit}` : ""}`;
}

function structuredConfiguration(value: unknown): StructuredConfigurationComponent[] | undefined {
  return parsePCConfiguration(value);
}

export function PCConfigurationComparison({ products }: { products: CatalogProduct[] }) {
  if (!products.length || products.some((product) => product.productType !== "PC")) return null;
  if (products.some((product) => !hasVerifiedPCConfiguration(product.verificationMetadata))) return null;
  const configurations = products.map((product) =>
    structuredConfiguration(product.specifications.component_details)
      ?? structuredConfiguration(product.specifications.configuration_items));
  if (!configurations.some((configuration) => configuration !== undefined)) return null;
  const componentTypes = [...new Set(configurations.flatMap((configuration) =>
    configuration?.map((component) => component.componentType) ?? []))]
    .sort((left, right) => componentTypeOrder.indexOf(left) - componentTypeOrder.indexOf(right));
  return <section className="v2-spec-comparison">
    <div className="v2-spec-comparison-heading">
      <div>
        <h2>So sánh thành phần cấu hình có định danh</h2>
        <p>Chỉ các mục có component_type và model_code tường minh mới được đối chiếu; không suy luận BOM hoặc tương thích.</p>
      </div>
    </div>
    <div className="v2-table-wrap">
      <table className="v2-table v2-compare-spec-table">
        <thead><tr><th scope="col">Loại thành phần</th>{products.map((product) =>
          <th scope="col" key={product.modelCode}>{product.productName}<small className="v2-mono">{product.modelCode}</small></th>)}</tr></thead>
        <tbody>{componentTypes.map((componentType) => {
          const values = configurations.map((configuration) => configuration
            ?.filter((component) => component.componentType === componentType)
            .map((component) => `${component.modelCode}${component.productName ? ` — ${component.productName}` : ""}`)
            .sort((left, right) => left.localeCompare(right)));
          const normalized = values.map((value) => value?.join("\n") ?? "Chưa có cấu hình thành phần có định danh");
          const differs = new Set(normalized).size > 1;
          return <tr className={differs ? "v2-diff-row" : ""} key={componentType}>
            <th scope="row">{pcComponentTypeLabel(componentType)}</th>
            {values.map((value, index) => <td key={products[index].modelCode}>
              {value?.length ? <ul>{value.map((item) => <li className="v2-mono" key={item}>{item}</li>)}</ul> : "Chưa có cấu hình thành phần có định danh"}
            </td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}

export function PCConfigurationSummary({
  specifications,
  verificationMetadata,
  limit = 4,
}: {
  specifications: Record<string, unknown>;
  verificationMetadata?: Record<string, CatalogAttributeVerification>;
  limit?: number;
}) {
  if (!hasVerifiedPCConfiguration(verificationMetadata)) return null;
  const entries = pcConfigurationSummaryEntries(
    specifications.component_details ?? specifications.configuration_items,
    specifications.configuration_summary,
  );
  if (entries.length === 0) return null;
  const visibleEntries = entries.slice(0, limit);
  const status = pcConfigurationStatusLabel(specifications.bom_status);
  return <section className="v2-pc-configuration-summary" aria-label="Tóm tắt cấu hình linh kiện">
    <div className="v2-pc-configuration-summary-heading">
      <strong>Cấu hình linh kiện</strong>
      {status && <span>{status}</span>}
    </div>
    <ul>{visibleEntries.map((entry, index) => <li key={`${index}:${entry}`}>{entry}</li>)}</ul>
    {entries.length > visibleEntries.length && <span className="v2-pc-configuration-more">
      +{entries.length - visibleEntries.length} linh kiện
    </span>}
  </section>;
}

export function PCConfigurationDetails({
  specifications,
  bomComponents,
}: {
  specifications: Record<string, unknown>;
  bomComponents?: CatalogBomComponent[];
}) {
  const specificationComponents = parsePCConfiguration(specifications.component_details)
    ?? parsePCConfiguration(specifications.configuration_items)
    ?? [];
  const components = (bomComponents ?? []).map((component) => {
      const details = specificationComponents.find((entry) => entry.modelCode === component.modelCode);
      return {
        componentType: component.productType || details?.componentType || component.displayCategory,
        modelCode: component.modelCode,
        productName: component.productName || details?.productName,
        quantity: component.quantity,
        componentWarrantyMonths: component.warrantyMonths ?? undefined,
        keySpecifications: details?.keySpecifications ?? component.keySpecifications ?? undefined,
        imageUrl: component.imageUrl,
        imageAltText: component.imageAltText,
      };
    });
  const status = pcConfigurationStatusLabel(specifications.bom_status);
  const hasComponents = components.length > 0;
  const hasWarranty = components.some((component) => formatWarranty(component.componentWarrantyMonths));
  const hasSpecifications = components.some((component) =>
    componentSpecificationEntries(component.componentType, component.keySpecifications).length > 0);
  if (!hasComponents) return null;
  return <section className="v2-pc-configuration-details" aria-labelledby="pc-configuration-title">
    <div className="v2-pc-configuration-details-heading">
      <div>
        <h2 id="pc-configuration-title">Cấu hình linh kiện</h2>
      </div>
      {hasComponents && status && <span className="v2-pc-configuration-status">{status}</span>}
    </div>
    <div className="v2-table-wrap v2-pc-configuration-table-wrap">
      <table className={`v2-table v2-pc-configuration-table${hasWarranty ? " has-warranty" : ""}${hasSpecifications ? " has-specifications" : ""}`}>
        <colgroup><col /><col /><col /><col />
          {hasWarranty && <col />}
          {hasSpecifications && <col />}
        </colgroup>
        <thead><tr>
          <th scope="col">Loại linh kiện</th>
          <th scope="col">Linh kiện</th>
          <th scope="col">Mã model</th>
          <th scope="col">Số lượng</th>
          {hasWarranty && <th scope="col">Bảo hành</th>}
          {hasSpecifications && <th scope="col">Thông số chính</th>}
        </tr></thead>
        <tbody>{components.map((component, index) => <tr key={`${index}:${component.componentType}:${component.modelCode}`}>
          <td className="v2-pc-bom-type">{pcComponentTypeLabel(component.componentType)}</td>
          <td><div className="v2-pc-bom-component">
            <Link to={`/customer/product?modelCode=${encodeURIComponent(component.modelCode)}`}>
              <ProductArtwork
                image={component.imageUrl
                  ? { url: component.imageUrl, altText: component.imageAltText ?? component.productName ?? component.modelCode, isPrimary: true }
                  : undefined}
                productName={component.productName ?? component.modelCode}
                productType={component.componentType}
              />
            </Link>
            <Link to={`/customer/product?modelCode=${encodeURIComponent(component.modelCode)}`}>
              {component.productName ?? "Chưa có tên sản phẩm"}
            </Link>
          </div></td>
          <td className="v2-mono v2-pc-bom-model">{component.modelCode}</td>
          <td>{component.quantity ?? "—"}</td>
          {hasWarranty && <td>{formatWarranty(component.componentWarrantyMonths)}</td>}
          {hasSpecifications && <td><div className="v2-pc-bom-specs">
            {componentSpecificationEntries(component.componentType, component.keySpecifications)
              .map((specification) => <span key={specification.code}>
                <strong>{specification.label}</strong>{specification.value}
              </span>)}
          </div></td>}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export function PCComponentChecklist({ components }: { components: CatalogBomComponent[] }) {
  if (components.length === 0) return null;
  return <section className="v2-pc-component-checklist" aria-label="Tóm tắt cấu hình PC">
    <h2>Cấu hình linh kiện</h2>
    <ul>{[...components].sort((a, b) => a.displayOrder - b.displayOrder).map((component) => {
      const specs = component.keySpecifications
        ? Object.entries(component.keySpecifications)
          .map(([key, value]) => formatPCComponentSpecification(key, value))
          .filter(Boolean)
          .slice(0, 2)
        : [];
      return <li key={`${component.displayOrder}:${component.modelCode}`}>
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="v2-pc-checklist-type">{pcComponentTypeLabel(component.productType || component.displayCategory)}</span>
        <span className="v2-pc-checklist-name">
          {component.productName}
          <small>{component.modelCode}{component.quantity > 1 ? ` · ${component.quantity} cái` : ""}</small>
        </span>
        {specs.length > 0 && <span className="v2-pc-checklist-specs">{specs.join(" · ")}</span>}
      </li>;
    })}</ul>
  </section>;
}

export function SpecificationHighlights({
  productType,
  specifications,
  definitions,
  limit = 3,
}: {
  productType: string;
  specifications: Record<string, unknown>;
  definitions: CatalogAttributeDefinition[];
  limit?: number;
}) {
  const priorities = specificationHighlightPriority(productType)
    .filter((code) => productType !== "PC"
      || !["component_details", "configuration_items", "configuration_summary", "bom_status"].includes(code));
  const entries = priorities
    .filter((code) => hasValue(specifications, code))
    .map((code) => [code, specifications[code]] as const)
    .slice(0, limit);
  if (entries.length === 0) return null;
  return <ul className="v2-spec-highlights">
    {entries.map(([code, value]) => {
      const definition = findAttributeDefinition(definitions, productType, code);
      return <li key={code}>
        <span>{attributeLabel(definitions, productType, code)}</span>
        <strong>{formatSpecificationValue(value, definition)}</strong>
      </li>;
    })}
  </ul>;
}

function conditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    NEW: "Hàng mới",
    LIKE_NEW: "Hàng như mới",
    USED: "Đã qua sử dụng",
    REFURBISHED: "Đã tân trang",
  };
  return labels[condition] ?? condition;
}

function conditionPercentage(offer: CatalogOffer): string | null {
  const percentage = offer.conditionPercentage;
  if (typeof percentage !== "number" || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return null;
  }
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(percentage)}%`;
}

function conditionDescription(offer: CatalogOffer): string | null {
  const description = offer.conditionDescription?.trim();
  return description ? description : null;
}

function conditionDisplayName(offer: CatalogOffer): string {
  const percentage = conditionPercentage(offer);
  return percentage ? `${conditionLabel(offer.condition)} – ${percentage}` : conditionLabel(offer.condition);
}

function offerStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Đang bán",
    INACTIVE: "Ngừng bán",
    DRAFT: "Bản nháp",
    SOLD_OUT: "Hết hàng",
  };
  return labels[status] ?? status;
}

export function OfferInformation({
  offer,
  selected = false,
  onSelect,
}: {
  offer: CatalogOffer;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const content = <>
    <div className="v2-offer-heading">
      <div><Badge tone="primary">{conditionLabel(offer.condition)}</Badge></div>
      {onSelect && <span className="v2-offer-radio" aria-hidden="true">{selected ? "●" : "○"}</span>}
    </div>
    <dl className="v2-offer-details">
      <div><dt>Giá</dt><dd>{money(offer.price, offer.currency)}</dd></div>
      <div><dt>Tình trạng</dt><dd>{offer.availableQuantity > 0 ? offerStatusLabel(offer.status) : "Hết hàng"}</dd></div>
      <div><dt>Số lượng khả dụng</dt><dd>{offer.availableQuantity}</dd></div>
      <div><dt>Bảo hành</dt><dd><WarrantyDisplay months={offer.warrantyMonths} showMissing /></dd></div>
    </dl>
  </>;

  if (onSelect) {
    return <button type="button" className={`v2-offer-choice${selected ? " is-selected" : ""}`} onClick={onSelect} aria-pressed={selected}>
      {content}
    </button>;
  }
  return <Card className="v2-offer-card">{content}</Card>;
}

export function OfferList({
  offers,
  selectedOfferId,
  onSelect,
}: {
  offers: CatalogOffer[];
  selectedOfferId?: string;
  onSelect?: (offer: CatalogOffer) => void;
}) {
  const visibleOffers = customerVisibleOffers(offers);
  if (visibleOffers.length === 0) return <p>Thông tin giá bán chưa được cập nhật.</p>;
  return <div className="v2-offer-list">{visibleOffers.map((offer) => <OfferInformation
    key={offer.offerId}
    offer={offer}
    selected={offer.offerId === selectedOfferId}
    onSelect={onSelect ? () => onSelect(offer) : undefined}
  />)}</div>;
}

export function ProductOfferPanel({
  offers,
  selectedOfferId,
  onSelect,
}: {
  offers: CatalogOffer[];
  selectedOfferId?: string;
  onSelect: (offer: CatalogOffer) => void;
}) {
  const visibleOffers = customerVisibleOffers(offers);
  const selectedOffer = visibleOffers.find((offer) => offer.offerId === selectedOfferId) ?? visibleOffers[0];
  return <section className="v2-product-commercial" aria-label="Thông tin giá và ưu đãi">
    {selectedOffer ? <>
      <div className="v2-current-offer">
        <div className="v2-current-offer-price">
          <span className="v2-current-offer-label">Giá bán hiện tại</span>
          {offerOriginalPrice(selectedOffer) > 0
            && <span className="v2-promotion-original-price">{money(offerOriginalPrice(selectedOffer), selectedOffer.currency)}</span>}
          <strong>{money(selectedOffer.price, selectedOffer.currency)}</strong>
        </div>
        <div className="v2-current-offer-facts">
          <Badge tone="primary">{conditionDisplayName(selectedOffer)}</Badge>
          {selectedOffer.saleBadge && <Badge tone="success">{selectedOffer.saleBadge}</Badge>}
          <span>Số lượng khả dụng: <strong>{selectedOffer.availableQuantity}</strong></span>
          {formatWarranty(selectedOffer.warrantyMonths) && <span><strong>Bảo hành:</strong> {formatWarranty(selectedOffer.warrantyMonths)}</span>}
        </div>
        {selectedOffer.promotionDisplayCopy && <p className="v2-current-offer-description">{selectedOffer.promotionDisplayCopy}</p>}
        {conditionDescription(selectedOffer) && <p className="v2-current-offer-description">{conditionDescription(selectedOffer)}</p>}
        {selectedOffer.gifts?.some((gift) => gift.active && gift.availableQuantity >= gift.quantity)
          && <div className="v2-current-offer-description">
            <strong>Quà tặng:</strong>
            <ul>{selectedOffer.gifts.filter((gift) => gift.active && gift.availableQuantity >= gift.quantity).map((gift) =>
              <li key={`${gift.promotionId}-${gift.offerId}`}>
                {gift.productName} × {gift.quantity}
                {gift.selectionRequired ? " · Cần chọn trong giỏ hàng" : " · Tùy chọn"}
              </li>)}</ul>
          </div>}
      </div>
      {visibleOffers.length > 1 && <div className="v2-offer-selector" role="group" aria-label="Chọn tình trạng sản phẩm">
        {visibleOffers.map((offer) => {
          const selected = offer.offerId === selectedOffer.offerId;
          return <button
            key={offer.offerId}
            type="button"
            className={`v2-offer-selector-option${selected ? " is-selected" : ""}`}
            onClick={() => onSelect(offer)}
            aria-pressed={selected}
          >
            <span className="v2-offer-selector-condition">{conditionDisplayName(offer)}</span>
            {conditionDescription(offer) && <span className="v2-offer-selector-description">{conditionDescription(offer)}</span>}
            {selected && <span className="v2-offer-selector-selected">Đang chọn</span>}
          </button>;
        })}
      </div>}
    </> : <>
      <p className="v2-muted">Hiện chưa có ưu đãi hợp lệ để đặt mua.</p>
    </>}
  </section>;
}

export function SpecificationGroupHeading({ children }: { children: ReactNode }) {
  return <tr className="v2-compare-group"><th colSpan={20}>{children}</th></tr>;
}
