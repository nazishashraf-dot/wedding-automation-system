import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { AppError, asyncHandler, notFound, validateBody } from "../errors";
import { requireOwner } from "../middleware/auth";
import { param } from "../utils";

const router = Router();

const vendorCategoryEnum = z.enum([
  "florist",
  "caterer",
  "venue",
  "photographer",
  "dj_band",
  "hair_makeup",
  "other",
]);

const createVendorSchema = z.object({
  name: z.string().min(1, "name is required"),
  category: vendorCategoryEnum,
  contactEmail: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const updateVendorSchema = createVendorSchema.partial();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category } = req.query;
    if (category !== undefined) {
      const parsed = vendorCategoryEnum.safeParse(category);
      if (!parsed.success) {
        throw new AppError(400, "Invalid category filter", parsed.error.flatten());
      }
      const vendors = await prisma.vendor.findMany({
        where: { category: parsed.data },
        orderBy: { name: "asc" },
      });
      res.json(vendors);
      return;
    }

    const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
    res.json(vendors);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const vendor = await prisma.vendor.findUnique({ where: { id: param(req, "id") } });
    if (!vendor) throw notFound("Vendor");
    res.json(vendor);
  })
);

router.post(
  "/",
  validateBody(createVendorSchema),
  asyncHandler(async (req, res) => {
    const vendor = await prisma.vendor.create({ data: req.body });
    res.status(201).json(vendor);
  })
);

router.patch(
  "/:id",
  validateBody(updateVendorSchema),
  asyncHandler(async (req, res) => {
    const vendor = await prisma.vendor.update({
      where: { id: param(req, "id") },
      data: req.body,
    });
    res.json(vendor);
  })
);

router.delete(
  "/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw notFound("Vendor");

    // Vendor's wedding links are RESTRICT by default, so clear them first.
    await prisma.$transaction([
      prisma.weddingVendor.deleteMany({ where: { vendorId: id } }),
      prisma.vendor.delete({ where: { id } }),
    ]);
    res.status(204).send();
  })
);

export default router;
