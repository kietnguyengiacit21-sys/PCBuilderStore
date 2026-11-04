import { Router } from "express";

export interface DatabaseProbe {
  check(): Promise<void>;
}

export function createHealthRouter(database: DatabaseProbe): Router {
  const router = Router();

  router.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "pc-builder-store-api",
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/health/db", async (request, response) => {
    try {
      await database.check();
      response.status(200).json({
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error({ err: error }, "Database health check failed");
      response.status(503).json({
        status: "error",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
