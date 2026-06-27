import { Router } from "express";
import { z } from "zod";
import { ApiCode, created, ok } from "../../lib/apiResponse.js";
import { writeAuditLog } from "../../lib/audit.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { clearSessionCookie, generateSessionToken, getSessionExpiresAt, hashSessionToken, setSessionCookie } from "../../lib/session.js";
import { requireUser } from "../../middleware/requireUser.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

function publicUser(user: { id: string; email: string; name: string; role: "ADMIN" | "OPERATOR" | "VIEWER" }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

async function isRegistrationAllowed() {
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    return true;
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { key: "allowRegistration" }
  });

  return setting?.value === "true";
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);

    if (!(await isRegistrationAllowed())) {
      throw new AppError(403, ApiCode.REGISTRATION_DISABLED, "Registration is disabled");
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (existing) {
      throw new AppError(409, ApiCode.EMAIL_EXISTS, "Email already exists");
    }

    const userCount = await prisma.user.count();
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: await hashPassword(input.password),
        role: userCount === 0 ? "ADMIN" : "OPERATOR"
      }
    });
    const token = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: getSessionExpiresAt()
      }
    });
    setSessionCookie(res, token);
    await writeAuditLog({
      userId: user.id,
      action: "register",
      resource: "user",
      resourceId: user.id
    });

    created(res, { user: publicUser(user) });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (!user || user.status !== "ACTIVE" || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(401, ApiCode.INVALID_CREDENTIALS, "Invalid email or password");
    }

    const token = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: getSessionExpiresAt()
      }
    });
    setSessionCookie(res, token);
    await writeAuditLog({
      userId: user.id,
      action: "login",
      resource: "session"
    });

    ok(res, { user: publicUser(user) });
  })
);

authRouter.post(
  "/logout",
  requireUser,
  asyncHandler(async (req, res) => {
    await prisma.session.deleteMany({
      where: { userId: req.user?.id }
    });
    clearSessionCookie(res);
    ok(res, null, "logged out");
  })
);

authRouter.get(
  "/me",
  requireUser,
  asyncHandler(async (req, res) => {
    ok(res, { user: req.user });
  })
);

authRouter.patch(
  "/password",
  requireUser,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user?.id }
    });

    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new AppError(400, ApiCode.INVALID_CURRENT_PASSWORD, "Current password is invalid");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(input.newPassword)
      }
    });
    await writeAuditLog({
      userId: user.id,
      action: "change_password",
      resource: "user",
      resourceId: user.id
    });

    ok(res, null, "password changed");
  })
);
