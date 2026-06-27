import { Router } from "express";
import { ApiCode, ok } from "../../lib/apiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

export const billingRouter = Router();

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
