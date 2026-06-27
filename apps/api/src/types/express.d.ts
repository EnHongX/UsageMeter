import type { ApiKey, Tenant } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        apiKey: ApiKey;
        tenant: Tenant;
      };
      user?: {
        id: string;
        email: string;
        name: string;
        role: "ADMIN" | "OPERATOR" | "VIEWER";
      };
    }
  }
}

export {};
