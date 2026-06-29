import { Router } from "express";
import { z } from "zod";
import { created, ok } from "../../lib/apiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { prisma } from "../../lib/prisma.js";

export const rateLimitsRouter = Router();

const policySchema = z.object({
  scope: z.enum(["PLAN", "TENANT"]),
  tenantId: z.string().optional().nullable(),
  planId: z.string().optional().nullable(),
  dailyUnitLimit: z.number().int().min(1),
  warningThresholdPercent: z.number().int().min(1).max(100),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE")
});

const policyInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
      status: true
    }
  },
  plan: {
    select: {
      id: true,
      name: true,
      dailyUnitLimit: true
    }
  }
};

rateLimitsRouter.get(
  "/policies",
  asyncHandler(async (_req, res) => {
    const policies = await prisma.rateLimitPolicy.findMany({
      include: policyInclude,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });

    ok(res, policies);
  })
);

rateLimitsRouter.post(
  "/policies",
  asyncHandler(async (req, res) => {
    const input = policySchema.parse(req.body);
    const policy = await prisma.rateLimitPolicy.create({
      data: {
        scope: input.scope,
        tenantId: input.scope === "TENANT" ? input.tenantId : null,
        planId: input.scope === "PLAN" ? input.planId : null,
        dailyUnitLimit: input.dailyUnitLimit,
        warningThresholdPercent: input.warningThresholdPercent,
        status: input.status
      },
      include: policyInclude
    });

    created(res, policy);
  })
);

rateLimitsRouter.patch(
  "/policies/:id",
  asyncHandler(async (req, res) => {
    const input = policySchema.partial().parse(req.body);
    const policy = await prisma.rateLimitPolicy.update({
      where: { id: String(req.params.id) },
      data: input,
      include: policyInclude
    });

    ok(res, policy);
  })
);

rateLimitsRouter.get(
  "/events",
  asyncHandler(async (_req, res) => {
    const events = await prisma.rateLimitEvent.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        apiKey: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            status: true
          }
        },
        policy: {
          select: {
            id: true,
            scope: true,
            dailyUnitLimit: true,
            warningThresholdPercent: true,
            status: true
          }
        }
      },
      orderBy: { occurredAt: "desc" },
      take: 100
    });

    ok(res, events);
  })
);
