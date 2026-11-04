import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { allowedOrigins, env } from "./config/env.js";
import { databaseProbe, getPrismaClient } from "./db/prisma.js";
import { HttpError } from "./middleware/http-error.js";
import { createCatalogRouter } from "./catalog/routes.js";
import type { CatalogDatabase } from "./catalog/routes.js";
import { createHealthRouter } from "./routes/health.js";
import type { DatabaseProbe } from "./routes/health.js";

export interface AppDependencies {
  database?: DatabaseProbe;
  catalogDatabase?: CatalogDatabase;
}

export function createApp({
  database = databaseProbe,
  catalogDatabase = {
    queryRaw: <T = unknown>(query: Prisma.Sql) => getPrismaClient().$queryRaw<T>(query),
  },
}: AppDependencies = {}): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    pinoHttp({
      level: env.NODE_ENV === "test" ? "silent" : "info",
      genReqId: (request, response) => {
        const requestId = request.headers["x-request-id"];
        const id =
          typeof requestId === "string" && requestId.length <= 128
            ? requestId
            : randomUUID();
        response.setHeader("x-request-id", id);
        return id;
      },
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.password_hash",
      ],
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new HttpError(403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed."));
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", createHealthRouter(database));
  app.use("/api/catalog", createCatalogRouter(catalogDatabase));

  app.use((_request, _response, next) => {
    next(new HttpError(404, "NOT_FOUND", "The requested resource was not found."));
  });

  app.use(
    (
      error: unknown,
      request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      const parserError =
        typeof error === "object" && error !== null && "type" in error
          ? error.type
          : undefined;
      const httpError =
        error instanceof HttpError
          ? error
          : parserError === "entity.parse.failed"
            ? new HttpError(400, "INVALID_JSON", "The JSON request body is malformed.")
            : parserError === "entity.too.large"
              ? new HttpError(413, "REQUEST_TOO_LARGE", "The request body is too large.")
              : new HttpError(
                  500,
                  "INTERNAL_SERVER_ERROR",
                  "An unexpected error occurred.",
                );

      if (httpError.statusCode >= 500) {
        request.log.error({ err: error }, "Request failed");
      } else {
        request.log.warn({ err: error, code: httpError.code }, "Request rejected");
      }

      response.status(httpError.statusCode).json({
        error: {
          code: httpError.code,
          message: httpError.message,
          ...(httpError.details ? { details: httpError.details } : {}),
          requestId: request.id,
        },
      });
    },
  );

  return app;
}

export const app = createApp();
