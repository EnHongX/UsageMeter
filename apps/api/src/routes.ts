import { Router } from "express";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { apiKeysRouter } from "./modules/apiKeys/apiKeys.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { billingRouter } from "./modules/billing/billing.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { plansRouter } from "./modules/plans/plans.routes.js";
import { protectedApiRouter } from "./modules/protectedApi/protected.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { tenantsRouter } from "./modules/tenants/tenants.routes.js";
import { usageRouter } from "./modules/usage/usage.routes.js";
import { requireUser } from "./middleware/requireUser.js";

export const routes = Router();

routes.use("/health", healthRouter);
routes.use("/auth", authRouter);
routes.use("/api/v1", protectedApiRouter);
routes.use(requireUser);
routes.use("/tenants", tenantsRouter);
routes.use("/plans", plansRouter);
routes.use("/api-keys", apiKeysRouter);
routes.use("/usage", usageRouter);
routes.use("/billing", billingRouter);
routes.use("/settings", settingsRouter);
routes.use("/audit-logs", auditRouter);
