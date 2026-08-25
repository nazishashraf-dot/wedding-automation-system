import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { AppError, asyncHandler, validateBody } from "../errors";
import { param, withOverdueFlag } from "../utils";

const router = Router();

const taskStatusEnum = z.enum(["todo", "in_progress", "done"]);
const taskPriorityEnum = z.enum(["low", "medium", "high"]);

const updateTaskSchema = z.object({
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  assignee: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, overdue } = req.query;

    const where: { status?: z.infer<typeof taskStatusEnum> } = {};
    if (status !== undefined) {
      const parsed = taskStatusEnum.safeParse(status);
      if (!parsed.success) {
        throw new AppError(400, "Invalid status filter", parsed.error.flatten());
      }
      where.status = parsed.data;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        wedding: {
          select: {
            id: true,
            weddingDate: true,
            client: { select: { id: true, fullName: true, partnerName: true } },
          },
        },
      },
    });

    let result = tasks.map(withOverdueFlag);

    if (overdue !== undefined) {
      const wantOverdue = overdue === "true";
      result = result.filter((t) => t.overdue === wantOverdue);
    }

    res.json(result);
  })
);

router.patch(
  "/:id",
  validateBody(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.update({
      where: { id: param(req, "id") },
      data: req.body,
    });
    res.json(withOverdueFlag(task));
  })
);

export default router;
