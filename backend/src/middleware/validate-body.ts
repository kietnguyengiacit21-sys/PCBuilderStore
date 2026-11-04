import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "./http-error.js";

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(
        new HttpError(
          400,
          "VALIDATION_FAILED",
          "The request body is invalid.",
          result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            reason: issue.message,
          })),
        ),
      );
      return;
    }

    request.body = result.data;
    next();
  };
}
