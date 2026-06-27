import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

export function generateApiKey() {
  return `sk_live_${randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(apiKey: string) {
  return createHash("sha256").update(`${env.API_KEY_PEPPER}:${apiKey}`).digest("hex");
}

export function getApiKeyPrefix(apiKey: string) {
  return apiKey.slice(0, 16);
}
