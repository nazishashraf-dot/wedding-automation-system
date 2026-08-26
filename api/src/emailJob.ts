import { prisma } from "./db";
import { sendTemplatedEmail } from "./email";
import { startOfTodayUTC } from "./utils";
import { formatDateForEmail, formatMoneyForEmail } from "./templateVars";

const REMINDER_TEMPLATE_KEY = "milestone_reminder";
const OVERDUE_TEMPLATE_KEY = "task_overdue";
const PAYMENT_REMINDER_TEMPLATE_KEY = "payment_reminder";
const DUE_SOON_WINDOW_DAYS = 3;
const OVERDUE_RENUDGE_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface EmailJobResult {
  remindersSent: number;
  overdueNudgesSent: number;
  paymentRemindersSent: number;
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
  let paymentRemindersSent = 0;
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

  // --- Payment reminders (due-soon and overdue share one template/key —
  // a single reminder cadence of at most once every 7 days per payment,
  // starting as soon as it enters the 3-day due-soon window). Incoming
  // (owed by the couple) go to the client; outgoing (owed to a vendor) go
  // to the vendor, if they have a contact email on file. ---
  const reminderCandidates = await prisma.payment.findMany({
    where: { status: "pending", dueDate: { lte: dueSoonCutoff } },
    include: { wedding: { include: { client: true } }, vendor: true },
  });

  for (const payment of reminderCandidates) {
    const recentReminder = await prisma.emailLog.findFirst({
      where: {
        relatedPaymentId: payment.id,
        templateKey: PAYMENT_REMINDER_TEMPLATE_KEY,
        sentAt: { gte: renudgeCutoff },
      },
    });
    if (recentReminder) continue;

    const recipientEmail =
      payment.direction === "incoming" ? payment.wedding.client.email : payment.vendor?.contactEmail;
    if (!recipientEmail) continue;

    const recipientName =
      payment.direction === "incoming" ? payment.wedding.client.fullName : payment.vendor?.name ?? "there";

    const isOverdue = payment.dueDate < today;
    const daysOverdue = isOverdue
      ? Math.floor((today.getTime() - payment.dueDate.getTime()) / DAY_MS)
      : 0;

    try {
      const log = await sendTemplatedEmail({
        weddingId: payment.weddingId,
        templateKey: PAYMENT_REMINDER_TEMPLATE_KEY,
        recipientEmail,
        relatedPaymentId: payment.id,
        vars: {
          recipientName,
          description: payment.description,
          amount: formatMoneyForEmail(payment.amount),
          dueDate: formatDateForEmail(payment.dueDate),
          weddingDate: formatDateForEmail(payment.wedding.weddingDate),
          statusNote: isOverdue
            ? ` This payment is now ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue.`
            : "",
        },
      });
      if (log.status === "sent") paymentRemindersSent++;
      else failed++;
    } catch (err) {
      failed++;
      console.error(`Failed to send payment reminder for payment ${payment.id}:`, err);
    }
  }

  return { remindersSent, overdueNudgesSent, paymentRemindersSent, failed };
}
