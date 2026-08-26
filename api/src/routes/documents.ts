import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler, notFound } from "../errors";
import { requireOwner } from "../middleware/auth";
import { param } from "../utils";
import { deleteDocumentBlobs } from "../documents";

const router = Router();

router.delete(
  "/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) throw notFound("Document");

    try {
      await deleteDocumentBlobs([document.fileUrl]);
    } catch (err) {
      console.error("Failed to delete document from Blob storage:", err);
    }

    await prisma.document.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
