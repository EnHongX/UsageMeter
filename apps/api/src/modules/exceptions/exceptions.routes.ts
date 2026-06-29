import { Router } from "express";
import { z } from "zod";
import { created, ok } from "../../lib/apiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { prisma } from "../../lib/prisma.js";

export const exceptionsRouter = Router();

const exceptionUpdateSchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assignee: z.string().trim().min(1).nullable().optional()
});

const noteSchema = z.object({
  body: z.string().trim().min(1)
});

const exceptionInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
      status: true
    }
  },
  notes: {
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
    orderBy: {
      createdAt: "desc" as const
    }
  }
};

exceptionsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const cases = await prisma.exceptionCase.findMany({
      include: exceptionInclude,
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      take: 100
    });

    ok(res, cases);
  })
);

exceptionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const exception = await prisma.exceptionCase.findUnique({
      where: { id: String(req.params.id) },
      include: exceptionInclude
    });

    ok(res, exception);
  })
);

exceptionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = exceptionUpdateSchema.parse(req.body);
    const exception = await prisma.exceptionCase.update({
      where: { id: String(req.params.id) },
      data: {
        ...input,
        resolvedAt: input.status === "RESOLVED" ? new Date() : input.status === "OPEN" ? null : undefined
      },
      include: exceptionInclude
    });

    ok(res, exception);
  })
);

exceptionsRouter.post(
  "/:id/notes",
  asyncHandler(async (req, res) => {
    const input = noteSchema.parse(req.body);
    const note = await prisma.exceptionNote.create({
      data: {
        exceptionId: String(req.params.id),
        userId: req.user?.id,
        body: input.body
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    created(res, note);
  })
);
