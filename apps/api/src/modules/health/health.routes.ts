import { Router } from "express";
import { ok } from "../../lib/apiResponse.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  ok(res, {
    status: "ok",
    service: "usagemeter-api"
  });
});
