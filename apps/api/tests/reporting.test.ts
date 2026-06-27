import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { createAuthenticatedAgent } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/database.js";

describe("usage and billing reports", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lists usage events, daily aggregates, and invoices from PostgreSQL", async () => {
    const app = createApp();
    const agent = await createAuthenticatedAgent(app);
    const plan = await prisma.plan.create({
      data: {
        name: "专业版",
        monthlyBaseFee: 9900,
        includedUnits: 100000,
        dailyUnitLimit: 10000,
        overageUnitPrice: 200
      }
    });
    const tenant = await prisma.tenant.create({
      data: {
        name: "星河智能科技",
        planId: plan.id
      }
    });
    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        name: "生产环境服务端 Key",
        keyHash: "hash_for_reporting_test",
        keyPrefix: "sk_live_report"
      }
    });
    const usageEvent = await prisma.usageEvent.create({
      data: {
        tenantId: tenant.id,
        apiKeyId: apiKey.id,
        requestId: "report_req_1",
        endpoint: "/api/v1/messages",
        method: "POST",
        statusCode: 200,
        costUnits: 5
      }
    });
    const aggregate = await prisma.usageDailyAggregate.create({
      data: {
        tenantId: tenant.id,
        date: new Date("2026-06-27T00:00:00.000Z"),
        totalRequests: 10,
        totalCostUnits: 50
      }
    });
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        billingPeriod: "2026-06",
        baseFee: 9900,
        includedUnits: 100000,
        usedUnits: 101000,
        overageUnits: 1000,
        totalAmount: 10100
      }
    });
    await prisma.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        description: "套餐基础费用",
        amount: 9900,
        quantity: 1,
        unitPrice: 9900
      }
    });

    const eventsResponse = await agent.get("/usage/events");
    expect(eventsResponse.status).toBe(200);
    expect(eventsResponse.body.data).toHaveLength(1);
    expect(eventsResponse.body.data[0]).toMatchObject({
      requestId: "report_req_1",
      tenant: { name: "星河智能科技" },
      apiKey: { keyPrefix: "sk_live_report" }
    });

    const dailyResponse = await agent.get("/usage/daily");
    expect(dailyResponse.status).toBe(200);
    expect(dailyResponse.body.data).toHaveLength(1);
    expect(dailyResponse.body.data[0]).toMatchObject({
      totalRequests: 10,
      totalCostUnits: 50,
      tenant: { name: "星河智能科技" }
    });

    const invoicesResponse = await agent.get("/billing/invoices");
    expect(invoicesResponse.status).toBe(200);
    expect(invoicesResponse.body.data).toHaveLength(1);
    expect(invoicesResponse.body.data[0]).toMatchObject({
      billingPeriod: "2026-06",
      totalAmount: 10100,
      tenant: { name: "星河智能科技" },
      lineItems: [{ description: "套餐基础费用" }]
    });

    const deleteEventResponse = await agent.delete(`/usage/events/${usageEvent.id}`);
    expect(deleteEventResponse.status).toBe(404);
    await expect(prisma.usageEvent.findUnique({ where: { id: usageEvent.id } })).resolves.toMatchObject({
      id: usageEvent.id
    });

    const deleteAggregateResponse = await agent.delete(`/usage/daily/${aggregate.id}`);
    expect(deleteAggregateResponse.status).toBe(404);
    await expect(prisma.usageDailyAggregate.findUnique({ where: { id: aggregate.id } })).resolves.toMatchObject({
      id: aggregate.id
    });

    const deleteInvoiceResponse = await agent.delete(`/billing/invoices/${invoice.id}`);
    expect(deleteInvoiceResponse.status).toBe(404);
    await expect(prisma.invoice.findUnique({ where: { id: invoice.id } })).resolves.toMatchObject({
      id: invoice.id
    });
  });
});
