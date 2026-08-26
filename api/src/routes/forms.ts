import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler, notFound, validateBody } from "../errors";
import { param } from "../utils";

const router = Router();

// Public, unauthenticated: reachable via a shareable link
// (/forms/intake/[weddingId]) sent to the couple. Deliberately scoped to a
// small, safe subset of fields — never exposes or accepts internal-only data
// like budgets, status, or the client's email (kept planner-managed since
// it's the channel automated emails go to).
const intakeSubmissionSchema = z.object({
  partnerName: z.string().optional(),
  phone: z.string().optional(),
  guestCountEstimate: z.coerce.number().int().nonnegative().optional(),
  styleNotes: z.string().optional(),
  intakeNotes: z.string().optional(),
});

router.get(
  "/intake/:weddingId",
  asyncHandler(async (req, res) => {
    const wedding = await prisma.wedding.findUnique({
      where: { id: param(req, "weddingId") },
      include: { client: { select: { fullName: true, partnerName: true, phone: true } } },
    });
    if (!wedding) throw notFound("Wedding");

    res.json({
      weddingId: wedding.id,
      fullName: wedding.client.fullName,
      partnerName: wedding.client.partnerName,
      phone: wedding.client.phone,
      weddingDate: wedding.weddingDate,
      venue: wedding.venue,
      guestCountEstimate: wedding.guestCountEstimate,
      styleNotes: wedding.styleNotes,
      intakeNotes: wedding.intakeNotes,
    });
  })
);

router.post(
  "/intake/:weddingId",
  validateBody(intakeSubmissionSchema),
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "weddingId");
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw notFound("Wedding");

    const { partnerName, phone, ...weddingFields } = req.body as z.infer<
      typeof intakeSubmissionSchema
    >;

    await prisma.$transaction([
      prisma.client.update({
        where: { id: wedding.clientId },
        data: {
          ...(partnerName !== undefined ? { partnerName } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      }),
      prisma.wedding.update({
        where: { id: weddingId },
        data: { ...weddingFields, intakeSubmittedAt: new Date() },
      }),
    ]);

    res.json({ success: true });
  })
);

export default router;
