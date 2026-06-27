import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { createAuthenticatedAgent } from "./helpers/auth.js";
import { resetDatabase } from "./helpers/database.js";

async function createActiveApiKey() {
  const app = createApp();
  const agent = await createAuthenticatedAgent(app);

  const planResponse = await agent.post("/plans").send({
    name: "专业版",
    monthlyBaseFee: 9900,
    includedUnits: 100000,
    dailyUnitLimit: 10000,
    overageUnitPrice: 200
  });

  const tenantResponse = await agent.post("/tenants").send({
    name: "星河智能科技",
    planId: planResponse.body.data.id
  });

  const apiKeyResponse = await agent.post("/api-keys").send({
    tenantId: tenantResponse.body.data.id,
    name: "生产环境服务端 Key"
  });

  return {
    app,
    agent,
    tenantId: tenantResponse.body.data.id as string,
    apiKeyId: apiKeyResponse.body.data.id as string,
    apiKey: apiKeyResponse.body.data.key as string
  };
}

describe("protected API metering phase 1", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("rejects missing and invalid API keys", async () => {
    const { app } = await createActiveApiKey();

    const missingResponse = await request(app).post("/api/v1/messages").set("X-Request-Id", "req_missing_key").send({
      message: "hello"
    });

    expect(missingResponse.status).toBe(401);
    expect(missingResponse.body).toMatchObject({
      code: "MISSING_API_KEY",
      message: "Missing API key",
      data: null
    });

    const invalidResponse = await request(app)
      .post("/api/v1/messages")
      .set("Authorization", "Bearer sk_live_invalid")
      .set("X-Request-Id", "req_invalid_key")
      .send({ message: "hello" });

    expect(invalidResponse.status).toBe(401);
    expect(invalidResponse.body).toMatchObject({
      code: "INVALID_API_KEY",
      message: "Invalid API key",
      data: null
    });
  });

  it("rejects revoked API keys", async () => {
    const { app, agent, apiKeyId, apiKey } = await createActiveApiKey();

    await agent.patch(`/api-keys/${apiKeyId}/revoke`);

    const response = await request(app)
      .post("/api/v1/messages")
      .set("Authorization", `Bearer ${apiKey}`)
      .set("X-Request-Id", "req_revoked_key")
      .send({ message: "hello" });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: "REVOKED_API_KEY",
      message: "API key has been revoked",
      data: null
    });
  });

  it("records a UsageEvent for a valid protected API call", async () => {
    const { app, tenantId, apiKeyId, apiKey } = await createActiveApiKey();

    const response = await request(app)
      .post("/api/v1/messages")
      .set("Authorization", `Bearer ${apiKey}`)
      .set("X-Request-Id", "req_valid_message")
      .send({ message: "hello" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      code: "OK",
      data: {
        ok: true,
        metered: true,
        tenantId,
        costUnits: 5
      }
    });

    const usageEvent = await prisma.usageEvent.findUniqueOrThrow({
      where: {
        tenantId_requestId: {
          tenantId,
          requestId: "req_valid_message"
        }
      }
    });

    expect(usageEvent).toMatchObject({
      tenantId,
      apiKeyId,
      endpoint: "/api/v1/messages",
      method: "POST",
      requestId: "req_valid_message",
      statusCode: 200,
      costUnits: 5
    });
  });

  it("requires X-Request-Id before recording usage", async () => {
    const { app, apiKey } = await createActiveApiKey();

    const response = await request(app)
      .post("/api/v1/messages")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ message: "hello" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "MISSING_REQUEST_ID",
      message: "Missing X-Request-Id",
      data: null
    });

    expect(await prisma.usageEvent.count()).toBe(0);
  });
});
