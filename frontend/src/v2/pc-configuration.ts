export interface PCConfigurationComponent {
  componentType: string;
  modelCode: string;
  productName?: string;
  quantity?: number;
  componentWarrantyMonths?: number;
  keySpecifications?: Record<string, unknown>;
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
    const quantity = record.quantity;
    const componentWarrantyMonths = record.component_warranty_months;
    const keySpecifications = record.key_specifications;
    if (typeof componentType !== "string"
        || !componentTypeLabels[componentType.toUpperCase()]
        || typeof modelCode !== "string"
        || !modelCode.trim()
        || (productName !== undefined && typeof productName !== "string")
        || (quantity !== undefined && (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity <= 0))
        || (componentWarrantyMonths !== undefined && (typeof componentWarrantyMonths !== "number"
          || !Number.isSafeInteger(componentWarrantyMonths) || componentWarrantyMonths <= 0))
        || (keySpecifications !== undefined && (typeof keySpecifications !== "object"
          || keySpecifications === null || Array.isArray(keySpecifications)))) {
      return undefined;
    }
    components.push({
      componentType: componentType.toUpperCase(),
      modelCode: modelCode.trim(),
      ...(typeof productName === "string" && productName.trim()
        ? { productName: productName.trim() }
        : {}),
      ...(typeof quantity === "number" ? { quantity } : {}),
      ...(typeof componentWarrantyMonths === "number" ? { componentWarrantyMonths } : {}),
      ...(typeof keySpecifications === "object" && keySpecifications !== null && !Array.isArray(keySpecifications)
        ? { keySpecifications: keySpecifications as Record<string, unknown> }
        : {}),
    });
  }
  return components;
}

export function pcReferenceDescription(
  specifications: Record<string, unknown>,
  bomComponents?: readonly { productType: string; modelCode: string; productName: string }[],
): string | null {
  const components = parsePCConfiguration(specifications.component_details)
    ?? parsePCConfiguration(specifications.configuration_items);
  if (bomComponents?.length) {
    let selectedBom = bomComponents;
    let matchedSpecificationBom = false;
    if (components?.length) {
      const expectedModelCodes = new Set(components.map((component) => component.modelCode));
      const matchingBom = bomComponents.filter((component) => expectedModelCodes.has(component.modelCode));
      if (matchingBom.length === expectedModelCodes.size) {
        selectedBom = matchingBom;
        matchedSpecificationBom = true;
      }
    }
    const componentGroups = new Map<string, typeof selectedBom>();
    for (const component of selectedBom) {
      const type = component.productType.toUpperCase();
      componentGroups.set(type, [...(componentGroups.get(type) ?? []), component]);
    }
    const names = ["CPU", "GPU", "RAM", "STORAGE"].flatMap((type) => {
      const componentsForType = componentGroups.get(type) ?? [];
      if (matchedSpecificationBom) {
        return componentsForType.map((component) => component.productName || component.modelCode);
      }
      return componentsForType.length === 1
        ? [componentsForType[0].productName || componentsForType[0].modelCode]
        : [];
    });
    return names.length ? `Cấu hình gồm ${names.join(", ")}.` : null;
  }
  if (components) {
    const names = ["CPU", "GPU", "RAM", "STORAGE"].flatMap((type) =>
      components.filter((component) => component.componentType === type)
        .map((component) => component.productName ?? component.modelCode));
    return names.length ? `Cấu hình gồm ${names.join(", ")}.` : null;
  }
  return null;
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
  const quantity = component.quantity && component.quantity > 1 ? ` × ${component.quantity}` : "";
  return `${pcComponentTypeLabel(component.componentType)} · ${component.productName ?? component.modelCode}${quantity}`;
}

export function pcConfigurationStatusLabel(status: unknown): string | undefined {
  if (typeof status !== "string" || !status.trim()) return undefined;
  const labels: Record<string, string> = {
    COMPLETE: "Đã ghi nhận đầy đủ",
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
