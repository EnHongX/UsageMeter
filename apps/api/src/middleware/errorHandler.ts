import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ApiCode, fail } from "../lib/apiResponse.js";
import { AppError } from "../lib/errors.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    fail(res, 400, ApiCode.VALIDATION_ERROR, "Validation failed", { issues: error.issues });
    return;
  }

  if (error instanceof AppError) {
    fail(res, error.statusCode, error.code, error.message, null);
    return;
  }

  fail(res, 500, ApiCode.INTERNAL_ERROR, "Unexpected server error", null);
};
