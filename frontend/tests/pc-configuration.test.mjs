import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSystemDimensions,
  parsePCConfiguration,
  pcComponentSummary,
  pcReferenceDescription,
  pcConfigurationStatusLabel,
} from "../src/v2/pc-configuration.ts";

const components = [
  { component_type: "CPU", model_code: "CPU-1", product_name: "Processor" },
  { component_type: "RAM", model_code: "RAM-1", product_name: "Memory kit 1" },
  { component_type: "RAM", model_code: "RAM-1", product_name: "Memory kit 2" },
];

test("parses structured and serialized BOM data without losing order or repeated items", () => {
  for (const input of [components, JSON.stringify(components)]) {
    const result = parsePCConfiguration(input);
    assert.deepEqual(result?.map(pcComponentSummary), [
      "CPU · Processor",
      "RAM · Memory kit 1",
      "RAM · Memory kit 2",
    ]);
  }
});

test("preserves V12 component details for the demo reference BOM", () => {
  const result = parsePCConfiguration([{
    component_type: "RAM",
    model_code: "RAM-2X16",
    product_name: "Memory kit",
    quantity: 2,
    component_warranty_months: 36,
    key_specifications: { capacity_GB: 32, memory_type: "DDR5" },
  }]);

  assert.deepEqual(result, [{
    componentType: "RAM",
    modelCode: "RAM-2X16",
    productName: "Memory kit",
    quantity: 2,
    componentWarrantyMonths: 36,
    keySpecifications: { capacity_GB: 32, memory_type: "DDR5" },
  }]);
  assert.equal(pcComponentSummary(result[0]), "RAM · Memory kit × 2");
});

test("formats the recorded dimension tuple in its original order", () => {
  assert.equal(formatSystemDimensions([450, 230, 470]), "450 × 230 × 470 mm");
  assert.equal(formatSystemDimensions("[450,230,470]"), "450 × 230 × 470 mm");
});

test("translates BOM status independently from attribute verification", () => {
  assert.equal(pcConfigurationStatusLabel("CONFIGURED"), "Đã ghi nhận cấu hình");
  assert.equal(pcConfigurationStatusLabel(undefined), undefined);
});

test("builds the GAME-002 customer description only from its persisted BOM", () => {
  assert.equal(pcReferenceDescription({
    component_details: [
      { component_type: "CPU", model_code: "CPU-1", product_name: "Intel CPU" },
      { component_type: "GPU", model_code: "GPU-1", product_name: "Graphics card" },
      { component_type: "RAM", model_code: "RAM-1", product_name: "Memory" },
      { component_type: "STORAGE", model_code: "SSD-1", product_name: "SSD" },
    ],
  }), "Cấu hình gồm Intel CPU, Graphics card, Memory, SSD.");
});

test("prefers the saved BOM relationship when building a prebuilt PC description", () => {
  assert.equal(pcReferenceDescription({
    component_details: [
      { component_type: "CPU", model_code: "OLD-CPU", product_name: "Old processor" },
    ],
  }, [
    { productType: "CPU", modelCode: "CPU-1", productName: "Intel CPU" },
    { productType: "GPU", modelCode: "GPU-1", productName: "Graphics card" },
  ]), "Cấu hình gồm Intel CPU, Graphics card.");
});
