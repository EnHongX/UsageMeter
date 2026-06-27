import { Router } from "express";
import { z } from "zod";
import { ApiCode, created, ok } from "../../lib/apiResponse.js";
import { writeAuditLog } from "../../lib/audit.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export const tenantsRouter = Router();

const createTenantSchema = z.object({
  name: z.string().min(1),
  planId: z.string().min(1)
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  planId: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional()
});

const tenantInclude = {
  plan: true
};

tenantsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tenants = await prisma.tenant.findMany({
      include: tenantInclude,
      orderBy: { createdAt: "desc" }
    });

    ok(res, tenants);
  })
);

tenantsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createTenantSchema.parse(req.body);

    const plan = await prisma.plan.findUnique({
      where: { id: input.planId }
    });

    if (!plan) {
      throw new AppError(404, ApiCode.PLAN_NOT_FOUND, "Plan does not exist");
    }

    const tenant = await prisma.tenant.create({
      data: input,
      include: tenantInclude
    });
    await writeAuditLog({
      userId: req.user?.id,
      action: "create",
      resource: "tenant",
      resourceId: tenant.id
    });

    created(res, tenant);
  })
);

tenantsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: tenantInclude
    });

    if (!tenant) {
      throw new AppError(404, ApiCode.TENANT_NOT_FOUND, "Tenant does not exist");
    }

    ok(res, tenant);
  })
);

tenantsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const input = updateTenantSchema.parse(req.body);
    const existing = await prisma.tenant.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError(404, ApiCode.TENANT_NOT_FOUND, "Tenant does not exist");
    }

    if (input.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: input.planId } });

      if (!plan) {
        throw new AppError(404, ApiCode.PLAN_NOT_FOUND, "Plan does not exist");
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: input,
      include: tenantInclude
    });
    await writeAuditLog({
      userId: req.user?.id,
      action: "update",
      resource: "tenant",
      resourceId: tenant.id,
      metadata: input
    });

    ok(res, tenant);
  })
);
