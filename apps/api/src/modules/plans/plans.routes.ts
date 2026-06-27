import { Router } from "express";
import { z } from "zod";
import { ApiCode, created, ok } from "../../lib/apiResponse.js";
import { writeAuditLog } from "../../lib/audit.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export const plansRouter = Router();

const createPlanSchema = z.object({
  name: z.string().min(1),
  billingCurrency: z.enum(["USD", "CNY"]).default("USD"),
  monthlyBaseFee: z.number().int().nonnegative(),
  includedUnits: z.number().int().nonnegative(),
  dailyUnitLimit: z.number().int().positive(),
  overageUnitPrice: z.number().int().nonnegative()
});

plansRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: "desc" }
    });

    ok(res, plans);
  })
);

plansRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createPlanSchema.parse(req.body);
    const plan = await prisma.plan.create({ data: input });
    await writeAuditLog({
      userId: req.user?.id,
      action: "create",
      resource: "plan",
      resourceId: plan.id
    });

    created(res, plan);
  })
);

plansRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const plan = await prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      throw new AppError(404, ApiCode.PLAN_NOT_FOUND, "Plan does not exist");
    }

    ok(res, plan);
  })
);

plansRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const input = createPlanSchema.partial().parse(req.body);
    const existing = await prisma.plan.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError(404, ApiCode.PLAN_NOT_FOUND, "Plan does not exist");
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: input
    });
    await writeAuditLog({
      userId: req.user?.id,
      action: "update",
      resource: "plan",
      resourceId: plan.id,
      metadata: input
    });

    ok(res, plan);
  })
);
