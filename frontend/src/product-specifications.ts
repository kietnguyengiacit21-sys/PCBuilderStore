import definitionsCsv from "../../backend-java/src/main/resources/catalog-attribute-definitions.csv?raw";

type SpecificationDefinition = {
  product_type: string;
  code: string;
  label_vi: string;
  data_type: string;
  unit: string;
  subtype: string;
};

type SpecificationEntry = {
  code: string;
  label: string;
  value: string;
};

export type SpecificationGroup = {
  title: string;
  entries: SpecificationEntry[];
};

type ComparisonSpecificationGroup = {
  title: string;
  codes: string[];
};

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function loadDefinitions(source: string): Map<string, SpecificationDefinition> {
  const rows = parseCsv(source);
  const headers = rows[0] ?? [];
  const definitions = new Map<string, SpecificationDefinition>();
  for (const cells of rows.slice(1)) {
    if (cells.length < headers.length) continue;
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    if (!record.product_type || !record.code) continue;
    const definition: SpecificationDefinition = {
      product_type: record.product_type,
      code: record.code,
      label_vi: record.label_vi || record.code,
      data_type: record.data_type || "TEXT",
      unit: record.unit || "",
      subtype: record.subtype || "",
    };
    definitions.set(`${definition.product_type}.${definition.code}`, definition);
  }
  return definitions;
}

const definitions = loadDefinitions(definitionsCsv);
const missingValue = (value: unknown): boolean => value === null || value === undefined || value === "";

function fallbackLabel(code: string): string {
  return code.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function getSpecificationLabel(productType: string, code: string): string {
  return definitions.get(`${productType}.${code}`)?.label_vi ?? fallbackLabel(code);
}

function formatObject(value: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    length: "Dài",
    width: "Rộng",
    height: "Cao",
    depth: "Sâu",
    type: "Loại",
    count: "Số lượng",
    version: "Phiên bản",
  };
  return Object.entries(value)
    .filter(([, nested]) => !missingValue(nested))
    .map(([key, nested]) => `${labels[key] ?? fallbackLabel(key)}: ${formatNestedValue(nested)}`)
    .join(" · ");
}

function formatNestedValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (Array.isArray(value)) return value.map(formatNestedValue).join(", ");
  if (typeof value === "object" && value !== null) return formatObject(value as Record<string, unknown>);
  return String(value);
}

export function formatSpecificationValue(productType: string, code: string, value: unknown): string {
  if (missingValue(value)) return "—";
  const definition = definitions.get(`${productType}.${code}`);
  let formatted: string;
  if (typeof value === "boolean") {
    formatted = value ? "Có" : "Không";
  } else if (Array.isArray(value)) {
    formatted = value.map((item) => {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const itemRecord = item as Record<string, unknown>;
        if (typeof itemRecord.type === "string" && itemRecord.count !== undefined) {
          const version = itemRecord.version ? ` (${String(itemRecord.version)})` : "";
          return `${itemRecord.type} × ${String(itemRecord.count)}${version}`;
        }
        return formatObject(itemRecord);
      }
      return formatNestedValue(item);
    }).join(", ");
  } else if (typeof value === "object" && value !== null) {
    formatted = formatObject(value as Record<string, unknown>);
  } else {
    formatted = String(value);
    if (typeof value === "number" && definition?.unit) formatted = `${formatted} ${definition.unit}`;
  }
  return formatted;
}

function specificationGroup(productType: string, code: string, accessorySubtype = ""): string {
  const subtype = accessorySubtype.toUpperCase();
  if (productType === "CPU") {
    if (/^(socket|architecture|core_count|thread_count)$/.test(code)) return "Thông tin chung";
    if (/(clock|cache|memory)/.test(code)) return "Xung nhịp và bộ nhớ";
    if (/(tdp|power|temp)/.test(code)) return "Điện năng và nhiệt độ";
    return "Đồ họa và kết nối";
  }
  if (productType === "GPU") {
    if (/^(gpu_chip|architecture|processor_unit_label|processor_unit_count)$/.test(code)) return "Chip đồ họa";
    if (/(vram|memory_)/.test(code)) return "Bộ nhớ đồ họa";
    if (/(clock)/.test(code)) return "Xung nhịp";
    if (/(display|hdcp|opengl|directx|vulkan|technologies|operating_systems)/.test(code)) return "Kết nối và công nghệ";
    return "Nguồn và thiết kế card";
  }
  if (productType === "MOTHERBOARD") {
    if (/^(socket|chipset|form_factor)$/.test(code)) return "Nền tảng";
    if (/memory/.test(code)) return "Bộ nhớ";
    if (/(pcie|m2_|sata_)/.test(code)) return "Khe mở rộng và lưu trữ";
    if (/(ethernet|wireless|bluetooth|usb|audio|lan|wifi)/.test(code)) return "Kết nối";
    return "Cổng và thiết kế";
  }
  if (productType === "RAM") {
    if (/(capacity|memory_type|speed|module|kit|timing|latency|cas)/.test(code)) return "Thông số bộ nhớ";
    return "Điện áp và tính năng";
  }
  if (productType === "STORAGE") {
    if (/(capacity|drive_type|form_factor|interface|protocol|nand)/.test(code)) return "Thông tin ổ lưu trữ";
    if (/(read|write|iops|speed|rpm|cache)/.test(code)) return "Hiệu năng";
    return "Độ bền và tính năng";
  }
  if (productType === "PSU") {
    if (/(watt|efficiency|atx|voltage|rail)/.test(code)) return "Công suất và hiệu suất";
    if (/(modular|connector|cable)/.test(code)) return "Kết nối nguồn";
    return "Kích thước và bảo vệ";
  }
  if (productType === "CASE") {
    if (/(form_factor|dimensions|weight|clearance|length|height)/.test(code)) return "Kích thước và tương thích";
    if (/(fan|radiator|cooling)/.test(code)) return "Làm mát";
    return "Khoang và kết nối";
  }
  if (productType === "COOLER") {
    if (/(cooler_type|socket|height|radiator|dimensions)/.test(code)) return "Loại tản nhiệt và tương thích";
    if (/(fan|pump|airflow|pressure|noise)/.test(code)) return "Quạt, bơm và độ ồn";
    return "Kích thước và kết nối";
  }
  if (productType === "ACCESSORY") {
    if (subtype === "MOUSE") return "Cảm biến và điều khiển";
    if (subtype === "KEYBOARD") return "Bố cục và phím";
    if (subtype === "MONITOR") return "Màn hình";
    if (subtype === "HEADSET") return "Âm thanh và kết nối";
    return "Thông tin phụ kiện";
  }
  if (productType === "PC") return "Cấu hình và thông tin máy";
  return "Thông số khác";
}

function accessorySubtype(specifications: Record<string, unknown>): string {
  return typeof specifications.accessory_type === "string" ? specifications.accessory_type : "";
}

export function groupSpecifications(
  productType: string,
  specifications: Record<string, unknown>,
): SpecificationGroup[] {
  const groups = new Map<string, SpecificationEntry[]>();
  const subtype = accessorySubtype(specifications);
  for (const [code, value] of Object.entries(specifications)) {
    if (missingValue(value)) continue;
    const title = specificationGroup(productType, code, subtype);
    const entries = groups.get(title) ?? [];
    entries.push({
      code,
      label: getSpecificationLabel(productType, code),
      value: formatSpecificationValue(productType, code, value),
    });
    groups.set(title, entries);
  }
  return [...groups.entries()].map(([title, entries]) => ({ title, entries }));
}

const highlights: Record<string, string[]> = {
  CPU: ["core_count", "thread_count", "max_boost_clock_ghz", "socket"],
  GPU: ["gpu_chip", "vram_gb", "memory_type", "boost_clock_mhz"],
  MOTHERBOARD: ["chipset", "socket", "memory_type", "form_factor"],
  RAM: ["capacity_gb", "memory_type", "speed_mhz", "cas_latency_cycles"],
  STORAGE: ["drive_type", "capacity_gb", "interface", "sequential_read_mb_s"],
  PSU: ["wattage", "efficiency_rating", "modularity", "atx_version"],
  CASE: ["case_form_factor", "max_gpu_length_mm", "max_cooler_height_mm"],
  COOLER: ["cooler_type", "cooler_height_mm", "supported_sockets"],
  ACCESSORY: ["accessory_type", "monitor_resolution", "monitor_refresh_rate_hz", "mouse_max_dpi", "keyboard_switch_type", "headset_driver_size_mm"],
  PC: ["configuration_summary", "bom_status"],
};

export function getProductHighlights(
  productType: string,
  specifications: Record<string, unknown>,
): SpecificationEntry[] {
  return (highlights[productType] ?? [])
    .filter((code) => !missingValue(specifications[code]))
    .slice(0, 4)
    .map((code) => ({
      code,
      label: getSpecificationLabel(productType, code),
      value: formatSpecificationValue(productType, code, specifications[code]),
    }));
}

export function groupComparisonSpecifications(
  products: Array<{ productType: string; specifications: Record<string, unknown> }>,
): ComparisonSpecificationGroup[] {
  const groups = new Map<string, string[]>();
  const assignedGroups = new Map<string, string>();
  for (const product of products) {
    const subtype = accessorySubtype(product.specifications);
    for (const code of Object.keys(product.specifications)) {
      let title = assignedGroups.get(code);
      if (!title) {
        title = specificationGroup(product.productType, code, subtype);
        assignedGroups.set(code, title);
      }
      const codes = groups.get(title) ?? [];
      if (!codes.includes(code)) codes.push(code);
      groups.set(title, codes);
    }
  }
  return [...groups.entries()].map(([title, codes]) => ({ title, codes }));
}

export function comparisonValuesDiffer(
  products: Array<{ specifications: Record<string, unknown> }>,
  code: string,
): boolean {
  const values = products.map((product) => product.specifications[code]);
  const normalized = values.map((value) => JSON.stringify(value));
  return new Set(normalized).size > 1;
}
