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
    expect(response.body.notice).toMatch(/demo/);
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

  it("returns product detail or a safe not-found response", async () => {
    const database = databaseWith(() => []);
    const response = await request(createApp({ catalogDatabase: database }))
      .get("/api/catalog/products/DOES-NOT-EXIST");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
    expect(response.body.error.message).not.toMatch(/SELECT|products|database/i);
  });
});
