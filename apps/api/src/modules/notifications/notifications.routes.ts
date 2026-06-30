import { Router } from "express";
import { z } from "zod";
import { created, ok } from "../../lib/apiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { prisma } from "../../lib/prisma.js";

export const notificationsRouter = Router();

const channelSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["WEBHOOK", "EMAIL"]),
  target: z.string().trim().min(1),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE")
});

const ruleSchema = z.object({
  name: z.string().trim().min(1),
  eventType: z.enum(["USAGE_WARNING", "RATE_LIMITED", "BILLING_FAILED", "JOB_FAILED", "HIGH_PRIORITY_EXCEPTION"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).nullable().optional(),
  channelId: z.string().trim().min(1),
  threshold: z.number().int().min(1).max(100).nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE")
});

const channelInclude = {
  rules: {
    orderBy: {
      createdAt: "desc" as const
    }
  }
};

notificationsRouter.get(
  "/channels",
  asyncHandler(async (_req, res) => {
    const channels = await prisma.notificationChannel.findMany({
      include: channelInclude,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });

    ok(res, channels);
  })
);

notificationsRouter.post(
  "/channels",
  asyncHandler(async (req, res) => {
    const input = channelSchema.parse(req.body);
    const channel = await prisma.notificationChannel.create({
      data: input,
      include: channelInclude
    });

    created(res, channel);
  })
);

notificationsRouter.patch(
  "/channels/:id",
  asyncHandler(async (req, res) => {
    const input = channelSchema.partial().parse(req.body);
    const channel = await prisma.notificationChannel.update({
      where: { id: String(req.params.id) },
      data: input,
      include: channelInclude
    });

    ok(res, channel);
  })
);

notificationsRouter.post(
  "/channels/:id/test",
  asyncHandler(async (req, res) => {
    const channel = await prisma.notificationChannel.update({
      where: { id: String(req.params.id) },
      data: {
        lastTestedAt: new Date()
      },
      include: channelInclude
    });

    ok(res, { channel, delivered: true, simulated: true });
  })
);

notificationsRouter.get(
  "/rules",
  asyncHandler(async (_req, res) => {
    const rules = await prisma.notificationRule.findMany({
      include: {
        channel: true
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });

    ok(res, rules);
  })
);

notificationsRouter.post(
  "/rules",
  asyncHandler(async (req, res) => {
    const input = ruleSchema.parse(req.body);
    const rule = await prisma.notificationRule.create({
      data: input,
      include: {
        channel: true
      }
    });

    created(res, rule);
  })
);

notificationsRouter.patch(
  "/rules/:id",
  asyncHandler(async (req, res) => {
    const input = ruleSchema.partial().parse(req.body);
    const rule = await prisma.notificationRule.update({
      where: { id: String(req.params.id) },
      data: input,
      include: {
        channel: true
      }
    });

    ok(res, rule);
  })
);
