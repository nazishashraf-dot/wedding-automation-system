import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler, notFound, validateBody } from "../errors";
import { requireOwner } from "../middleware/auth";
import { normalizeTableAssignment, param } from "../utils";

const router = Router();

const guestRsvpStatusEnum = z.enum(["pending", "attending", "declined"]);

const updateGuestSchema = z.object({
  fullName: z.string().min(1, "fullName is required").optional(),
  partySize: z.coerce.number().int().positive().optional(),
  rsvpStatus: guestRsvpStatusEnum.optional(),
  mealChoice: z.string().optional(),
  tableAssignment: z.string().optional(),
  contactEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

router.patch(
  "/:id",
  validateBody(updateGuestSchema),
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const existing = await prisma.guest.findUnique({ where: { id } });
    if (!existing) throw notFound("Guest");

    const data = { ...req.body };
    if (data.tableAssignment) data.tableAssignment = normalizeTableAssignment(data.tableAssignment);

    const guest = await prisma.guest.update({ where: { id }, data });
    res.json(guest);
  })
);

router.delete(
  "/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const existing = await prisma.guest.findUnique({ where: { id } });
    if (!existing) throw notFound("Guest");

    await prisma.guest.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
