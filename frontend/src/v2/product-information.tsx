import type { CatalogAttributeDefinition, CatalogOffer, CatalogProduct } from "../catalog-api";
import type { ReactNode } from "react";
import { Badge, Card } from "./components";
import { money } from "../demo/demo-store";
import {
  getSpecificationGroups,
  specificationDefinitionsFor,
  specificationDisplayPolicy,
  specificationGroupFor,
  specificationHighlightPriority,
} from "./specification-metadata";

export function formatWarranty(months: number | null | undefined): string | null {
  if (typeof months !== "number" || !Number.isSafeInteger(months) || months <= 0) return null;
  return `${months} tháng`;
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
  if (typeof value === "object" && !Array.isArray(value)
      && "status" in value && value.status === "NOT_APPLICABLE") {
    return "Không áp dụng";
  }
  if (definition?.dataType === "BOOLEAN" && typeof value === "boolean") {
    return value ? "Có" : "Không";
  }
  if (typeof value === "number") {
    const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 }).format(value);
    return definition?.unit ? `${number} ${definition.unit}` : number;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatSpecificationValue(item)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function SpecificationValue({
  value,
  definition,
  productType,
}: {
  value: unknown;
  definition?: CatalogAttributeDefinition;
  productType: string;
}) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)
      && "status" in value && value.status === "NOT_APPLICABLE") {
    return <span className="v2-spec-not-applicable">Không áp dụng</span>;
  }
  if (!Array.isArray(value)) return formatSpecificationValue(value, definition);
  return <div className="v2-spec-array-value">
    {productType === "PC" && <span className="v2-muted">Danh sách cấu hình được lưu; vai trò từng mục chưa được xác định trong dữ liệu.</span>}
    <ul>{value.map((item, index) => <li key={`${index}:${String(item)}`}>{formatStructuredListItem(item)}</li>)}</ul>
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
    "RAM:speed_mhz": "Tốc độ theo đơn vị lưu trong catalog",
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
  showEnglishLabels = true,
}: {
  productType: string;
  productTypeName: string;
  specifications: Record<string, unknown>;
  definitions: CatalogAttributeDefinition[];
  showEnglishLabels?: boolean;
}) {
  const applicable = orderedSpecificationDefinitions(productType, definitions, specifications);
  const knownCodes = new Set(applicable.map((definition) => definition.code));
  const additionalCodes = Object.keys(specifications)
    .filter((code) => !knownCodes.has(code))
    .sort((left, right) => left.localeCompare(right));
  const rows = [
    ...applicable.map((definition) => ({
      code: definition.code,
      definition,
      value: specifications[definition.code],
      present: hasValue(specifications, definition.code),
    })),
    ...additionalCodes.map((code) => ({
      code,
      definition: undefined,
      value: specifications[code],
      present: hasValue(specifications, code),
    })),
  ];

  if (rows.length === 0) {
    return <p>Chưa có thông số kỹ thuật được cung cấp cho model này.</p>;
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

  return <div className="v2-technical-groups">
    <p className="v2-spec-dictionary-note">
      {productTypeName || productType} · Trường chưa được cung cấp được ghi là “Chưa có dữ liệu”.
      Giá trị hiện có chưa được xác minh theo nguồn cho từng model; các nhóm không xác nhận tương thích hay tính năng.
      {productType === "GPU" && " Thông số GPU silicon và bo mạch là phạm vi khác nhau; không sao chép giá trị giữa hãng hoặc biến thể nếu chưa xác minh đúng mã model."}
    </p>
    {orderedGroups.map(({ group, rows: groupRows }) => {
      const populated = groupRows.filter((row) => row.present).length;
      return <details className="v2-technical-group" key={group.id} open>
        <summary className="v2-technical-group-header">
          <h3>{group.label}</h3>
          <span>{populated}/{groupRows.length} trường có dữ liệu</span>
        </summary>
        <dl className="v2-spec-grid">
          {groupRows.map(({ code, definition, value, present }) => (
            <div key={code}>
              <dt>{attributeLabel(definitions, productType, code)}
                {showEnglishLabels && definition && <small className="v2-spec-english-label">{attributeEnglishLabel(definitions, productType, code)}</small>}
                {definition && <small className="v2-spec-policy">{{
                  required: "Cần xác minh",
                  conditional: "Theo loại",
                  optional: "Tùy chọn",
                }[specificationDisplayPolicy(productType, definition)]}</small>}
                {definition?.specificationScope && <small className="v2-spec-policy">
                  {definition.specificationScope === "GPU_SILICON" ? "Phạm vi: chip GPU" : "Phạm vi: biến thể bo mạch"}
                </small>}
              </dt>
              <dd>{present
                ? <SpecificationValue value={value} definition={definition} productType={productType} />
                : <span className="v2-spec-missing">Chưa có dữ liệu</span>}</dd>
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
}: {
  products: CatalogProduct[];
  definitions: CatalogAttributeDefinition[];
  hideIdentical: boolean;
  showEnglishLabels?: boolean;
}) {
  if (!products.length || products.some((product) => product.productType !== products[0].productType)) {
    return null;
  }
  const productType = products[0].productType;
  const applicableCodes = new Set(products.flatMap((product) =>
    orderedSpecificationDefinitions(productType, definitions, product.specifications)
      .map((definition) => definition.code)));
  const defined = orderedSpecificationDefinitions(productType, definitions)
    .filter((definition) => applicableCodes.has(definition.code));
  const knownCodes = new Set(defined.map((definition) => definition.code));
  const extraCodes = [...new Set(products.flatMap((product) => Object.keys(product.specifications)))]
    .filter((code) => !knownCodes.has(code))
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
  const presentCount = (product: CatalogProduct) => rows.filter((row) => hasValue(product.specifications, row.code)).length;

  return <section className="v2-spec-comparison">
    <div className="v2-spec-comparison-heading">
      <div>
        <h2>So sánh thông số kỹ thuật</h2>
        <p>Số trường có dữ liệu được tính trên từ điển hiện tại, không phải đánh giá mức độ đầy đủ tổng thể.</p>
      </div>
      <div className="v2-spec-coverage">
        {products.map((product) => <span key={product.modelCode}>
          <span className="v2-mono">{product.modelCode}</span>
          <strong>{presentCount(product)}/{rows.length} trường hiện có dữ liệu</strong>
        </span>)}
      </div>
    </div>
    <p className="v2-spec-dictionary-note">
      Các giá trị hiện có trong catalog chưa được xác minh theo nguồn cho từng model; không dùng bảng này làm kết luận tương thích.
      {productType === "GPU" && " Chip GPU và biến thể bo mạch có phạm vi thông số khác nhau; không suy rộng giữa hãng hoặc mã model."}
    </p>
    {groups.map(({ group, rows: groupRows }) => {
      const visibleRows = groupRows.filter(({ code, definition }) => {
        if (!hideIdentical) return true;
        const values = products.map((product) => valueFor(product, code, definition));
        return new Set(values).size > 1;
      });
      return <details className="v2-compare-spec-group" key={group.id} open>
        <summary>
          <strong>{group.label}</strong>
          <span>{visibleRows.length}{hideIdentical ? `/${groupRows.length}` : ""} trường</span>
        </summary>
        {visibleRows.length ? <div className="v2-table-wrap">
          <table className="v2-table v2-compare-spec-table">
            <thead><tr><th scope="col">Thông số</th>{products.map((product) => (
              <th scope="col" key={product.modelCode}>{product.productName}<small className="v2-mono">{product.modelCode}</small></th>
            ))}</tr></thead>
            <tbody>{visibleRows.map(({ code, definition }) => {
              const values = products.map((product) => valueFor(product, code, definition));
              const differs = new Set(values).size > 1;
              return <tr className={differs ? "v2-diff-row" : ""} key={code}>
                <th scope="row">{attributeLabel(definitions, productType, code)}
                  {showEnglishLabels && definition && <small className="v2-spec-english-label">{attributeEnglishLabel(definitions, productType, code)}</small>}
                  {definition?.specificationScope && <small className="v2-spec-policy">
                    {definition.specificationScope === "GPU_SILICON" ? "Phạm vi: chip GPU" : "Phạm vi: biến thể bo mạch"}
                  </small>}
                </th>
                {products.map((product, index) => <td key={product.modelCode}>
                  {hasValue(product.specifications, code)
                    ? <SpecificationValue value={product.specifications[code]} definition={definition} productType={productType} />
                    : values[index]}
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
}

const componentTypeOrder = [
  "CPU", "GPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "COOLER", "CASE", "ACCESSORY", "OTHER",
];

function structuredConfiguration(value: unknown): StructuredConfigurationComponent[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const parsed: StructuredConfigurationComponent[] = [];
  for (const component of value) {
    if (typeof component !== "object" || component === null || Array.isArray(component)) return undefined;
    const record = component as Record<string, unknown>;
    const componentType = record.component_type;
    const modelCode = record.model_code;
    const productName = record.product_name;
    if (typeof componentType !== "string"
        || !componentTypeOrder.includes(componentType.toUpperCase())
        || typeof modelCode !== "string"
        || !modelCode.trim()
        || (productName !== undefined && typeof productName !== "string")) {
      return undefined;
    }
    parsed.push({
      componentType: componentType.toUpperCase(),
      modelCode: modelCode.trim(),
      ...(typeof productName === "string" && productName.trim() ? { productName: productName.trim() } : {}),
    });
  }
  return parsed;
}

export function PCConfigurationComparison({ products }: { products: CatalogProduct[] }) {
  if (!products.length || products.some((product) => product.productType !== "PC")) return null;
  const configurations = products.map((product) =>
    structuredConfiguration(product.specifications.configuration_items));
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
            <th scope="row">{componentType}</th>
            {values.map((value, index) => <td key={products[index].modelCode}>
              {value?.length ? <ul>{value.map((item) => <li className="v2-mono" key={item}>{item}</li>)}</ul> : "Chưa có cấu hình thành phần có định danh"}
            </td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
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
  const priorities = specificationHighlightPriority(productType);
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
      <div><dt>Mã offer</dt><dd className="v2-mono">{offer.offerCode}</dd></div>
      <div><dt>Giá</dt><dd>{money(offer.price, offer.currency)}</dd></div>
      <div><dt>Tồn khả dụng{offer.isDemo ? " · minh họa" : ""}</dt><dd>{offer.availableQuantity}</dd></div>
      <div><dt>Trạng thái</dt><dd>{offerStatusLabel(offer.status)}</dd></div>
      <div><dt>Bảo hành</dt><dd><WarrantyDisplay months={offer.warrantyMonths} showMissing /></dd></div>
    </dl>
    {offer.isDemo && <p className="v2-muted">Giá và tồn kho của offer này là dữ liệu minh họa.</p>}
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
  selectedOfferCode,
  onSelect,
}: {
  offers: CatalogOffer[];
  selectedOfferCode?: string;
  onSelect?: (offer: CatalogOffer) => void;
}) {
  if (offers.length === 0) return <p>Chưa có ưu đãi đang hoạt động.</p>;
  return <div className="v2-offer-list">{offers.map((offer) => <OfferInformation
    key={offer.offerCode}
    offer={offer}
    selected={offer.offerCode === selectedOfferCode}
    onSelect={onSelect ? () => onSelect(offer) : undefined}
  />)}</div>;
}

export function ProductOfferPanel({
  offers,
  selectedOfferCode,
  onSelect,
}: {
  offers: CatalogOffer[];
  selectedOfferCode?: string;
  onSelect: (offer: CatalogOffer) => void;
}) {
  const selectedOffer = offers.find((offer) => offer.offerCode === selectedOfferCode) ?? offers[0];
  return <section className="v2-product-commercial" aria-label="Thông tin giá và ưu đãi">
    {selectedOffer ? <>
      <div className="v2-current-offer">
        <div className="v2-current-offer-price">
          <span className="v2-current-offer-label">Giá bán hiện tại</span>
          {selectedOffer.isDemo && <Badge tone="gold">Giá minh họa</Badge>}
          <strong>{money(selectedOffer.price, selectedOffer.currency)}</strong>
        </div>
        <div className="v2-current-offer-facts">
          <Badge tone="primary">{conditionDisplayName(selectedOffer)}</Badge>
          <span>{selectedOffer.isDemo ? "Tồn kho minh họa" : "Số lượng khả dụng"}: <strong>{selectedOffer.availableQuantity}</strong></span>
          {formatWarranty(selectedOffer.warrantyMonths) && <span><strong>Bảo hành:</strong> {formatWarranty(selectedOffer.warrantyMonths)}</span>}
        </div>
        {conditionDescription(selectedOffer) && <p className="v2-current-offer-description">{conditionDescription(selectedOffer)}</p>}
        <p className="v2-current-offer-code">Mã ưu đãi: <span className="v2-mono">{selectedOffer.offerCode}</span></p>
      </div>
      {offers.length > 1 && <div className="v2-offer-selector" role="group" aria-label="Chọn tình trạng sản phẩm">
        {offers.map((offer) => {
          const selected = offer.offerCode === selectedOffer.offerCode;
          return <button
            key={offer.offerCode}
            type="button"
            className={`v2-offer-selector-option${selected ? " is-selected" : ""}`}
            onClick={() => onSelect(offer)}
            aria-pressed={selected}
          >
            <span className="v2-offer-selector-condition">{conditionDisplayName(offer)}</span>
            <span className="v2-offer-selector-code">Mã ưu đãi: {offer.offerCode}</span>
            {conditionDescription(offer) && <span className="v2-offer-selector-description">{conditionDescription(offer)}</span>}
            {selected && <span className="v2-offer-selector-selected">Đang chọn</span>}
          </button>;
        })}
      </div>}
    </> : <p className="v2-muted">Chưa có ưu đãi đang hoạt động.</p>}
  </section>;
}

export function SpecificationGroupHeading({ children }: { children: ReactNode }) {
  return <tr className="v2-compare-group"><th colSpan={20}>{children}</th></tr>;
}
