import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, ZodType } from "zod";
import multer from "multer";

export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(entity: string): AppError {
  return new AppError(404, `${entity} not found`);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(400, "Validation failed", result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: "Validation failed", details: err.flatten() } });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large (max 10MB)"
        : `Upload failed: ${err.message}`;
    res.status(400).json({ error: { message } });
    return;
  }

  // Prisma "record not found" style errors
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "P2025") {
      res.status(404).json({ error: { message: "Record not found" } });
      return;
    }
    if (code === "P2002") {
      res.status(409).json({ error: { message: "A record with this value already exists" } });
      return;
    }
    if (code === "P2003") {
      res
        .status(409)
        .json({ error: { message: "This record is still referenced by other data" } });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: { message: "Internal server error" } });
}
