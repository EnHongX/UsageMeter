import { Router } from "express";
import { authenticateApiKey } from "../../middleware/authenticateApiKey.js";
import { ApiCode, ok } from "../../lib/apiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export const protectedApiRouter = Router();

const messageCostUnits = 5;

protectedApiRouter.post(
  "/messages",
  authenticateApiKey,
  asyncHandler(async (req, res) => {
    const requestId = req.header("x-request-id")?.trim();

    if (!requestId) {
      throw new AppError(400, ApiCode.MISSING_REQUEST_ID, "Missing X-Request-Id");
    }

    const auth = req.auth;

    if (!auth) {
      throw new AppError(401, ApiCode.MISSING_API_KEY, "Missing API key");
    }

    await prisma.usageEvent.create({
      data: {
        tenantId: auth.tenant.id,
        apiKeyId: auth.apiKey.id,
        requestId,
        endpoint: "/api/v1/messages",
        method: "POST",
        statusCode: 200,
        costUnits: messageCostUnits
      }
    });

    ok(res, {
      ok: true,
      metered: true,
      tenantId: auth.tenant.id,
      costUnits: messageCostUnits,
      message: "消息已处理"
    });
  })
);
