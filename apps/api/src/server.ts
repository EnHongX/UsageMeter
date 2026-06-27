import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const app = createApp();

app.listen(env.API_PORT, () => {
  logger.info(`UsageMeter API listening on http://localhost:${env.API_PORT}`);
});
