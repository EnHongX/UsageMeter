import { createApp } from "../src/app.js";
import { resetDatabase } from "./helpers/database.js";
import { createAuthenticatedAgent } from "./helpers/auth.js";
import { prisma } from "../src/lib/prisma.js";

describe("operations console APIs", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("supports lightweight operations workflows", async () => {
    const app = createApp();
    const agent = await createAuthenticatedAgent(app);
    const plan = await prisma.plan.create({
      data: {
        name: "Growth",
        monthlyBaseFee: 4900,
        includedUnits: 50000,
        dailyUnitLimit: 5000,
        overageUnitPrice: 150
      }
    });
    const tenant = await prisma.tenant.create({
      data: {
        name: "Acme",
        planId: plan.id
      }
    });

    const policyResponse = await agent.post("/rate-limits/policies").send({
      scope: "TENANT",
      tenantId: tenant.id,
      dailyUnitLimit: 3000,
      warningThresholdPercent: 80,
      status: "ACTIVE"
    });

    expect(policyResponse.status).toBe(201);
    expect(policyResponse.body.data).toMatchObject({
      tenantId: tenant.id,
      dailyUnitLimit: 3000
    });

    const billingRunResponse = await agent.post("/billing/runs").send({
      tenantId: tenant.id,
      billingPeriod: "2026-06",
      status: "FAILED",
      failureReason: "missing aggregate"
    });

    expect(billingRunResponse.status).toBe(201);
    expect(billingRunResponse.body.data).toMatchObject({
      tenantId: tenant.id,
      billingPeriod: "2026-06",
      status: "FAILED"
    });

    const retryResponse = await agent.patch(`/billing/runs/${billingRunResponse.body.data.id}/retry`);
    expect(retryResponse.status).toBe(200);
    expect(retryResponse.body.data.status).toBe("PENDING");

    const exception = await prisma.exceptionCase.create({
      data: {
        tenantId: tenant.id,
        type: "BILLING_FAILED",
        severity: "HIGH",
        source: "billing_worker",
        summary: "Billing failed"
      }
    });

    const exceptionResponse = await agent.patch(`/exceptions/${exception.id}`).send({
      status: "ACKNOWLEDGED",
      assignee: "平台管理员"
    });
    expect(exceptionResponse.status).toBe(200);
    expect(exceptionResponse.body.data).toMatchObject({
      status: "ACKNOWLEDGED",
      assignee: "平台管理员"
    });

    const noteResponse = await agent.post(`/exceptions/${exception.id}/notes`).send({
      body: "已开始处理"
    });
    expect(noteResponse.status).toBe(201);
    expect(noteResponse.body.data.body).toBe("已开始处理");

    const channelResponse = await agent.post("/notifications/channels").send({
      name: "Ops Webhook",
      type: "WEBHOOK",
      target: "https://example.com/hook",
      status: "ACTIVE"
    });
    expect(channelResponse.status).toBe(201);

    const ruleResponse = await agent.post("/notifications/rules").send({
      name: "Billing failed",
      eventType: "BILLING_FAILED",
      severity: "HIGH",
      channelId: channelResponse.body.data.id,
      status: "ACTIVE"
    });
    expect(ruleResponse.status).toBe(201);
    expect(ruleResponse.body.data.channelId).toBe(channelResponse.body.data.id);

    const testResponse = await agent.post(`/notifications/channels/${channelResponse.body.data.id}/test`);
    expect(testResponse.status).toBe(200);
    expect(testResponse.body.data).toMatchObject({
      delivered: true,
      simulated: true
    });

    await prisma.systemJobRun.create({
      data: {
        jobType: "USAGE_AGGREGATION",
        status: "SUCCESS",
        triggeredBy: "schedule"
      }
    });
    const jobsResponse = await agent.get("/system/jobs");
    expect(jobsResponse.status).toBe(200);
    expect(jobsResponse.body.data).toHaveLength(1);
  });
});
