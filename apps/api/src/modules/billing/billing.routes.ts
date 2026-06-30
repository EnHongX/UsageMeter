import { Router } from "express";
import { z } from "zod";
import { ApiCode, ok } from "../../lib/apiResponse.js";
import { created } from "../../lib/apiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export const billingRouter = Router();

const billingRunSchema = z.object({
  tenantId: z.string().trim().min(1),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  invoiceId: z.string().trim().min(1).optional().nullable(),
  status: z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED"]).default("PENDING"),
  failureReason: z.string().trim().min(1).optional().nullable()
});

const billingRunInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
      status: true
    }
  },
  invoice: {
    select: {
      id: true,
      billingPeriod: true,
      status: true,
      totalAmount: true,
      billingCurrency: true
    }
  }
};

billingRouter.get(
  "/runs",
  asyncHandler(async (_req, res) => {
    const runs = await prisma.billingRun.findMany({
      include: billingRunInclude,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    ok(res, runs);
  })
);

billingRouter.post(
  "/runs",
  asyncHandler(async (req, res) => {
    const input = billingRunSchema.parse(req.body);
    const now = new Date();
    const run = await prisma.billingRun.create({
      data: {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        billingPeriod: input.billingPeriod,
        status: input.status,
        startedAt: input.status === "PENDING" ? null : now,
        finishedAt: input.status === "SUCCESS" || input.status === "FAILED" ? now : null,
        failureReason: input.failureReason
      },
      include: billingRunInclude
    });

    created(res, run);
  })
);

billingRouter.patch(
  "/runs/:id/retry",
  asyncHandler(async (req, res) => {
    const run = await prisma.billingRun.update({
      where: { id: String(req.params.id) },
      data: {
        status: "PENDING",
        startedAt: null,
        finishedAt: null,
        failureReason: null
      },
      include: billingRunInclude
    });

    ok(res, run);
  })
);

billingRouter.get(
  "/invoices",
  asyncHandler(async (_req, res) => {
    const invoices = await prisma.invoice.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        lineItems: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    ok(res, invoices);
  })
);

billingRouter.get(
  "/invoices/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        lineItems: true
      }
    });

    if (!invoice) {
      throw new AppError(404, ApiCode.INVOICE_NOT_FOUND, "Invoice does not exist");
    }

    ok(res, invoice);
  })
);
