import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { AppError, asyncHandler, notFound, validateBody } from "../errors";
import { requireOwner } from "../middleware/auth";
import { param, withPaymentOverdueFlag } from "../utils";

const router = Router();

const paymentDirectionEnum = z.enum(["incoming", "outgoing"]);
const paymentStatusEnum = z.enum(["pending", "paid"]);

const updatePaymentSchema = z.object({
  vendorId: z.string().uuid().nullable().optional(),
  description: z.string().min(1, "description is required").optional(),
  amount: z.coerce.number().positive("amount must be greater than 0").optional(),
  dueDate: z.coerce.date().optional(),
  paidDate: z.coerce.date().nullable().optional(),
  status: paymentStatusEnum.optional(),
  method: z.string().optional(),
  notes: z.string().optional(),
});

const vendorSelect = { select: { id: true, name: true } } as const;
const weddingSummarySelect = {
  select: {
    id: true,
    weddingDate: true,
    client: { select: { id: true, fullName: true, partnerName: true } },
  },
} as const;

// Cross-wedding view, used by the dashboard (?overdue=true) — also accepts
// the same direction/status filters as the nested list for consistency.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { overdue, direction, status } = req.query;

    const where: { direction?: "incoming" | "outgoing"; status?: "pending" | "paid" } = {};
    if (direction !== undefined) {
      const parsed = paymentDirectionEnum.safeParse(direction);
      if (!parsed.success) throw new AppError(400, "Invalid direction filter", parsed.error.flatten());
      where.direction = parsed.data;
    }
    if (status !== undefined) {
      const parsed = paymentStatusEnum.safeParse(status);
      if (!parsed.success) throw new AppError(400, "Invalid status filter", parsed.error.flatten());
      where.status = parsed.data;
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: { vendor: vendorSelect, wedding: weddingSummarySelect },
    });

    let result = payments.map(withPaymentOverdueFlag);
    if (overdue !== undefined) {
      const wantOverdue = overdue === "true";
      result = result.filter((p) => p.overdue === wantOverdue);
    }
    res.json(result);
  })
);

router.patch(
  "/:id",
  validateBody(updatePaymentSchema),
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) throw notFound("Payment");

    if (req.body.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: req.body.vendorId } });
      if (!vendor) throw notFound("Vendor");
    }

    const data: Record<string, unknown> = { ...req.body };

    // Marking paid without an explicit paidDate stamps it now; reverting to
    // pending without an explicit paidDate clears it.
    if (data.status === "paid" && data.paidDate === undefined) {
      data.paidDate = new Date();
    } else if (data.status === "pending" && data.paidDate === undefined) {
      data.paidDate = null;
    }

    const payment = await prisma.payment.update({
      where: { id },
      data,
      include: { vendor: vendorSelect },
    });
    res.json(withPaymentOverdueFlag(payment));
  })
);

router.delete(
  "/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) throw notFound("Payment");

    await prisma.payment.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
