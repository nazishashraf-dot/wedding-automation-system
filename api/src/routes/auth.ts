import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { AppError, asyncHandler, validateBody } from "../errors";
import { requireAuth, requireOwner } from "../middleware/auth";
import { hashPassword, verifyPassword } from "../auth/passwords";
import { clearSessionCookie, setSessionCookie, signSessionToken } from "../auth/tokens";
import {
  getAuthUrl,
  getConnectionStatus,
  handleOAuthCallback,
  isGoogleConfigured,
} from "../googleCalendar";
import { getFrontendUrl } from "../utils";

const router = Router();

const roleEnum = z.enum(["owner", "assistant"]);

const registerSchema = z.object({
  name: z.string().min(1, "name is required"),
  email: z.string().email("email must be a valid email address"),
  password: z.string().min(8, "password must be at least 8 characters"),
  role: roleEnum.optional(),
});

const loginSchema = z.object({
  email: z.string().email("email must be a valid email address"),
  password: z.string().min(1, "password is required"),
});

function toPublicUser(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

// Owner-only: invites a new team member (owner or assistant).
router.post(
  "/register",
  requireAuth,
  requireOwner,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (existing) throw new AppError(409, "A user with this email already exists");

    const passwordHash = await hashPassword(req.body.password);
    const user = await prisma.user.create({
      data: {
        name: req.body.name,
        email: req.body.email,
        passwordHash,
        role: req.body.role ?? "assistant",
      },
    });
    res.status(201).json(toPublicUser(user));
  })
);

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) throw new AppError(401, "Invalid email or password");

    const valid = await verifyPassword(req.body.password, user.passwordHash);
    if (!valid) throw new AppError(401, "Invalid email or password");

    const token = signSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    setSessionCookie(res, token);
    res.json(toPublicUser(user));
  })
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res);
    res.json({ success: true });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  })
);

// Owner-only: list of team members for the /settings/team page.
router.get(
  "/users",
  requireAuth,
  requireOwner,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json(users);
  })
);

router.get(
  "/google",
  requireAuth,
  asyncHandler(async (_req, res) => {
    if (!isGoogleConfigured()) {
      throw new AppError(
        500,
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in api/.env."
      );
    }
    res.redirect(getAuthUrl());
  })
);

router.get(
  "/google/callback",
  requireAuth,
  asyncHandler(async (req, res) => {
    const code = req.query.code;
    if (typeof code !== "string") {
      throw new AppError(400, "Missing authorization code");
    }

    const frontendUrl = getFrontendUrl();

    try {
      await handleOAuthCallback(code);
      res.redirect(`${frontendUrl}/settings?connected=1`);
    } catch (err) {
      console.error("Google OAuth callback failed:", err);
      res.redirect(`${frontendUrl}/settings?connected=0`);
    }
  })
);

router.get(
  "/google/status",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const status = await getConnectionStatus();
    res.json(status);
  })
);

export default router;
