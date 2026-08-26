import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../errors";
import { startOfTodayUTC } from "../utils";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW_DAYS = 90;
const WEEK_WINDOW_DAYS = 7;
const ATTENTION_WINDOW_DAYS = 60;
const ATTENTION_OVERDUE_THRESHOLD = 3;

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

const clientSelect = { select: { id: true, fullName: true, partnerName: true } } as const;

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const today = startOfTodayUTC();
    const tomorrow = new Date(today.getTime() + DAY_MS);
    const ninetyDaysOut = new Date(today.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS);
    const sevenDaysOut = new Date(today.getTime() + WEEK_WINDOW_DAYS * DAY_MS);
    const sixtyDaysOut = new Date(today.getTime() + ATTENTION_WINDOW_DAYS * DAY_MS);

    const upcomingWeddingsRaw = await prisma.wedding.findMany({
      where: { weddingDate: { gte: today, lte: ninetyDaysOut } },
      orderBy: { weddingDate: "asc" },
      include: { client: clientSelect },
    });
    const overdueTasksRaw = await prisma.task.findMany({
      where: { status: { not: "done" }, dueDate: { lt: today } },
      orderBy: { dueDate: "asc" },
      include: { wedding: { include: { client: clientSelect } } },
    });
    const todayMeetingsRaw = await prisma.calendarEvent.findMany({
      where: { scheduledAt: { gte: today, lt: tomorrow } },
      orderBy: { scheduledAt: "asc" },
      include: { wedding: { include: { client: clientSelect } } },
    });
    const weekMeetingsRaw = await prisma.calendarEvent.findMany({
      where: { scheduledAt: { gte: today, lte: sevenDaysOut } },
      orderBy: { scheduledAt: "asc" },
      include: { wedding: { include: { client: clientSelect } } },
    });
    const attentionCandidates = await prisma.wedding.findMany({
      where: { weddingDate: { gte: today, lte: sixtyDaysOut } },
      include: { client: clientSelect, vendors: true, tasks: true },
    });

    const upcomingWeddings = upcomingWeddingsRaw.map((w) => ({
      id: w.id,
      weddingDate: w.weddingDate,
      venue: w.venue,
      planningStatus: w.planningStatus,
      daysUntil: daysBetween(today, w.weddingDate),
      client: w.client,
    }));

    const overdueTasks = overdueTasksRaw.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      daysOverdue: daysBetween(t.dueDate, today),
      wedding: {
        id: t.wedding.id,
        weddingDate: t.wedding.weddingDate,
        client: t.wedding.client,
      },
    }));

    const mapMeeting = (m: (typeof todayMeetingsRaw)[number]) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      scheduledAt: m.scheduledAt,
      wedding: { id: m.wedding.id, weddingDate: m.wedding.weddingDate, client: m.wedding.client },
    });

    const needsAttention = attentionCandidates
      .map((w) => {
        const confirmedVendorCount = w.vendors.filter((v) => v.status === "confirmed").length;
        const overdueTaskCount = w.tasks.filter(
          (t) => t.status !== "done" && t.dueDate < today
        ).length;

        const reasons: string[] = [];
        if (confirmedVendorCount === 0) reasons.push("No vendors confirmed yet");
        if (overdueTaskCount >= ATTENTION_OVERDUE_THRESHOLD) {
          reasons.push(`${overdueTaskCount} overdue tasks`);
        }

        return {
          weddingId: w.id,
          weddingDate: w.weddingDate,
          daysUntil: daysBetween(today, w.weddingDate),
          client: w.client,
          reasons,
        };
      })
      .filter((w) => w.reasons.length > 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    res.json({
      upcomingWeddings,
      overdueTasks,
      todayMeetings: todayMeetingsRaw.map(mapMeeting),
      weekMeetings: weekMeetingsRaw.map(mapMeeting),
      needsAttention,
    });
  })
);

export default router;
