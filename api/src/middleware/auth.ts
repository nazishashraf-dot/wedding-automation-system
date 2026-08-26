import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";
import { AuthUser, SESSION_COOKIE_NAME, verifySessionToken } from "../auth/tokens";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token !== "string" || !token) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  try {
    req.user = verifySessionToken(token);
    next();
  } catch {
    next(new AppError(401, "Invalid or expired session"));
  }
}

export function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== "owner") {
    next(new AppError(403, "This action requires owner access"));
    return;
  }
  next();
}
