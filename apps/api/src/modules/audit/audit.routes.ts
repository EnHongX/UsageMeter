import { Router } from "express";
import { ok } from "../../lib/apiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { prisma } from "../../lib/prisma.js";
import { requireRole } from "../../middleware/requireUser.js";

export const auditRouter = Router();

auditRouter.get(
  "/",
  requireRole(["ADMIN", "OPERATOR"]),
  asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    ok(res, logs);
  })
);
