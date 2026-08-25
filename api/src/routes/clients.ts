import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler, notFound, validateBody } from "../errors";
import { param } from "../utils";

const router = Router();

const clientStatusEnum = z.enum(["lead", "active", "completed", "archived"]);

const createClientSchema = z.object({
  fullName: z.string().min(1, "fullName is required"),
  partnerName: z.string().optional(),
  email: z.string().email("email must be a valid email address"),
  phone: z.string().optional(),
  status: clientStatusEnum.optional(),
  notes: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        weddings: {
          select: { id: true, weddingDate: true, planningStatus: true },
        },
      },
    });
    res.json(clients);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: param(req, "id") },
      include: { weddings: true },
    });
    if (!client) throw notFound("Client");
    res.json(client);
  })
);

router.post(
  "/",
  validateBody(createClientSchema),
  asyncHandler(async (req, res) => {
    const client = await prisma.client.create({ data: req.body });
    res.status(201).json(client);
  })
);

router.patch(
  "/:id",
  validateBody(updateClientSchema),
  asyncHandler(async (req, res) => {
    const client = await prisma.client.update({
      where: { id: param(req, "id") },
      data: req.body,
    });
    res.json(client);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.client.delete({ where: { id: param(req, "id") } });
    res.status(204).send();
  })
);

export default router;
