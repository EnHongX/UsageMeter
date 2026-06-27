import type { RequestHandler } from "express";
import { ApiCode } from "../lib/apiResponse.js";
import { AppError } from "../lib/errors.js";
import { hashApiKey } from "../lib/apiKey.js";
import { prisma } from "../lib/prisma.js";

function readBearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export const authenticateApiKey: RequestHandler = async (req, _res, next) => {
  try {
    const token = readBearerToken(req.header("authorization"));

    if (!token) {
      throw new AppError(401, ApiCode.MISSING_API_KEY, "Missing API key");
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(token) },
      include: { tenant: true }
    });

    if (!apiKey) {
      throw new AppError(401, ApiCode.INVALID_API_KEY, "Invalid API key");
    }

    if (apiKey.status === "REVOKED") {
      throw new AppError(403, ApiCode.REVOKED_API_KEY, "API key has been revoked");
    }

    if (apiKey.tenant.status !== "ACTIVE") {
      throw new AppError(403, ApiCode.TENANT_SUSPENDED, "Tenant is suspended");
    }

    req.auth = {
      apiKey,
      tenant: apiKey.tenant
    };

    next();
  } catch (error) {
    next(error);
  }
};
