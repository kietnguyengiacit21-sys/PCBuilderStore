export interface PCConfigurationComponent {
  componentType: string;
  modelCode: string;
  productName?: string;
}

const componentTypeLabels: Record<string, string> = {
  CPU: "CPU",
  GPU: "GPU",
  MOTHERBOARD: "Bo mạch chủ",
  RAM: "RAM",
  STORAGE: "Lưu trữ",
  PSU: "Nguồn",
  CASE: "Vỏ case",
  COOLER: "Tản nhiệt",
  ACCESSORY: "Phụ kiện",
  OTHER: "Khác",
};

export function parseJsonAttributeValue(value: unknown): { valid: boolean; value: unknown } {
  if (typeof value !== "string") return { valid: true, value };
  try {
    return { valid: true, value: JSON.parse(value) as unknown };
  } catch {
    return { valid: false, value: undefined };
  }
}

export function parsePCConfiguration(value: unknown): PCConfigurationComponent[] | undefined {
  const parsed = parseJsonAttributeValue(value);
  if (!parsed.valid || !Array.isArray(parsed.value) || parsed.value.length === 0) return undefined;
  const components: PCConfigurationComponent[] = [];
  for (const component of parsed.value) {
    if (typeof component !== "object" || component === null || Array.isArray(component)) return undefined;
    const record = component as Record<string, unknown>;
    const componentType = record.component_type;
    const modelCode = record.model_code;
    const productName = record.product_name;
    if (typeof componentType !== "string"
        || !componentTypeLabels[componentType.toUpperCase()]
        || typeof modelCode !== "string"
        || !modelCode.trim()
        || (productName !== undefined && typeof productName !== "string")) {
      return undefined;
    }
    components.push({
      componentType: componentType.toUpperCase(),
      modelCode: modelCode.trim(),
      ...(typeof productName === "string" && productName.trim()
        ? { productName: productName.trim() }
        : {}),
    });
  }
  return components;
}

export function pcConfigurationSummaryEntries(
  configurationItems: unknown,
  configurationSummary: unknown,
): string[] {
  const components = parsePCConfiguration(configurationItems);
  if (components) return components.map(pcComponentSummary);

  const parsedSummary = parseJsonAttributeValue(configurationSummary);
  if (!parsedSummary.valid) return [];
  if (typeof parsedSummary.value === "string" && parsedSummary.value.trim()) {
    return [parsedSummary.value.trim()];
  }
  if (!Array.isArray(parsedSummary.value)) return [];
  return parsedSummary.value.filter(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  ).map((item) => item.trim());
}

export function pcComponentTypeLabel(componentType: string): string {
  return componentTypeLabels[componentType] ?? componentType;
}

export function pcComponentSummary(component: PCConfigurationComponent): string {
  return `${pcComponentTypeLabel(component.componentType)} · ${component.productName ?? component.modelCode}`;
}

export function pcConfigurationStatusLabel(status: unknown): string | undefined {
  if (typeof status !== "string" || !status.trim()) return undefined;
  const labels: Record<string, string> = {
    CONFIGURED: "Đã ghi nhận cấu hình",
    PARTIAL: "Đã ghi nhận một phần cấu hình",
    PENDING: "Chưa ghi nhận cấu hình",
  };
  return labels[status] ?? status;
}

export function formatSystemDimensions(value: unknown): string | undefined {
  const parsed = parseJsonAttributeValue(value);
  if (!parsed.valid || !Array.isArray(parsed.value) || parsed.value.length === 0
      || parsed.value.some((dimension) =>
        (typeof dimension !== "number" && typeof dimension !== "string")
        || String(dimension).trim() === "")) {
    return undefined;
  }
  return `${parsed.value.map(String).join(" × ")} mm`;
}
