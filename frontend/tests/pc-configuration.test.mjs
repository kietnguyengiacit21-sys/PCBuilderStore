import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSystemDimensions,
  parsePCConfiguration,
  pcComponentSummary,
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

test("formats the recorded dimension tuple in its original order", () => {
  assert.equal(formatSystemDimensions([450, 230, 470]), "450 × 230 × 470 mm");
  assert.equal(formatSystemDimensions("[450,230,470]"), "450 × 230 × 470 mm");
});

test("translates BOM status independently from attribute verification", () => {
  assert.equal(pcConfigurationStatusLabel("CONFIGURED"), "Đã ghi nhận cấu hình");
  assert.equal(pcConfigurationStatusLabel(undefined), undefined);
});
