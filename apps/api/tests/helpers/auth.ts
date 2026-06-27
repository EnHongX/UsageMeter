import request from "supertest";
import type { Express } from "express";

export async function createAuthenticatedAgent(app: Express) {
  const agent = request.agent(app);

  await agent.post("/auth/register").send({
    email: "admin@usagemeter.local",
    name: "平台管理员",
    password: "Password123!"
  });

  return agent;
}
