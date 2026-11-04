import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { catalogAttributeType, parseCatalogCsv } from "../src/catalog/seed-csv.js";

const catalogCsvUrl = new URL("../../seed/catalog-150-products.csv", import.meta.url);

describe("catalog CSV seed input", () => {
  it("parses all 150 unique demo product models and their typed specifications", async () => {
    const csv = await readFile(catalogCsvUrl, "utf8");
    const rows = parseCatalogCsv(csv);

    expect(rows).toHaveLength(150);
    expect(new Set(rows.map(({ modelCode }) => modelCode)).size).toBe(150);
    expect(rows.every(({ brandName, productTypeCode, categoryCode }) => brandName && productTypeCode && categoryCode)).toBe(true);
    expect(rows[0]?.specifications).toMatchObject({
      socket: "LGA1700",
      core_count: 4,
      thread_count: 8,
      tdp_watt: 58,
    });
    expect(catalogAttributeType(["Mini-ITX", "ATX"])).toBe("JSON");
  });

  it("rejects duplicated model codes before database writes", () => {
    const header = "model_code,product_name,brand_name,product_type_code,category_code,short_description,condition_code,currency_code,demo_price_vnd,demo_stock_quantity,warranty_months_demo,specifications_json,data_notes";
    const row = "X1,Test,Brand,CPU,CPU,Description,NEW,VND,10,1,12,\"{\"\"socket\"\":\"\"LGA1700\"\"}\",Demo";
    expect(() => parseCatalogCsv(`${header}\n${row}\n${row}\n`)).toThrow(/duplicate model_code/);
  });

  it("rejects malformed or unsafe seed values", () => {
    const header = "model_code,product_name,brand_name,product_type_code,category_code,short_description,condition_code,currency_code,demo_price_vnd,demo_stock_quantity,warranty_months_demo,specifications_json,data_notes";
    const row = "X1,Test,Brand,CPU,CPU,Description,NEW,VND,10;DROP TABLE products,1,12,\"{\"\"socket\"\":\"\"LGA1700\"\"}\",Demo";
    expect(() => parseCatalogCsv(`${header}\n${row}`)).toThrow(/demo_price_vnd/);
  });
});
