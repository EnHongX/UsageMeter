import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { resetDatabase } from "./helpers/database.js";
import { createAuthenticatedAgent } from "./helpers/auth.js";

describe("api keys", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates an API key once, stores only a hash, lists without the secret, and revokes it", async () => {
    const app = createApp();
    const agent = await createAuthenticatedAgent(app);

    const planResponse = await agent.post("/plans").send({
      name: "Pro",
      monthlyBaseFee: 9900,
      includedUnits: 100000,
      dailyUnitLimit: 10000,
      overageUnitPrice: 200
    });

    const tenantResponse = await agent.post("/tenants").send({
      name: "Acme Corp",
      planId: planResponse.body.data.id
    });

    const createResponse = await agent.post("/api-keys").send({
      tenantId: tenantResponse.body.data.id,
      name: "Server key"
    });

    expect(createResponse.status).toBe(201);
    const createdApiKey = createResponse.body.data;
    expect(createResponse.body).toMatchObject({
      code: "CREATED",
      message: "created"
    });
    expect(createdApiKey.key).toMatch(/^sk_live_[A-Za-z0-9_-]{32,}$/);
    expect(createdApiKey).toMatchObject({
      name: "Server key",
      status: "ACTIVE",
      tenantId: tenantResponse.body.data.id
    });
    expect(createdApiKey.keyPrefix).toBe(createdApiKey.key.slice(0, 16));

    const stored = await prisma.apiKey.findUniqueOrThrow({
      where: { id: createdApiKey.id }
    });

    expect(stored.keyHash).not.toBe(createdApiKey.key);
    expect(stored.keyHash).toHaveLength(64);

    const listResponse = await agent.get("/api-keys");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0]).not.toHaveProperty("key");
    expect(listResponse.body.data[0]).not.toHaveProperty("keyHash");
    expect(listResponse.body.data[0]).toMatchObject({
      id: createdApiKey.id,
      keyPrefix: createdApiKey.keyPrefix,
      status: "ACTIVE",
      tenant: {
        name: "Acme Corp"
      }
    });

    const revokeResponse = await agent.patch(`/api-keys/${createdApiKey.id}/revoke`);

    expect(revokeResponse.status).toBe(200);
    expect(revokeResponse.body.data).toMatchObject({
      id: createdApiKey.id,
      status: "REVOKED"
    });
    expect(revokeResponse.body.data.revokedAt).toEqual(expect.any(String));
    expect(revokeResponse.body.data).not.toHaveProperty("key");
    expect(revokeResponse.body.data).not.toHaveProperty("keyHash");

    const updateResponse = await agent.patch(`/api-keys/${createdApiKey.id}`).send({
      name: "Billing worker key"
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data).toMatchObject({
      id: createdApiKey.id,
      name: "Billing worker key",
      status: "REVOKED"
    });

    const deleteResponse = await agent.delete(`/api-keys/${createdApiKey.id}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toMatchObject({
      code: "DELETED",
      data: null
    });
    await expect(
      prisma.apiKey.findUnique({
        where: { id: createdApiKey.id }
      })
    ).resolves.toBeNull();
  });
});
