import { Prisma } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { CatalogDatabase } from "../src/catalog/routes.js";

function databaseWith(
  handler: (query: Prisma.Sql) => unknown | Promise<unknown>,
): CatalogDatabase {
  return {
    queryRaw: vi.fn((query: Prisma.Sql) => Promise.resolve(handler(query))) as CatalogDatabase["queryRaw"],
  };
}

describe("catalog API", () => {
  it("lists products with search, filters, sorting, and bounded pagination", async () => {
    const database = databaseWith((query) => {
      if (query.sql.includes('COUNT(*)')) return [{ total: 1 }];
      return [{ modelCode: "CPU-1", productName: "Demo CPU", offers: [], specifications: {}, images: [] }];
    });
    const response = await request(createApp({ catalogDatabase: database }))
      .get("/api/catalog/products?q=Demo%20CPU&type=CPU&category=CPU&brand=AMD&sort=price&order=desc&page=2&limit=5");

    expect(response.status).toBe(200);
    expect(response.body.data[0].modelCode).toBe("CPU-1");
    expect(response.body.pagination).toEqual({ page: 2, limit: 5, total: 1, totalPages: 1 });
    expect(response.body.notice).toMatch(/demo/i);
    const calls = vi.mocked(database.queryRaw).mock.calls.map(([query]) => query);
    expect(calls.some((query) => query.sql.includes("ILIKE"))).toBe(true);
    expect(calls.some((query) => query.values.includes("%Demo CPU%"))).toBe(true);
    expect(calls.some((query) => query.values.includes("CPU"))).toBe(true);
  });

  it("supports a filterable specification and rejects unsupported filters", async () => {
    const database = databaseWith((query) => {
      if (query.sql.includes("SELECT DISTINCT")) return [{ attribute_code: "socket" }];
      if (query.sql.includes('COUNT(*)')) return [{ total: 0 }];
      return [];
    });
    const response = await request(createApp({ catalogDatabase: database }))
      .get("/api/catalog/products?attribute=socket%3DAM5");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.total).toBe(0);

    const unsupported = databaseWith(() => []);
    const invalid = await request(createApp({ catalogDatabase: unsupported }))
      .get("/api/catalog/products?attribute=not_real%3Dvalue");
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("INVALID_CATALOG_QUERY");
  });

  it("uses a single offer to satisfy both price bounds", async () => {
    const database = databaseWith((query) => {
      if (query.sql.includes("COUNT(*)")) return [{ total: 0 }];
      return [];
    });
    const response = await request(createApp({ catalogDatabase: database }))
      .get("/api/catalog/products?minPrice=100&maxPrice=200");

    expect(response.status).toBe(200);
    const queries = vi.mocked(database.queryRaw).mock.calls.map(([query]) => query);
    const filteredQuery = queries.find((query) => query.sql.includes('"price" >='));
    expect(filteredQuery?.sql).toContain('"price" <= ');
    expect(filteredQuery?.values).toEqual(expect.arrayContaining(["100", "200"]));
  });

  it("returns catalog facets derived from active products", async () => {
    const database = databaseWith((query) => {
      if (query.sql.includes('"attribute_code"')) {
        return [{ productType: "CPU", code: "socket", label: "Socket", value: "AM5" }];
      }
      return [{ value: "CPU", label: "Processor" }];
    });
    const response = await request(createApp({ catalogDatabase: database })).get("/api/catalog/facets");

    expect(response.status).toBe(200);
    expect(response.body.data.productTypes).toEqual([{ value: "CPU", label: "Processor" }]);
    expect(response.body.data.attributes).toEqual([
      { productType: "CPU", code: "socket", label: "Socket", values: [{ label: "AM5", value: '"AM5"' }] },
    ]);
  });

  it("only returns product image records with valid HTTP URLs", async () => {
    const database = databaseWith((query) => {
      if (query.sql.includes("COUNT(*)")) return [{ total: 1 }];
      return [{
        modelCode: "CPU-1",
        images: [
          { url: "https://images.example.test/cpu.png", altText: "CPU", isPrimary: true },
          { url: "javascript:alert(1)", altText: "invalid", isPrimary: false },
          { url: "http://", altText: "invalid", isPrimary: false },
        ],
      }];
    });
    const response = await request(createApp({ catalogDatabase: database })).get("/api/catalog/products");

    expect(response.status).toBe(200);
    expect(response.body.data[0].images).toEqual([
      { url: "https://images.example.test/cpu.png", altText: "CPU", isPrimary: true },
    ]);
  });

  it("validates query parameters and returns an empty page without querying the database", async () => {
    const database = databaseWith(() => {
      throw new Error("Database should not be queried for invalid input.");
    });
    const response = await request(createApp({ catalogDatabase: database }))
      .get("/api/catalog/products?limit=999&sort=name%3Bdrop%20table");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_CATALOG_QUERY");
    expect(database.queryRaw).not.toHaveBeenCalled();
  });

  it("rejects price filters outside the database column range", async () => {
    const database = databaseWith(() => {
      throw new Error("Database should not be queried for invalid input.");
    });
    const response = await request(createApp({ catalogDatabase: database }))
      .get("/api/catalog/products?minPrice=99999999999999");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_CATALOG_QUERY");
    expect(database.queryRaw).not.toHaveBeenCalled();
  });

  it("returns product detail or a safe not-found response", async () => {
    const database = databaseWith(() => []);
    const response = await request(createApp({ catalogDatabase: database }))
      .get("/api/catalog/products/DOES-NOT-EXIST");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
    expect(response.body.error.message).not.toMatch(/SELECT|products|database/i);
  });

  it("supports model codes containing encoded slashes", async () => {
    const database = databaseWith(() => [{
      modelCode: "KF432C16BB/8",
      productName: "Demo memory",
      offers: [],
      specifications: {},
      images: [],
    }]);
    const response = await request(createApp({ catalogDatabase: database }))
      .get("/api/catalog/products/KF432C16BB%2F8");

    expect(response.status).toBe(200);
    expect(response.body.data.modelCode).toBe("KF432C16BB/8");
    const query = vi.mocked(database.queryRaw).mock.calls[0]?.[0];
    expect(query?.values).toContain("KF432C16BB/8");
  });
});
