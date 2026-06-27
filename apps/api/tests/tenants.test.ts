import { createApp } from "../src/app.js";
import { resetDatabase } from "./helpers/database.js";
import { createAuthenticatedAgent } from "./helpers/auth.js";

describe("tenants", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates, lists, and fetches tenants with their assigned plan", async () => {
    const app = createApp();
    const agent = await createAuthenticatedAgent(app);

    const planResponse = await agent.post("/plans").send({
      name: "Pro",
      monthlyBaseFee: 9900,
      includedUnits: 100000,
      dailyUnitLimit: 10000,
      overageUnitPrice: 200
    });

    const createResponse = await agent.post("/tenants").send({
      name: "Acme Corp",
      planId: planResponse.body.data.id
    });

    expect(createResponse.status).toBe(201);
    const createdTenant = createResponse.body.data;
    expect(createResponse.body).toMatchObject({
      code: "CREATED",
      message: "created"
    });
    expect(createdTenant).toMatchObject({
      name: "Acme Corp",
      status: "ACTIVE",
      planId: planResponse.body.data.id,
      plan: {
        name: "Pro"
      }
    });

    const listResponse = await agent.get("/tenants");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0]).toMatchObject({
      id: createdTenant.id,
      name: "Acme Corp"
    });

    const detailResponse = await agent.get(`/tenants/${createdTenant.id}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data).toMatchObject({
      id: createdTenant.id,
      name: "Acme Corp",
      plan: {
        id: planResponse.body.data.id,
        name: "Pro"
      }
    });

    const updateResponse = await agent.patch(`/tenants/${createdTenant.id}`).send({
      name: "Acme Platform",
      planId: planResponse.body.data.id,
      status: "SUSPENDED"
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data).toMatchObject({
      id: createdTenant.id,
      name: "Acme Platform",
      status: "SUSPENDED",
      plan: {
        name: "Pro"
      }
    });
  });
});
