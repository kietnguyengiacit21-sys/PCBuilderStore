import { Prisma } from "@prisma/client";
import type { CatalogSeedRow } from "./seed-csv.js";
import { catalogAttributeType } from "./seed-csv.js";

type AttributeMetadata = {
  name: string;
  unit: string | null;
  isFilterable: boolean;
  isBuildCritical: boolean;
};

const attributeMetadata: Record<string, AttributeMetadata> = {
  "ACCESSORY:accessory_type": { name: "Accessory Type", unit: null, isFilterable: false, isBuildCritical: false },
  "CASE:max_cooler_height_mm": { name: "Max Cooler Height Mm", unit: "mm", isFilterable: false, isBuildCritical: true },
  "CASE:max_gpu_length_mm": { name: "Max Gpu Length Mm", unit: "mm", isFilterable: false, isBuildCritical: true },
  "CASE:motherboard_form_factors": { name: "Motherboard Form Factors", unit: null, isFilterable: false, isBuildCritical: true },
  "COOLER:cooler_height_mm": { name: "Cooler Height Mm", unit: "mm", isFilterable: false, isBuildCritical: true },
  "COOLER:supported_sockets": { name: "Supported Sockets", unit: null, isFilterable: false, isBuildCritical: true },
  "CPU:core_count": { name: "Core Count", unit: "cores", isFilterable: true, isBuildCritical: false },
  "CPU:socket": { name: "Socket", unit: null, isFilterable: true, isBuildCritical: true },
  "CPU:tdp_watt": { name: "Tdp Watt", unit: "W", isFilterable: false, isBuildCritical: false },
  "CPU:thread_count": { name: "Thread Count", unit: "threads", isFilterable: true, isBuildCritical: false },
  "GPU:vram_gb": { name: "Vram Gb", unit: "GB", isFilterable: true, isBuildCritical: false },
  "MOTHERBOARD:form_factor": { name: "Form Factor", unit: null, isFilterable: true, isBuildCritical: true },
  "MOTHERBOARD:memory_type": { name: "Memory Type", unit: null, isFilterable: true, isBuildCritical: true },
  "MOTHERBOARD:socket": { name: "Socket", unit: null, isFilterable: true, isBuildCritical: true },
  "PC:bom_status": { name: "Bom Status", unit: null, isFilterable: false, isBuildCritical: false },
  "PC:configuration_summary": { name: "Configuration Summary", unit: null, isFilterable: false, isBuildCritical: false },
  "PSU:efficiency_rating": { name: "Efficiency Rating", unit: null, isFilterable: true, isBuildCritical: false },
  "PSU:modularity": { name: "Modularity", unit: null, isFilterable: true, isBuildCritical: false },
  "PSU:wattage": { name: "Wattage", unit: "W", isFilterable: true, isBuildCritical: true },
  "RAM:capacity_gb": { name: "Capacity Gb", unit: "GB", isFilterable: true, isBuildCritical: false },
  "RAM:memory_type": { name: "Memory Type", unit: null, isFilterable: true, isBuildCritical: true },
  "RAM:speed_mhz": { name: "Speed Mhz", unit: "MHz", isFilterable: true, isBuildCritical: false },
  "STORAGE:capacity_gb": { name: "Capacity Gb", unit: "GB", isFilterable: true, isBuildCritical: false },
  "STORAGE:form_factor": { name: "Form Factor", unit: null, isFilterable: true, isBuildCritical: true },
  "STORAGE:interface": { name: "Interface", unit: null, isFilterable: true, isBuildCritical: true },
};
const productTypeNames: Record<string, string> = {
  ACCESSORY: "Accessory",
  CASE: "PC Case",
  COOLER: "CPU Cooler",
  CPU: "Processor",
  GPU: "Graphics Card",
  MOTHERBOARD: "Motherboard",
  PC: "Complete PC",
  PSU: "Power Supply",
  RAM: "Memory",
  STORAGE: "Storage",
};
const categoryNames: Record<string, string> = {
  ACCESSORY: "Phụ kiện",
  CASE: "Vỏ case",
  COOLER: "Tản nhiệt CPU",
  CPU: "CPU",
  GPU: "Card đồ họa",
  MAINBOARD: "Bo mạch chủ",
  PREBUILT_PC: "PC lắp sẵn",
  PSU: "Nguồn máy tính",
  RAM: "RAM",
  STORAGE: "Ổ cứng / SSD",
};

type RawExecutor = {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
  $executeRaw(query: Prisma.Sql): Promise<number>;
};

export interface CatalogSeedSummary {
  rowCount: number;
  productModelsInserted: number;
  productModelsAlreadySeeded: number;
  offersInserted: number;
  attributesInserted: number;
  imagesSkipped: number;
}

function typedValues(value: CatalogSeedRow["specifications"][string]) {
  const type = catalogAttributeType(value);
  return {
    type,
    text: type === "TEXT" ? value : null,
    decimal: type === "DECIMAL" ? value : null,
    integer: type === "INTEGER" ? value : null,
    boolean: type === "BOOLEAN" ? value : null,
    json: type === "JSON" ? JSON.stringify(value) : null,
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function ensureLookupRows(
  executor: RawExecutor,
  rows: CatalogSeedRow[],
): Promise<Map<string, string>> {
  const types = new Map(rows.map((row) => [row.productTypeCode, row.productTypeCode]));
  for (const typeCode of types.keys()) {
    const typeName = productTypeNames[typeCode];
    if (!typeName) {
      throw new Error(`Unknown catalog product type ${typeCode}.`);
    }
    await executor.$executeRaw(Prisma.sql`
      INSERT INTO "product_types" ("type_code", "type_name", "description", "is_build_component", "is_active")
      VALUES (
        ${typeCode},
        ${typeName},
        'Demo catalog product type',
        ${typeCode !== "PC" && typeCode !== "ACCESSORY"},
        TRUE
      )
      ON CONFLICT ("type_code") DO NOTHING
    `);
  }

  const categories = new Map(rows.map((row) => [row.categoryCode, row.categoryCode]));
  for (const categoryCode of categories.keys()) {
    const categoryName = categoryNames[categoryCode];
    if (!categoryName) {
      throw new Error(`Unknown catalog category ${categoryCode}.`);
    }
    await executor.$executeRaw(Prisma.sql`
      INSERT INTO "categories" ("category_code", "category_name", "description", "is_active")
      VALUES (${categoryCode}, ${categoryName}, 'Danh mục demo catalog PC Builder Store', TRUE)
      ON CONFLICT ("category_code") DO NOTHING
    `);
  }

  const brands = new Map(rows.map((row) => [row.brandName, row.brandName]));
  for (const brandName of brands.keys()) {
    await executor.$executeRaw(Prisma.sql`
      INSERT INTO "brands" ("brand_name", "is_active")
      VALUES (${brandName}, TRUE)
      ON CONFLICT ("brand_name") DO NOTHING
    `);
  }

  const actualTypes = await executor.$queryRaw<Array<{
    type_code: string;
    type_name: string;
    is_build_component: boolean;
    is_active: boolean;
  }>>(Prisma.sql`
    SELECT "type_code", "type_name", "is_build_component", "is_active"
    FROM "product_types"
    WHERE "type_code" IN (${Prisma.join([...types.keys()])})
  `);
  for (const typeCode of types.keys()) {
    const actual = actualTypes.find((row) => row.type_code === typeCode);
    if (
      !actual ||
      actual.type_name !== productTypeNames[typeCode] ||
      !actual.is_active ||
      actual.is_build_component !== (typeCode !== "PC" && typeCode !== "ACCESSORY")
    ) {
      throw new Error(`Existing catalog product type ${typeCode} differs from the reviewed catalog definition.`);
    }
  }

  const actualCategories = await executor.$queryRaw<Array<{
    category_code: string;
    category_name: string;
    is_active: boolean;
  }>>(Prisma.sql`
    SELECT "category_code", "category_name", "is_active"
    FROM "categories"
    WHERE "category_code" IN (${Prisma.join([...categories.keys()])})
  `);
  for (const categoryCode of categories.keys()) {
    const actual = actualCategories.find((row) => row.category_code === categoryCode);
    if (!actual || actual.category_name !== categoryNames[categoryCode] || !actual.is_active) {
      throw new Error(`Existing catalog category ${categoryCode} differs from the reviewed catalog definition.`);
    }
  }

  const actualBrands = await executor.$queryRaw<Array<{ brand_name: string; is_active: boolean }>>(Prisma.sql`
    SELECT "brand_name", "is_active"
    FROM "brands"
    WHERE "brand_name" IN (${Prisma.join([...brands.keys()])})
  `);
  for (const brandName of brands.keys()) {
    const actual = actualBrands.find((row) => row.brand_name === brandName);
    if (!actual || actual.brand_name !== brandName || !actual.is_active) {
      throw new Error(`Existing catalog brand ${brandName} is inactive or differs from the reviewed catalog name.`);
    }
  }

  const definitions = new Map<string, { typeCode: string; code: string; valueType: string }>();
  for (const row of rows) {
    for (const [attributeCode, value] of Object.entries(row.specifications)) {
      const key = `${row.productTypeCode}:${attributeCode}`;
      const valueType = catalogAttributeType(value);
      const existing = definitions.get(key);
      if (existing && existing.valueType !== valueType) {
        throw new Error(`Catalog attribute ${key} has inconsistent value types.`);
      }
      definitions.set(key, { typeCode: row.productTypeCode, code: attributeCode, valueType });
    }
  }

  const definitionIds = new Map<string, string>();
  for (const [key, definition] of definitions) {
    const metadata = attributeMetadata[key];
    if (!metadata) {
      throw new Error(`Catalog attribute ${key} is missing reviewed schema metadata.`);
    }
    if (metadata.name.length > 160 || (metadata.unit?.length ?? 0) > 40) {
      throw new Error(`Catalog attribute ${key} metadata exceeds database column limits.`);
    }
    if (definition.valueType !== catalogAttributeTypeForDefinition(key)) {
      throw new Error(`Catalog attribute ${key} does not match the reviewed SQL seed data type.`);
    }

    await executor.$executeRaw(Prisma.sql`
      INSERT INTO "product_attribute_definitions"
        ("product_type_id", "attribute_code", "attribute_name", "data_type", "unit", "is_filterable", "is_build_critical")
      SELECT pt."product_type_id", ${definition.code}, ${metadata.name}, ${definition.valueType},
        ${metadata.unit}, ${metadata.isFilterable}, ${metadata.isBuildCritical}
      FROM "product_types" pt
      WHERE pt."type_code" = ${definition.typeCode}
      ON CONFLICT ("product_type_id", "attribute_code") DO NOTHING
    `);

    const actual = await executor.$queryRaw<Array<{
      attribute_definition_id: string;
      data_type: string;
      attribute_name: string;
      unit: string | null;
      is_filterable: boolean;
      is_build_critical: boolean;
    }>>(Prisma.sql`
      SELECT ad."attribute_definition_id"::text AS "attribute_definition_id",
        ad."data_type", ad."attribute_name", ad."unit", ad."is_filterable", ad."is_build_critical"
      FROM "product_attribute_definitions" ad
      JOIN "product_types" pt ON pt."product_type_id" = ad."product_type_id"
      WHERE pt."type_code" = ${definition.typeCode}
        AND ad."attribute_code" = ${definition.code}
    `);
    const existingDefinition = actual[0];
    if (
      actual.length !== 1 ||
      !existingDefinition ||
      existingDefinition.data_type !== definition.valueType ||
      existingDefinition.attribute_name !== metadata.name ||
      existingDefinition.unit !== metadata.unit ||
      existingDefinition.is_filterable !== metadata.isFilterable ||
      existingDefinition.is_build_critical !== metadata.isBuildCritical
    ) {
      throw new Error(`Existing catalog attribute ${key} differs from the reviewed catalog definition.`);
    }
    definitionIds.set(key, existingDefinition.attribute_definition_id);
  }

  return definitionIds;
}

function catalogAttributeTypeForDefinition(key: string): string {
  const expectedTypes: Record<string, string> = {
    "ACCESSORY:accessory_type": "TEXT",
    "CASE:max_cooler_height_mm": "INTEGER",
    "CASE:max_gpu_length_mm": "INTEGER",
    "CASE:motherboard_form_factors": "JSON",
    "COOLER:cooler_height_mm": "INTEGER",
    "COOLER:supported_sockets": "JSON",
    "CPU:core_count": "INTEGER",
    "CPU:socket": "TEXT",
    "CPU:tdp_watt": "INTEGER",
    "CPU:thread_count": "INTEGER",
    "GPU:vram_gb": "INTEGER",
    "MOTHERBOARD:form_factor": "TEXT",
    "MOTHERBOARD:memory_type": "TEXT",
    "MOTHERBOARD:socket": "TEXT",
    "PC:bom_status": "TEXT",
    "PC:configuration_summary": "JSON",
    "PSU:efficiency_rating": "TEXT",
    "PSU:modularity": "TEXT",
    "PSU:wattage": "INTEGER",
    "RAM:capacity_gb": "INTEGER",
    "RAM:memory_type": "TEXT",
    "RAM:speed_mhz": "INTEGER",
    "STORAGE:capacity_gb": "INTEGER",
    "STORAGE:form_factor": "TEXT",
    "STORAGE:interface": "TEXT",
  };
  return expectedTypes[key] ?? "UNKNOWN";
}

async function insertProduct(
  executor: RawExecutor,
  row: CatalogSeedRow,
): Promise<{ productId: string; inserted: boolean }> {
  const description = `DEMO CATALOG SEED v1\n${row.dataNotes}`;
  const inserted = await executor.$queryRaw<Array<{ product_id: string }>>(Prisma.sql`
    INSERT INTO "products"
      ("product_type_id", "category_id", "brand_id", "model_code", "product_name", "short_description", "description", "product_status")
    SELECT pt."product_type_id", c."category_id", b."brand_id", ${row.modelCode},
      ${row.productName}, ${row.shortDescription}, ${description}, 'ACTIVE'
    FROM "product_types" pt
    JOIN "categories" c ON c."category_code" = ${row.categoryCode}
    JOIN "brands" b ON b."brand_name" = ${row.brandName}
    WHERE pt."type_code" = ${row.productTypeCode}
    ON CONFLICT ("model_code") DO NOTHING
    RETURNING "product_id"::text AS "product_id"
  `);
  if (inserted[0]) {
    return { productId: inserted[0].product_id, inserted: true };
  }

  const expectedOfferCode = `DEMO-${row.modelCode}`;
  const existing = await executor.$queryRaw<Array<{ product_id: string; offer_id: string | null }>>(Prisma.sql`
    SELECT p."product_id"::text AS "product_id", po."offer_id"::text AS "offer_id"
    FROM "products" p
    JOIN "product_types" pt ON pt."type_code" = ${row.productTypeCode}
    JOIN "categories" c ON c."category_code" = ${row.categoryCode}
    JOIN "brands" b ON b."brand_name" = ${row.brandName}
    LEFT JOIN "product_offers" po
      ON po."product_id" = p."product_id" AND po."offer_code" = ${expectedOfferCode}
    WHERE p."model_code" = ${row.modelCode}
      AND p."product_type_id" = pt."product_type_id"
      AND p."category_id" = c."category_id"
      AND p."brand_id" = b."brand_id"
      AND p."product_name" = ${row.productName}
      AND p."short_description" = ${row.shortDescription}
      AND p."description" = ${description}
      AND p."product_status" = 'ACTIVE'
  `);
  if (existing.length !== 1 || !existing[0]?.offer_id) {
    throw new Error(`Model code ${row.modelCode} already exists and is not an unchanged record owned by this demo seed.`);
  }
  return { productId: existing[0].product_id, inserted: false };
}

async function insertOffer(
  executor: RawExecutor,
  row: CatalogSeedRow,
  productId: string,
): Promise<boolean> {
  const offerCode = `DEMO-${row.modelCode}`;
  const inserted = await executor.$queryRaw<Array<{ offer_id: string }>>(Prisma.sql`
    INSERT INTO "product_offers"
      ("product_id", "offer_code", "condition_code", "price", "currency_code", "stock_quantity",
       "reserved_quantity", "warranty_months", "offer_status")
    VALUES (
      ${productId}::numeric, ${offerCode}, ${row.conditionCode}, ${row.demoPrice},
      ${row.currencyCode}, ${row.demoStockQuantity}, 0, ${row.demoWarrantyMonths}, 'ACTIVE'
    )
    ON CONFLICT ("offer_code") DO NOTHING
    RETURNING "offer_id"::text AS "offer_id"
  `);
  if (inserted[0]) {
    return true;
  }

  const existing = await executor.$queryRaw<Array<{ matches: boolean }>>(Prisma.sql`
    SELECT (
      po."product_id" = ${productId}::numeric
      AND po."condition_code" = ${row.conditionCode}
      AND po."price" = ${row.demoPrice}::numeric
      AND po."currency_code" = ${row.currencyCode}
      AND po."stock_quantity" = ${row.demoStockQuantity}
      AND po."reserved_quantity" = 0
      AND po."warranty_months" = ${row.demoWarrantyMonths}
      AND po."offer_status" = 'ACTIVE'
    ) AS "matches"
    FROM "product_offers" po
    WHERE po."offer_code" = ${offerCode}
  `);
  if (existing.length !== 1 || existing[0]?.matches !== true) {
    throw new Error(`Offer code ${offerCode} already exists with different data; existing values were not changed.`);
  }
  return false;
}

async function insertAttributes(
  executor: RawExecutor,
  row: CatalogSeedRow,
  productId: string,
  definitionIds: ReadonlyMap<string, string>,
): Promise<number> {
  let insertedCount = 0;
  for (const [attributeCode, value] of Object.entries(row.specifications)) {
    const attributeType = typedValues(value);
    const attributeDefinitionId = definitionIds.get(`${row.productTypeCode}:${attributeCode}`);
    if (!attributeDefinitionId) {
      throw new Error(`Missing attribute definition ${row.productTypeCode}:${attributeCode}.`);
    }

    const inserted = await executor.$queryRaw<Array<{ product_id: string }>>(Prisma.sql`
      INSERT INTO "product_attribute_values"
        ("product_id", "attribute_definition_id", "value_text", "value_decimal", "value_integer", "value_boolean", "value_json")
      VALUES (
        ${productId}::numeric, ${attributeDefinitionId}::numeric, ${attributeType.text},
        ${attributeType.decimal}, ${attributeType.integer}, ${attributeType.boolean},
        CASE WHEN ${attributeType.json}::text IS NULL THEN NULL ELSE ${attributeType.json}::jsonb END
      )
      ON CONFLICT ("product_id", "attribute_definition_id") DO NOTHING
      RETURNING "product_id"::text AS "product_id"
    `);
    if (inserted[0]) {
      insertedCount += 1;
      continue;
    }

    const existing = await executor.$queryRaw<Array<{
      value_text: string | null;
      value_decimal: string | null;
      value_integer: string | null;
      value_boolean: boolean | null;
      value_json: unknown;
    }>>(Prisma.sql`
      SELECT "value_text", "value_decimal"::text AS "value_decimal",
        "value_integer"::text AS "value_integer", "value_boolean", "value_json"
      FROM "product_attribute_values"
      WHERE "product_id" = ${productId}::numeric
        AND "attribute_definition_id" = ${attributeDefinitionId}::numeric
    `);
    const stored = existing[0];
    const expected = {
      value_text: attributeType.text,
      value_decimal: attributeType.decimal === null ? null : String(attributeType.decimal),
      value_integer: attributeType.integer === null ? null : String(attributeType.integer),
      value_boolean: attributeType.boolean,
      value_json: attributeType.json === null ? null : JSON.parse(attributeType.json) as unknown,
    };
    if (!stored || stableJson(stored) !== stableJson(expected)) {
      throw new Error(`Attribute ${row.modelCode}:${attributeCode} already exists with different data; existing values were not changed.`);
    }
  }
  return insertedCount;
}

export async function seedCatalog(
  executor: RawExecutor,
  rows: CatalogSeedRow[],
): Promise<CatalogSeedSummary> {
  if (rows.length === 0) {
    throw new Error("Refusing to run an empty catalog seed.");
  }
  const definitionIds = await ensureLookupRows(executor, rows);

  let productModelsInserted = 0;
  let productModelsAlreadySeeded = 0;
  let offersInserted = 0;
  let attributesInserted = 0;
  for (const row of rows) {
    const product = await insertProduct(executor, row);
    if (product.inserted) {
      productModelsInserted += 1;
    } else {
      productModelsAlreadySeeded += 1;
    }
    if (await insertOffer(executor, row, product.productId)) {
      offersInserted += 1;
    }
    attributesInserted += await insertAttributes(executor, row, product.productId, definitionIds);
  }

  return {
    rowCount: rows.length,
    productModelsInserted,
    productModelsAlreadySeeded,
    offersInserted,
    attributesInserted,
    imagesSkipped: rows.length,
  };
}
