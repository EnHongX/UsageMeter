import type { Response } from "express";

export enum ApiCode {
  OK = "OK",
  CREATED = "CREATED",
  DELETED = "DELETED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  REGISTRATION_DISABLED = "REGISTRATION_DISABLED",
  EMAIL_EXISTS = "EMAIL_EXISTS",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  INVALID_CURRENT_PASSWORD = "INVALID_CURRENT_PASSWORD",
  PLAN_NOT_FOUND = "PLAN_NOT_FOUND",
  TENANT_NOT_FOUND = "TENANT_NOT_FOUND",
  API_KEY_NOT_FOUND = "API_KEY_NOT_FOUND",
  INVOICE_NOT_FOUND = "INVOICE_NOT_FOUND",
  MISSING_API_KEY = "MISSING_API_KEY",
  INVALID_API_KEY = "INVALID_API_KEY",
  REVOKED_API_KEY = "REVOKED_API_KEY",
  TENANT_SUSPENDED = "TENANT_SUSPENDED",
  MISSING_REQUEST_ID = "MISSING_REQUEST_ID",
  NOT_AUTHENTICATED = "NOT_AUTHENTICATED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND"
}

export type ApiResponse<T> = {
  code: ApiCode | string;
  message: string;
  data: T;
};

export function ok<T>(res: Response, data: T, message = "success") {
  return res.json({
    code: ApiCode.OK,
    message,
    data
  } satisfies ApiResponse<T>);
}

export function created<T>(res: Response, data: T, message = "created") {
  return res.status(201).json({
    code: ApiCode.CREATED,
    message,
    data
  } satisfies ApiResponse<T>);
}

export function deleted(res: Response, message = "deleted") {
  return res.json({
    code: ApiCode.DELETED,
    message,
    data: null
  } satisfies ApiResponse<null>);
}

export function fail<T>(res: Response, statusCode: number, code: ApiCode | string, message: string, data: T) {
  return res.status(statusCode).json({
    code,
    message,
    data
  } satisfies ApiResponse<T>);
}
