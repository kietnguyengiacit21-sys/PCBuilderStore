import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("health endpoints", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports API availability independently from the database", async () => {
    const database = {
      check: vi.fn(),
    };
    const response = await request(createApp({ database })).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(database.check).not.toHaveBeenCalled();
  });

  it("reports database connectivity only after a successful query", async () => {
    const database = {
      check: vi.fn().mockResolvedValue(undefined),
    };
    const response = await request(createApp({ database })).get("/api/health/db");

    expect(response.status).toBe(200);
    expect(response.body.database).toBe("connected");
    expect(database.check).toHaveBeenCalledOnce();
  });

  it("returns service unavailable when the database query fails", async () => {
    const database = {
      check: vi.fn().mockRejectedValue(new Error("connection refused")),
    };
    const response = await request(createApp({ database })).get("/api/health/db");

    expect(response.status).toBe(503);
    expect(response.body.database).toBe("disconnected");
    expect(response.body.error).toBeUndefined();
  });

  it("returns a structured 404 response", async () => {
    const database = {
      check: vi.fn(),
    };
    const response = await request(createApp({ database })).get("/api/missing");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("reports malformed JSON as a client error", async () => {
    const database = {
      check: vi.fn(),
    };
    const response = await request(createApp({ database }))
      .post("/api/health")
      .set("content-type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });
});
