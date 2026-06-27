import type { NextFunction, Request, Response } from "express";
import { ApiCode } from "../lib/apiResponse.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { hashSessionToken, readCookie, sessionCookieName } from "../lib/session.js";

export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  const token = readCookie(req.headers.cookie, sessionCookieName);

  if (!token) {
    next(new AppError(401, ApiCode.NOT_AUTHENTICATED, "Login is required"));
    return;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    next(new AppError(401, ApiCode.NOT_AUTHENTICATED, "Login is required"));
    return;
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role
  };
  next();
}

export function requireRole(roles: Array<"ADMIN" | "OPERATOR" | "VIEWER">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError(403, ApiCode.FORBIDDEN, "Insufficient permissions"));
      return;
    }

    next();
  };
}
