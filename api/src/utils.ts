import { Request } from "express";

export function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL || "http://localhost:3000";
}

export function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function withOverdueFlag<T extends { dueDate: Date; status: string }>(
  task: T
): T & { overdue: boolean } {
  const overdue = task.status !== "done" && task.dueDate < startOfTodayUTC();
  return { ...task, overdue };
}

export function withPaymentOverdueFlag<T extends { dueDate: Date; status: string }>(
  payment: T
): T & { overdue: boolean } {
  const overdue = payment.status !== "paid" && payment.dueDate < startOfTodayUTC();
  return { ...payment, overdue };
}

// Guests are seated by a bare identifier ("6", "Head Table") — the UI is
// responsible for consistently prefixing "Table" when displaying it, so
// strip a redundant "Table" prefix here rather than storing whatever the
// user happened to type at creation/import time.
export function normalizeTableAssignment(raw: string): string {
  const trimmed = raw.trim();
  const stripped = trimmed.replace(/^table\s*[:#-]?\s*/i, "").trim();
  return stripped || trimmed;
}
