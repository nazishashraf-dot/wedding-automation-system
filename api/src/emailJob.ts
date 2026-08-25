import { prisma } from "./db";
import { sendTemplatedEmail } from "./email";
import { startOfTodayUTC } from "./utils";
import { formatDateForEmail } from "./templateVars";

const REMINDER_TEMPLATE_KEY = "milestone_reminder";
const OVERDUE_TEMPLATE_KEY = "task_overdue";
const DUE_SOON_WINDOW_DAYS = 3;
const OVERDUE_RENUDGE_WINDOW_DAYS = 7;

export interface EmailJobResult {
  remindersSent: number;
  overdueNudgesSent: number;
  failed: number;
}

/**
 * Daily check: sends a due-soon reminder for tasks due within the next 3
 * days (once ever per task), and an overdue nudge for tasks overdue by 1+
 * days (at most once every 7 days per task, so long-overdue tasks get
 * re-nudged periodically rather than spammed). Safe to call repeatedly —
 * both checks look at EmailLog before sending.
 */
export async function runEmailJob(): Promise<EmailJobResult> {
  const today = startOfTodayUTC();
  const dueSoonCutoff = new Date(today.getTime() + DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const renudgeCutoff = new Date(
    today.getTime() - OVERDUE_RENUDGE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  let remindersSent = 0;
  let overdueNudgesSent = 0;
  let failed = 0;

  // --- Due-soon reminders ---
  const dueSoonTasks = await prisma.task.findMany({
    where: {
      status: { not: "done" },
      dueDate: { gte: today, lte: dueSoonCutoff },
    },
    include: { wedding: { include: { client: true } } },
  });

  for (const task of dueSoonTasks) {
    const alreadySent = await prisma.emailLog.findFirst({
      where: { relatedTaskId: task.id, templateKey: REMINDER_TEMPLATE_KEY },
    });
    if (alreadySent) continue;

    const client = task.wedding.client;
    if (!client.email) continue;

    try {
      const log = await sendTemplatedEmail({
        weddingId: task.weddingId,
        templateKey: REMINDER_TEMPLATE_KEY,
        recipientEmail: client.email,
        relatedTaskId: task.id,
        vars: {
          clientName: client.fullName,
          partnerNameSuffix: client.partnerName ? ` & ${client.partnerName}` : "",
          taskTitle: task.title,
          dueDate: formatDateForEmail(task.dueDate),
          weddingDate: formatDateForEmail(task.wedding.weddingDate),
        },
      });
      if (log.status === "sent") remindersSent++;
      else failed++;
    } catch (err) {
      failed++;
      console.error(`Failed to send due-soon reminder for task ${task.id}:`, err);
    }
  }

  // --- Overdue nudges ---
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { not: "done" },
      dueDate: { lt: today },
    },
    include: { wedding: { include: { client: true } } },
  });

  for (const task of overdueTasks) {
    const recentNudge = await prisma.emailLog.findFirst({
      where: {
        relatedTaskId: task.id,
        templateKey: OVERDUE_TEMPLATE_KEY,
        sentAt: { gte: renudgeCutoff },
      },
    });
    if (recentNudge) continue;

    const client = task.wedding.client;
    if (!client.email) continue;

    const daysOverdue = Math.floor(
      (today.getTime() - task.dueDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    try {
      const log = await sendTemplatedEmail({
        weddingId: task.weddingId,
        templateKey: OVERDUE_TEMPLATE_KEY,
        recipientEmail: client.email,
        relatedTaskId: task.id,
        vars: {
          clientName: client.fullName,
          partnerNameSuffix: client.partnerName ? ` & ${client.partnerName}` : "",
          taskTitle: task.title,
          dueDate: formatDateForEmail(task.dueDate),
          weddingDate: formatDateForEmail(task.wedding.weddingDate),
          daysOverdue: String(daysOverdue),
        },
      });
      if (log.status === "sent") overdueNudgesSent++;
      else failed++;
    } catch (err) {
      failed++;
      console.error(`Failed to send overdue nudge for task ${task.id}:`, err);
    }
  }

  return { remindersSent, overdueNudgesSent, failed };
}
