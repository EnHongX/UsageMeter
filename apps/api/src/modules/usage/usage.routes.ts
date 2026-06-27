import { Router } from "express";
import { ok } from "../../lib/apiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { prisma } from "../../lib/prisma.js";

export const usageRouter = Router();

usageRouter.get(
  "/events",
  asyncHandler(async (_req, res) => {
    const events = await prisma.usageEvent.findMany({
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
        }
      },
      orderBy: { occurredAt: "desc" },
      take: 100
    });

    ok(res, events);
  })
);

usageRouter.get(
  "/daily",
  asyncHandler(async (_req, res) => {
    const aggregates = await prisma.usageDailyAggregate.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      take: 100
    });

    ok(res, aggregates);
  })
);
