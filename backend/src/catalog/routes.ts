import { Prisma } from "@prisma/client";
import { Router } from "express";
import { HttpError } from "../middleware/http-error.js";

export interface CatalogDatabase {
  queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
}

interface AttributeFilter {
  code: string;
  value: string;
}

interface CatalogQuery {
  page: number;
  limit: number;
  query?: string;
  type?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort: "name" | "price";
  order: "asc" | "desc";
  attributes: AttributeFilter[];
}

const allowedQueryKeys = new Set([
  "page",
  "limit",
  "q",
  "type",
  "category",
  "brand",
  "minPrice",
  "maxPrice",
  "sort",
  "order",
  "attribute",
]);

function invalidQuery(message: string): never {
  throw new HttpError(400, "INVALID_CATALOG_QUERY", message);
}

function singleValue(params: URLSearchParams, name: string): string | undefined {
  const values = params.getAll(name);
  if (values.length > 1) {
    invalidQuery(`Query parameter "${name}" must be specified once.`);
  }
  return values[0];
}

function parseInteger(
  value: string | undefined,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) invalidQuery(`Query parameter "${name}" must be an integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    invalidQuery(`Query parameter "${name}" must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function parsePrice(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    invalidQuery(`Query parameter "${name}" must be a non-negative amount with at most 2 decimal places.`);
  }
  return value;
}

function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  for (const key of params.keys()) {
    if (!allowedQueryKeys.has(key)) invalidQuery(`Unsupported query parameter "${key}".`);
  }

  const page = parseInteger(singleValue(params, "page"), "page", 1, 1, 100000);
  const limit = parseInteger(singleValue(params, "limit"), "limit", 20, 1, 100);
  const query = singleValue(params, "q")?.trim();
  if (query && query.length > 200) invalidQuery('Query parameter "q" cannot exceed 200 characters.');

  const type = singleValue(params, "type");
  const category = singleValue(params, "category");
  const brand = singleValue(params, "brand");
  for (const [name, value] of [["type", type], ["category", category], ["brand", brand]] as const) {
    if (value !== undefined && !/^[\p{L}\p{N}_ -]{1,120}$/u.test(value)) {
      invalidQuery(`Query parameter "${name}" contains invalid characters.`);
    }
  }

  const minPrice = parsePrice(singleValue(params, "minPrice"), "minPrice");
  const maxPrice = parsePrice(singleValue(params, "maxPrice"), "maxPrice");
  if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
    invalidQuery('"minPrice" cannot exceed "maxPrice".');
  }
  if ([minPrice, maxPrice].some((price) => price !== undefined && Number(price) > 9999999999999.99)) {
    invalidQuery("Price filters exceed the supported database range.");
  }

  const sortValue = singleValue(params, "sort") ?? "name";
  if (sortValue !== "name" && sortValue !== "price") {
    invalidQuery('Query parameter "sort" must be "name" or "price".');
  }
  const orderValue = singleValue(params, "order") ?? "asc";
  if (orderValue !== "asc" && orderValue !== "desc") {
    invalidQuery('Query parameter "order" must be "asc" or "desc".');
  }

  const attributes = params.getAll("attribute").map((filter) => {
    const separator = filter.indexOf("=");
    if (separator <= 0 || separator === filter.length - 1) {
      invalidQuery('Each "attribute" filter must use the form "attribute=code=value".');
    }
    const code = filter.slice(0, separator);
    const value = filter.slice(separator + 1);
    if (!/^[a-z][a-z0-9_]{0,99}$/.test(code) || value.length > 200) {
      invalidQuery("An attribute filter contains an invalid code or value.");
    }
    return { code, value };
  });
  if (new Set(attributes.map(({ code }) => code)).size !== attributes.length) {
    invalidQuery('An "attribute" code may only be specified once.');
  }

  return {
    page,
    limit,
    query: query || undefined,
    type,
    category,
    brand,
    minPrice,
    maxPrice,
    sort: sortValue,
    order: orderValue,
    attributes,
  };
}

function jsonFilterValue(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value) as unknown);
  } catch {
    return JSON.stringify(value);
  }
}

function productWhere(query: CatalogQuery): Prisma.Sql[] {
  const clauses: Prisma.Sql[] = [Prisma.sql`p."product_status" = 'ACTIVE'`];
  if (query.query) {
    const pattern = `%${query.query}%`;
    clauses.push(Prisma.sql`(
      p."product_name" COLLATE "C" ILIKE ${pattern} COLLATE "C"
      OR p."model_code" COLLATE "C" ILIKE ${pattern} COLLATE "C"
    )`);
  }
  if (query.type) clauses.push(Prisma.sql`pt."type_code" = ${query.type}`);
  if (query.category) clauses.push(Prisma.sql`c."category_code" = ${query.category}`);
  if (query.brand) clauses.push(Prisma.sql`b."brand_name" = ${query.brand}`);
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    clauses.push(Prisma.sql`
      EXISTS (SELECT 1
        FROM "product_offers" pf
        WHERE pf."product_id" = p."product_id" AND pf."offer_status" = 'ACTIVE'
          ${query.minPrice === undefined ? Prisma.empty : Prisma.sql`AND pf."price" >= ${query.minPrice}::numeric`}
          ${query.maxPrice === undefined ? Prisma.empty : Prisma.sql`AND pf."price" <= ${query.maxPrice}::numeric`}
      )
    `);
  }
  for (const filter of query.attributes) {
    const expectedValue = jsonFilterValue(filter.value);
    clauses.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "product_attribute_definitions" ad
        JOIN "product_attribute_values" av
          ON av."attribute_definition_id" = ad."attribute_definition_id"
         AND av."product_id" = p."product_id"
        WHERE ad."product_type_id" = p."product_type_id"
          AND ad."attribute_code" = ${filter.code}
          AND ad."is_filterable" = TRUE
          AND COALESCE(
            to_jsonb(av."value_text"),
            to_jsonb(av."value_decimal"),
            to_jsonb(av."value_integer"),
            to_jsonb(av."value_boolean"),
            av."value_json"
          ) = ${expectedValue}::jsonb
      )
    `);
  }
  return clauses;
}

function validImageUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0 &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function filterValidProductImages(products: unknown[]): unknown[] {
  return products.map((product) => {
    if (!isRecord(product)) return product;
    const record = product;
    if (!Array.isArray(record.images)) return product;
    return {
      ...record,
      images: record.images.filter((image) => isRecord(image) && validImageUrl(image.url)),
    };
  });
}

const productSelection = Prisma.sql`
  SELECT
    p."product_id"::text AS "productId",
    p."model_code" AS "modelCode",
    p."product_name" AS "productName",
    p."short_description" AS "shortDescription",
    p."description" AS "description",
    p."product_status" AS "status",
    pt."type_code" AS "productType",
    pt."type_name" AS "productTypeName",
    c."category_code" AS "categoryCode",
    c."category_name" AS "categoryName",
    b."brand_name" AS "brandName",
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'offerCode', po."offer_code",
        'condition', po."condition_code",
        'price', po."price",
        'currency', po."currency_code",
        'stockQuantity', po."stock_quantity",
        'reservedQuantity', po."reserved_quantity",
        'availableQuantity', po."stock_quantity" - po."reserved_quantity",
        'warrantyMonths', po."warranty_months",
        'status', po."offer_status",
        'isDemo', po."offer_code" LIKE 'DEMO-%'
      ) ORDER BY po."price", po."offer_code")
      FROM "product_offers" po
      WHERE po."product_id" = p."product_id" AND po."offer_status" = 'ACTIVE'
    ), '[]'::jsonb) AS "offers",
    COALESCE((
      SELECT jsonb_object_agg(ad."attribute_code", COALESCE(
        to_jsonb(av."value_text"),
        to_jsonb(av."value_decimal"),
        to_jsonb(av."value_integer"),
        to_jsonb(av."value_boolean"),
        av."value_json"
      ))
      FROM "product_attribute_definitions" ad
      JOIN "product_attribute_values" av
        ON av."attribute_definition_id" = ad."attribute_definition_id"
       AND av."product_id" = p."product_id"
      WHERE ad."product_type_id" = p."product_type_id"
    ), '{}'::jsonb) AS "specifications",
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'url', pi."image_url",
        'altText', pi."alt_text",
        'isPrimary', pi."is_primary"
      ) ORDER BY pi."sort_order", pi."image_id")
      FROM "product_images" pi
      WHERE pi."product_id" = p."product_id"
        AND pi."image_url" ~ '^https?://[^[:space:]]+$'
    ), '[]'::jsonb) AS "images",
    EXISTS (
      SELECT 1
      FROM "product_offers" demo_offer
      WHERE demo_offer."product_id" = p."product_id"
        AND demo_offer."offer_code" LIKE 'DEMO-%'
    ) AS "demoData"
  FROM "products" p
  JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
  JOIN "categories" c ON c."category_id" = p."category_id"
  LEFT JOIN "brands" b ON b."brand_id" = p."brand_id"
`;

export function createCatalogRouter(database: CatalogDatabase): Router {
  const router = Router();

  router.get("/facets", async (_request, response) => {
    const [productTypes, categories, brands, attributes] = await Promise.all([
      database.queryRaw<Array<{ value: string; label: string }>>(Prisma.sql`
        SELECT DISTINCT pt."type_code" AS "value", pt."type_name" AS "label"
        FROM "product_types" pt
        JOIN "products" p ON p."product_type_id" = pt."product_type_id"
        WHERE pt."is_active" = TRUE AND p."product_status" = 'ACTIVE'
        ORDER BY pt."type_name"
      `),
      database.queryRaw<Array<{ value: string; label: string }>>(Prisma.sql`
        SELECT DISTINCT c."category_code" AS "value", c."category_name" AS "label"
        FROM "categories" c
        JOIN "products" p ON p."category_id" = c."category_id"
        WHERE c."is_active" = TRUE AND p."product_status" = 'ACTIVE'
        ORDER BY c."category_name"
      `),
      database.queryRaw<Array<{ value: string; label: string }>>(Prisma.sql`
        SELECT DISTINCT b."brand_name" AS "value", b."brand_name" AS "label"
        FROM "brands" b
        JOIN "products" p ON p."brand_id" = b."brand_id"
        WHERE b."is_active" = TRUE AND p."product_status" = 'ACTIVE'
        ORDER BY b."brand_name"
      `),
      database.queryRaw<Array<{ productType: string; code: string; label: string; value: unknown }>>(Prisma.sql`
        SELECT DISTINCT
          pt."type_code" AS "productType",
          ad."attribute_code" AS "code",
          ad."attribute_name" AS "label",
          COALESCE(
            to_jsonb(av."value_text"),
            to_jsonb(av."value_decimal"),
            to_jsonb(av."value_integer"),
            to_jsonb(av."value_boolean"),
            av."value_json"
          ) AS "value"
        FROM "product_attribute_definitions" ad
        JOIN "product_attribute_values" av
          ON av."attribute_definition_id" = ad."attribute_definition_id"
        JOIN "products" p ON p."product_id" = av."product_id"
        JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
        WHERE ad."is_filterable" = TRUE AND p."product_status" = 'ACTIVE'
        ORDER BY pt."type_code", ad."attribute_name"
      `),
    ]);
    const groupedAttributes = new Map<string, {
      productType: string;
      code: string;
      label: string;
      values: { label: string; value: string }[];
    }>();
    for (const attribute of attributes) {
      const key = `${attribute.productType}:${attribute.code}`;
      const current = groupedAttributes.get(key) ?? {
        productType: attribute.productType,
        code: attribute.code,
        label: attribute.label,
        values: [],
      };
      const value = JSON.stringify(attribute.value);
      if (!current.values.some((item) => item.value === value)) {
        current.values.push({ label: String(attribute.value), value });
      }
      groupedAttributes.set(key, current);
    }

    response.json({
      data: {
        productTypes,
        categories,
        brands,
        attributes: [...groupedAttributes.values()],
      },
    });
  });

  router.get("/products", async (request, response) => {
    const query = parseCatalogQuery(new URL(request.originalUrl, "http://localhost").searchParams);
    const clauses = productWhere(query);
    if (query.attributes.length > 0) {
      const codes = [...new Set(query.attributes.map(({ code }) => code))];
      const valid = await database.queryRaw<Array<{ attribute_code: string }>>(Prisma.sql`
        SELECT DISTINCT "attribute_code"
        FROM "product_attribute_definitions"
        WHERE "is_filterable" = TRUE AND "attribute_code" IN (${Prisma.join(codes)})
      `);
      const validCodes = new Set(valid.map(({ attribute_code }) => attribute_code));
      const invalid = codes.find((code) => !validCodes.has(code));
      if (invalid) {
        invalidQuery(`Attribute "${invalid}" is not a supported filter.`);
      }
    }

    const where = Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
    const countRows = await database.queryRaw<Array<{ total: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS "total"
      FROM "products" p
      JOIN "product_types" pt ON pt."product_type_id" = p."product_type_id"
      JOIN "categories" c ON c."category_id" = p."category_id"
      LEFT JOIN "brands" b ON b."brand_id" = p."brand_id"
      ${where}
    `);

    const offset = (query.page - 1) * query.limit;
    const orderBy =
      query.sort === "price"
        ? Prisma.sql`(SELECT MIN(po."price") FROM "product_offers" po
            WHERE po."product_id" = p."product_id" AND po."offer_status" = 'ACTIVE')
            ${Prisma.raw(query.order.toUpperCase())} NULLS LAST, p."product_name" ASC`
        : Prisma.sql`p."product_name" ${Prisma.raw(query.order.toUpperCase())}`;
    const products = await database.queryRaw<unknown[]>(Prisma.sql`
      ${productSelection}
      ${where}
      ORDER BY ${orderBy}
      LIMIT ${query.limit} OFFSET ${offset}
    `);

    const total = countRows[0]?.total ?? 0;
    response.json({
      data: filterValidProductImages(products),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      notice: "Giá và tồn kho của các offer mã DEMO- là dữ liệu minh họa, không phải thông tin bán hàng trực tiếp.",
    });
  });

  router.get("/products/:modelCode", async (request, response) => {
    const modelCode = request.params.modelCode;
    if (!modelCode || modelCode.length > 100 || /[\u0000-\u001f\u007f]/.test(modelCode)) {
      invalidQuery("Product model code is invalid.");
    }
    const products = await database.queryRaw<unknown[]>(Prisma.sql`
      ${productSelection}
      WHERE p."product_status" = 'ACTIVE' AND p."model_code" = ${modelCode}
      LIMIT 1
    `);
    if (!products[0]) {
      throw new HttpError(404, "PRODUCT_NOT_FOUND", "The requested product was not found.");
    }
    response.json({
      data: filterValidProductImages([products[0]])[0],
      notice: "Giá và tồn kho của các offer mã DEMO- là dữ liệu minh họa, không phải thông tin bán hàng trực tiếp.",
    });
  });

  return router;
}
