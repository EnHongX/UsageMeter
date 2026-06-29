import { prisma } from "../../src/lib/prisma.js";

export async function resetDatabase() {
  await prisma.notificationRule.deleteMany();
  await prisma.notificationChannel.deleteMany();
  await prisma.exceptionNote.deleteMany();
  await prisma.exceptionCase.deleteMany();
  await prisma.systemJobRun.deleteMany();
  await prisma.billingRun.deleteMany();
  await prisma.rateLimitEvent.deleteMany();
  await prisma.rateLimitPolicy.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.usageDailyAggregate.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.plan.deleteMany();
}
