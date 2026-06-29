import { Router } from "express";
import { ok } from "../../lib/apiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { prisma } from "../../lib/prisma.js";

export const systemJobsRouter = Router();

systemJobsRouter.get(
  "/jobs",
  asyncHandler(async (_req, res) => {
    const runs = await prisma.systemJobRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });

    ok(res, runs);
  })
);

systemJobsRouter.get(
  "/jobs/:id",
  asyncHandler(async (req, res) => {
    const run = await prisma.systemJobRun.findUnique({
      where: { id: String(req.params.id) }
    });

    ok(res, run);
  })
);
