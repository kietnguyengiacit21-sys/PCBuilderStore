export interface CatalogSeedRow {
  modelCode: string;
  productName: string;
  brandName: string;
  productTypeCode: string;
  categoryCode: string;
  shortDescription: string;
  conditionCode: string;
  currencyCode: string;
  demoPrice: string;
  demoStockQuantity: number;
  demoWarrantyMonths: number;
  specifications: Record<string, string | number | boolean | unknown[] | Record<string, unknown>>;
  dataNotes: string;
}

const requiredColumns = [
  "model_code",
  "product_name",
  "brand_name",
  "product_type_code",
  "category_code",
  "short_description",
  "condition_code",
  "currency_code",
  "demo_price_vnd",
  "demo_stock_quantity",
  "warranty_months_demo",
  "specifications_json",
  "data_notes",
] as const;

function parseCsvRecords(input: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = input.charCodeAt(0) === 0xfeff ? 1 : 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      record.push(field);
      if (record.some((value) => value.length > 0)) {
        records.push(record);
      }
      record = [];
      field = "";
      if (character === "\r" && input[index + 1] === "\n") {
        index += 1;
      }
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("CSV contains an unterminated quoted field.");
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

function requiredValue(row: Record<string, string>, column: string, line: number): string {
  const value = row[column]?.trim();
  if (!value) {
    throw new Error(`CSV row ${line}: ${column} is required.`);
  }
  return value;
}

function nonNegativeInteger(value: string, column: string, line: number): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`CSV row ${line}: ${column} must be a non-negative integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`CSV row ${line}: ${column} is outside the safe integer range.`);
  }
  return parsed;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCatalogCsv(input: string): CatalogSeedRow[] {
  const records = parseCsvRecords(input);
  const header = records.shift();
  if (!header) {
    throw new Error("Catalog CSV is empty.");
  }

  const duplicateHeaders = header.filter((column, index) => header.indexOf(column) !== index);
  if (duplicateHeaders.length > 0) {
    throw new Error(`Catalog CSV contains duplicate columns: ${[...new Set(duplicateHeaders)].join(", ")}.`);
  }

  const missingColumns = requiredColumns.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Catalog CSV is missing required columns: ${missingColumns.join(", ")}.`);
  }

  const modelCodes = new Set<string>();
  return records.map((values, index) => {
    const line = index + 2;
    if (values.length !== header.length) {
      throw new Error(`CSV row ${line}: expected ${header.length} fields, received ${values.length}.`);
    }
    const row = Object.fromEntries(header.map((column, columnIndex) => [column, values[columnIndex] ?? ""]));
    const modelCode = requiredValue(row, "model_code", line);
    if (modelCodes.has(modelCode)) {
      throw new Error(`CSV row ${line}: duplicate model_code "${modelCode}".`);
    }
    modelCodes.add(modelCode);

    let specifications: unknown;
    try {
      specifications = JSON.parse(requiredValue(row, "specifications_json", line)) as unknown;
    } catch (error) {
      throw new Error(`CSV row ${line}: specifications_json must contain valid JSON.`, { cause: error });
    }
    if (!isJsonRecord(specifications)) {
      throw new Error(`CSV row ${line}: specifications_json must be a JSON object.`);
    }
    for (const [attributeCode, value] of Object.entries(specifications)) {
      if (!/^[a-z][a-z0-9_]{0,99}$/.test(attributeCode) || value === null || value === undefined) {
        throw new Error(`CSV row ${line}: invalid specification attribute "${attributeCode}".`);
      }
    }

    const currencyCode = requiredValue(row, "currency_code", line);
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      throw new Error(`CSV row ${line}: currency_code must be three uppercase letters.`);
    }

    const price = requiredValue(row, "demo_price_vnd", line);
    if (!/^\d+(?:\.\d{1,2})?$/.test(price)) {
      throw new Error(`CSV row ${line}: demo_price_vnd must be a non-negative decimal with at most 2 places.`);
    }

    return {
      modelCode,
      productName: requiredValue(row, "product_name", line),
      brandName: requiredValue(row, "brand_name", line),
      productTypeCode: requiredValue(row, "product_type_code", line),
      categoryCode: requiredValue(row, "category_code", line),
      shortDescription: requiredValue(row, "short_description", line),
      conditionCode: requiredValue(row, "condition_code", line),
      currencyCode,
      demoPrice: price,
      demoStockQuantity: nonNegativeInteger(requiredValue(row, "demo_stock_quantity", line), "demo_stock_quantity", line),
      demoWarrantyMonths: nonNegativeInteger(requiredValue(row, "warranty_months_demo", line), "warranty_months_demo", line),
      specifications: specifications as CatalogSeedRow["specifications"],
      dataNotes: requiredValue(row, "data_notes", line),
    };
  });
}

export function catalogAttributeType(value: unknown): "TEXT" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "JSON" {
  if (typeof value === "string") return "TEXT";
  if (typeof value === "boolean") return "BOOLEAN";
  if (typeof value === "number") return Number.isInteger(value) ? "INTEGER" : "DECIMAL";
  if (Array.isArray(value) || isJsonRecord(value)) return "JSON";
  throw new Error("Catalog specification values must be strings, numbers, booleans, arrays, or objects.");
}
