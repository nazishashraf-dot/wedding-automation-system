import jwt from "jsonwebtoken";
import { CookieOptions, Response } from "express";

export type Role = "owner" | "assistant";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

// The browser only ever talks to the frontend's own origin — Vercel proxies
// /api/* to this server (see web/next.config.mjs) — so the cookie is
// first-party and Lax is enough even though this API and the frontend live
// on different domains. `secure` still needs to be off for local http dev.
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export function signSessionToken(user: AuthUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "7d" });
}

export function verifySessionToken(token: string): AuthUser {
  return jwt.verify(token, getJwtSecret()) as AuthUser;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
}
