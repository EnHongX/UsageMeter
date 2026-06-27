import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ApiCode, fail } from "./lib/apiResponse.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { routes } from "./routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: "http://localhost:7611",
      credentials: true
    })
  );
  app.use(express.json());
  app.use(requestLogger);
  app.use(routes);
  app.use((_req, res) => {
    fail(res, 404, ApiCode.NOT_FOUND, "Route not found", null);
  });
  app.use(errorHandler);

  return app;
}
