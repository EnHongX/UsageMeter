import { Router } from "express";
import { z } from "zod";
import { ApiCode, created, deleted, ok } from "../../lib/apiResponse.js";
import { writeAuditLog } from "../../lib/audit.js";
import { generateApiKey, getApiKeyPrefix, hashApiKey } from "../../lib/apiKey.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export const apiKeysRouter = Router();

const createApiKeySchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1)
});

const updateApiKeySchema = z.object({
  name: z.string().min(1)
});

const apiKeySelect = {
  id: true,
  tenantId: true,
  keyPrefix: true,
  name: true,
  status: true,
  createdAt: true,
  revokedAt: true,
  tenant: {
    select: {
      id: true,
      name: true,
      status: true
    }
  }
};

apiKeysRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const apiKeys = await prisma.apiKey.findMany({
      select: apiKeySelect,
      orderBy: { createdAt: "desc" }
    });

    ok(res, apiKeys);
  })
);

apiKeysRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
      select: apiKeySelect
    });

    if (!apiKey) {
      throw new AppError(404, ApiCode.API_KEY_NOT_FOUND, "API key does not exist");
    }

    ok(res, apiKey);
  })
);

apiKeysRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createApiKeySchema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: input.tenantId }
    });

    if (!tenant) {
      throw new AppError(404, ApiCode.TENANT_NOT_FOUND, "Tenant does not exist");
    }

    const key = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        keyHash: hashApiKey(key),
        keyPrefix: getApiKeyPrefix(key)
      },
      select: apiKeySelect
    });
    await writeAuditLog({
      userId: req.user?.id,
      action: "create",
      resource: "api_key",
      resourceId: apiKey.id
    });

    created(res, {
      ...apiKey,
      key
    });
  })
);

apiKeysRouter.patch(
  "/:id/revoke",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const existing = await prisma.apiKey.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new AppError(404, ApiCode.API_KEY_NOT_FOUND, "API key does not exist");
    }

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: existing.revokedAt ?? new Date()
      },
      select: apiKeySelect
    });
    await writeAuditLog({
      userId: req.user?.id,
      action: "revoke",
      resource: "api_key",
      resourceId: apiKey.id
    });

    ok(res, apiKey);
  })
);

apiKeysRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const input = updateApiKeySchema.parse(req.body);
    const existing = await prisma.apiKey.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new AppError(404, ApiCode.API_KEY_NOT_FOUND, "API key does not exist");
    }

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: input,
      select: apiKeySelect
    });
    await writeAuditLog({
      userId: req.user?.id,
      action: "update",
      resource: "api_key",
      resourceId: apiKey.id,
      metadata: input
    });

    ok(res, apiKey);
  })
);

apiKeysRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const existing = await prisma.apiKey.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new AppError(404, ApiCode.API_KEY_NOT_FOUND, "API key does not exist");
    }

    await prisma.$transaction([
      prisma.usageEvent.deleteMany({
        where: { apiKeyId: id }
      }),
      prisma.apiKey.delete({
        where: { id }
      })
    ]);
    await writeAuditLog({
      userId: req.user?.id,
      action: "delete",
      resource: "api_key",
      resourceId: id
    });

    deleted(res);
  })
);
