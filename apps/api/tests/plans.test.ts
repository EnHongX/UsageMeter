import { createApp } from "../src/app.js";
import { resetDatabase } from "./helpers/database.js";
import { createAuthenticatedAgent } from "./helpers/auth.js";

describe("plans", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates and lists subscription plans", async () => {
    const app = createApp();
    const agent = await createAuthenticatedAgent(app);

    const createResponse = await agent.post("/plans").send({
      name: "Growth",
      monthlyBaseFee: 4900,
      includedUnits: 50000,
      dailyUnitLimit: 5000,
      overageUnitPrice: 150
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      code: "CREATED",
      message: "created",
      data: {
        name: "Growth",
        monthlyBaseFee: 4900,
        includedUnits: 50000,
        dailyUnitLimit: 5000,
        overageUnitPrice: 150
      }
    });
    const createdPlan = createResponse.body.data;
    expect(createdPlan).toMatchObject({
      name: "Growth",
      monthlyBaseFee: 4900,
      includedUnits: 50000,
      dailyUnitLimit: 5000,
      overageUnitPrice: 150
    });

    const listResponse = await agent.get("/plans");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0]).toMatchObject({
      id: createdPlan.id,
      name: "Growth"
    });

    const updateResponse = await agent.patch(`/plans/${createdPlan.id}`).send({
      name: "Growth Plus",
      dailyUnitLimit: 8000
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data).toMatchObject({
      id: createdPlan.id,
      name: "Growth Plus",
      dailyUnitLimit: 8000
    });
  });
});
