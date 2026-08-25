import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler, notFound, validateBody } from "../errors";
import { param } from "../utils";

const router = Router();

const planningStatusEnum = z.enum([
  "inquiry",
  "booked",
  "in_progress",
  "final_month",
  "completed",
]);

const vendorLinkStatusEnum = z.enum(["contacted", "quoted", "confirmed"]);

const createWeddingSchema = z.object({
  clientId: z.string().uuid("clientId must be a valid UUID"),
  weddingDate: z.coerce.date(),
  venue: z.string().optional(),
  budgetTotal: z.coerce.number().nonnegative().optional(),
  budgetSpent: z.coerce.number().nonnegative().optional(),
  planningStatus: planningStatusEnum.optional(),
  styleNotes: z.string().optional(),
});

const updateWeddingSchema = z.object({
  weddingDate: z.coerce.date().optional(),
  venue: z.string().optional(),
  budgetTotal: z.coerce.number().nonnegative().optional(),
  budgetSpent: z.coerce.number().nonnegative().optional(),
  planningStatus: planningStatusEnum.optional(),
  styleNotes: z.string().optional(),
});

const linkVendorSchema = z.object({
  vendorId: z.string().uuid("vendorId must be a valid UUID"),
  status: vendorLinkStatusEnum.optional(),
  priceQuoted: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const updateVendorLinkSchema = z.object({
  status: vendorLinkStatusEnum.optional(),
  priceQuoted: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const weddingDetailInclude = {
  client: true,
  vendors: {
    include: { vendor: true },
  },
} as const;

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const weddings = await prisma.wedding.findMany({
      orderBy: { weddingDate: "asc" },
      include: {
        client: { select: { id: true, fullName: true, partnerName: true } },
      },
    });
    res.json(weddings);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const wedding = await prisma.wedding.findUnique({
      where: { id: param(req, "id") },
      include: weddingDetailInclude,
    });
    if (!wedding) throw notFound("Wedding");
    res.json(wedding);
  })
);

router.post(
  "/",
  validateBody(createWeddingSchema),
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({ where: { id: req.body.clientId } });
    if (!client) throw notFound("Client");

    const wedding = await prisma.wedding.create({
      data: req.body,
      include: weddingDetailInclude,
    });
    res.status(201).json(wedding);
  })
);

router.patch(
  "/:id",
  validateBody(updateWeddingSchema),
  asyncHandler(async (req, res) => {
    const wedding = await prisma.wedding.update({
      where: { id: param(req, "id") },
      data: req.body,
      include: weddingDetailInclude,
    });
    res.json(wedding);
  })
);

router.post(
  "/:id/vendors",
  validateBody(linkVendorSchema),
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "id");
    const { vendorId, ...rest } = req.body as z.infer<typeof linkVendorSchema>;

    const [wedding, vendor] = await Promise.all([
      prisma.wedding.findUnique({ where: { id: weddingId } }),
      prisma.vendor.findUnique({ where: { id: vendorId } }),
    ]);
    if (!wedding) throw notFound("Wedding");
    if (!vendor) throw notFound("Vendor");

    const link = await prisma.weddingVendor.create({
      data: { weddingId, vendorId, ...rest },
      include: { vendor: true },
    });
    res.status(201).json(link);
  })
);

router.patch(
  "/:weddingId/vendors/:vendorId",
  validateBody(updateVendorLinkSchema),
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "weddingId");
    const vendorId = param(req, "vendorId");
    const link = await prisma.weddingVendor.update({
      where: { weddingId_vendorId: { weddingId, vendorId } },
      data: req.body,
      include: { vendor: true },
    });
    res.json(link);
  })
);

export default router;
