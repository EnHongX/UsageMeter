import { Router } from "express";
import { z } from "zod";
import { ok } from "../../lib/apiResponse.js";
import { writeAuditLog } from "../../lib/audit.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { prisma } from "../../lib/prisma.js";
import { requireRole } from "../../middleware/requireUser.js";

export const settingsRouter = Router();

const settingsSchema = z.object({
  systemName: z.string().min(1),
  defaultPageSize: z.number().int().min(5).max(100),
  allowRegistration: z.boolean(),
  billingCurrency: z.enum(["USD", "CNY"])
});

export const defaultSettings = {
  systemName: "UsageMeter",
  defaultPageSize: "10",
  allowRegistration: "true",
  billingCurrency: "USD"
};

async function readSettings() {
  const rows = await prisma.systemSetting.findMany();
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    systemName: values.get("systemName") ?? defaultSettings.systemName,
    defaultPageSize: Number(values.get("defaultPageSize") ?? defaultSettings.defaultPageSize),
    allowRegistration: (values.get("allowRegistration") ?? defaultSettings.allowRegistration) === "true",
    billingCurrency: values.get("billingCurrency") ?? defaultSettings.billingCurrency
  };
}

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    ok(res, await readSettings());
  })
);

settingsRouter.patch(
  "/",
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const input = settingsSchema.parse(req.body);
    const entries = {
      systemName: input.systemName,
      defaultPageSize: String(input.defaultPageSize),
      allowRegistration: String(input.allowRegistration),
      billingCurrency: input.billingCurrency
    };

    await prisma.$transaction(
      Object.entries(entries).map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        })
      )
    );
    await writeAuditLog({
      userId: req.user?.id,
      action: "update_settings",
      resource: "system_setting",
      metadata: entries
    });

    ok(res, await readSettings());
  })
);
