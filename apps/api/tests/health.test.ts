import request from "supertest";
import { createApp } from "../src/app.js";

describe("health", () => {
  it("returns service health", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code: "OK",
      message: "success",
      data: {
        status: "ok",
        service: "usagemeter-api"
      }
    });
  });
});
