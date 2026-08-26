import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { AppError, asyncHandler, notFound, validateBody } from "../errors";
import { requireOwner } from "../middleware/auth";
import { getFrontendUrl, param, withOverdueFlag } from "../utils";
import { generateTimelineForWedding, recalculateAutoTaskDueDates } from "../timeline";
import { pushCalendarEventCreate } from "../googleCalendar";
import { TemplateNotFoundError, sendTemplatedEmail } from "../email";
import { formatDateForEmail } from "../templateVars";
import { deleteDocumentBlobs, documentUpload, uploadDocumentToBlob } from "../documents";

const router = Router();

const planningStatusEnum = z.enum([
  "inquiry",
  "booked",
  "in_progress",
  "final_month",
  "completed",
]);

const vendorLinkStatusEnum = z.enum(["contacted", "quoted", "confirmed"]);

const taskPriorityEnum = z.enum(["low", "medium", "high"]);

const createTaskSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  priority: taskPriorityEnum.optional(),
  assignee: z.string().optional(),
});

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

const calendarEventTypeEnum = z.enum([
  "milestone",
  "client_meeting",
  "vendor_meeting",
  "reminder",
]);

const createMeetingSchema = z.object({
  title: z.string().min(1, "title is required"),
  scheduledAt: z.coerce.date(),
  type: calendarEventTypeEnum.optional(),
});

const sendEmailSchema = z.object({
  templateKey: z.string().min(1, "templateKey is required"),
  recipientEmail: z.string().email("recipientEmail must be a valid email address"),
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
    await generateTimelineForWedding(wedding.id, wedding.weddingDate);
    res.status(201).json(wedding);
  })
);

router.patch(
  "/:id",
  validateBody(updateWeddingSchema),
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const existing = await prisma.wedding.findUnique({ where: { id } });
    if (!existing) throw notFound("Wedding");

    const wedding = await prisma.wedding.update({
      where: { id },
      data: req.body,
      include: weddingDetailInclude,
    });

    if (
      req.body.weddingDate &&
      existing.weddingDate.getTime() !== wedding.weddingDate.getTime()
    ) {
      await recalculateAutoTaskDueDates(id, wedding.weddingDate);
    }

    res.json(wedding);
  })
);

router.delete(
  "/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const existing = await prisma.wedding.findUnique({ where: { id } });
    if (!existing) throw notFound("Wedding");

    const documents = await prisma.document.findMany({ where: { weddingId: id } });
    if (documents.length > 0) {
      try {
        await deleteDocumentBlobs(documents.map((d) => d.fileUrl));
      } catch (err) {
        console.error("Failed to delete wedding documents from Blob storage:", err);
      }
    }

    // Wedding's child records (tasks, calendar events, email logs, vendor
    // links, documents) are RESTRICT by default, so they're cleared first —
    // this deletes the wedding and everything planned under it, but leaves
    // the client record itself untouched.
    await prisma.$transaction([
      prisma.emailLog.deleteMany({ where: { weddingId: id } }),
      prisma.calendarEvent.deleteMany({ where: { weddingId: id } }),
      prisma.task.deleteMany({ where: { weddingId: id } }),
      prisma.weddingVendor.deleteMany({ where: { weddingId: id } }),
      prisma.document.deleteMany({ where: { weddingId: id } }),
      prisma.wedding.delete({ where: { id } }),
    ]);
    res.status(204).send();
  })
);

router.post(
  "/:id/regenerate-timeline",
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const wedding = await prisma.wedding.findUnique({ where: { id } });
    if (!wedding) throw notFound("Wedding");

    const result = await generateTimelineForWedding(id, wedding.weddingDate);
    res.json(result);
  })
);

router.get(
  "/:id/tasks",
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "id");
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw notFound("Wedding");

    const tasks = await prisma.task.findMany({
      where: { weddingId },
      orderBy: { dueDate: "asc" },
    });
    res.json(tasks.map(withOverdueFlag));
  })
);

router.post(
  "/:id/tasks",
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "id");
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw notFound("Wedding");

    const task = await prisma.task.create({
      data: { ...req.body, weddingId, source: "manual", status: "todo" },
    });
    res.status(201).json(withOverdueFlag(task));
  })
);

router.get(
  "/:id/meetings",
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "id");
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw notFound("Wedding");

    const meetings = await prisma.calendarEvent.findMany({
      where: { weddingId },
      orderBy: { scheduledAt: "asc" },
    });
    res.json(meetings);
  })
);

router.post(
  "/:id/meetings",
  validateBody(createMeetingSchema),
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "id");
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw notFound("Wedding");

    const meeting = await prisma.calendarEvent.create({
      data: {
        weddingId,
        title: req.body.title,
        scheduledAt: req.body.scheduledAt,
        type: req.body.type ?? "client_meeting",
      },
    });

    try {
      const googleEventId = await pushCalendarEventCreate({
        title: meeting.title,
        scheduledAt: meeting.scheduledAt,
      });
      if (googleEventId) {
        const updated = await prisma.calendarEvent.update({
          where: { id: meeting.id },
          data: { googleEventId },
        });
        res.status(201).json(updated);
        return;
      }
    } catch (err) {
      console.error("Failed to push meeting to Google Calendar:", err);
    }

    res.status(201).json(meeting);
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

router.post(
  "/:id/send-email",
  validateBody(sendEmailSchema),
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "id");
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: { client: true },
    });
    if (!wedding) throw notFound("Wedding");

    const today = new Date();
    const daysUntilWedding = Math.round(
      (wedding.weddingDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
    );
    const frontendUrl = getFrontendUrl();

    try {
      const log = await sendTemplatedEmail({
        weddingId,
        templateKey: req.body.templateKey,
        recipientEmail: req.body.recipientEmail,
        vars: {
          clientName: wedding.client.fullName,
          partnerNameSuffix: wedding.client.partnerName ? ` & ${wedding.client.partnerName}` : "",
          weddingDate: formatDateForEmail(wedding.weddingDate),
          venue: wedding.venue ?? "",
          daysUntilWedding: String(daysUntilWedding),
          intakeFormLink: `${frontendUrl}/forms/intake/${weddingId}`,
        },
      });
      res.status(201).json(log);
    } catch (err) {
      if (err instanceof TemplateNotFoundError) {
        throw new AppError(404, err.message);
      }
      throw err;
    }
  })
);

router.get(
  "/:id/email-log",
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "id");
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw notFound("Wedding");

    const logs = await prisma.emailLog.findMany({
      where: { weddingId },
      orderBy: { sentAt: "desc" },
    });
    res.json(logs);
  })
);

const documentInclude = {
  uploadedBy: { select: { id: true, name: true } },
} as const;

router.get(
  "/:id/documents",
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "id");
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw notFound("Wedding");

    const documents = await prisma.document.findMany({
      where: { weddingId },
      orderBy: { uploadedAt: "desc" },
      include: documentInclude,
    });
    res.json(documents);
  })
);

router.post(
  "/:id/documents",
  documentUpload.single("file"),
  asyncHandler(async (req, res) => {
    const weddingId = param(req, "id");
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw notFound("Wedding");

    if (!req.file) throw new AppError(400, "No file provided");
    if (!req.user) throw new AppError(401, "Authentication required");

    const { url } = await uploadDocumentToBlob(
      weddingId,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype
    );

    const document = await prisma.document.create({
      data: {
        weddingId,
        fileName: req.file.originalname,
        fileUrl: url,
        fileType: req.file.mimetype,
        fileSizeBytes: req.file.size,
        uploadedById: req.user.id,
      },
      include: documentInclude,
    });
    res.status(201).json(document);
  })
);

export default router;
