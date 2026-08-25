import { prisma } from "./db";
import { startOfTodayUTC } from "./utils";
import { pushCalendarEventCreate, pushCalendarEventUpdate } from "./googleCalendar";

function subtractMonthsUTC(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

function subtractWeeksUTC(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - weeks * 7);
  return d;
}

interface RuleInterval {
  monthsBeforeWedding: number | null;
  weeksBeforeWedding: number | null;
}

function computeDueDate(weddingDate: Date, rule: RuleInterval): Date {
  if (rule.monthsBeforeWedding !== null && rule.monthsBeforeWedding !== undefined) {
    return subtractMonthsUTC(weddingDate, rule.monthsBeforeWedding);
  }
  if (rule.weeksBeforeWedding !== null && rule.weeksBeforeWedding !== undefined) {
    return subtractWeeksUTC(weddingDate, rule.weeksBeforeWedding);
  }
  return new Date(weddingDate);
}

export interface TimelineGenerationResult {
  created: number;
  skippedPast: number;
  skippedExisting: number;
}

/**
 * Generates auto-generated Tasks for a wedding from the active TimelineRule
 * template. Idempotent: a rule that already has a matching auto-generated
 * task for this wedding (tracked via timelineRuleId) is skipped, so calling
 * this repeatedly never creates duplicates.
 */
export async function generateTimelineForWedding(
  weddingId: string,
  weddingDate: Date
): Promise<TimelineGenerationResult> {
  const [rules, existingAutoTasks] = await Promise.all([
    prisma.timelineRule.findMany({ where: { isActive: true } }),
    prisma.task.findMany({
      where: { weddingId, source: "auto_generated", timelineRuleId: { not: null } },
      select: { timelineRuleId: true },
    }),
  ]);

  const existingRuleIds = new Set(existingAutoTasks.map((t) => t.timelineRuleId));
  const today = startOfTodayUTC();

  let created = 0;
  let skippedPast = 0;
  let skippedExisting = 0;

  for (const rule of rules) {
    if (existingRuleIds.has(rule.id)) {
      skippedExisting++;
      continue;
    }

    const dueDate = computeDueDate(weddingDate, rule);
    if (dueDate < today) {
      skippedPast++;
      continue;
    }

    const task = await prisma.task.create({
      data: {
        weddingId,
        timelineRuleId: rule.id,
        title: rule.taskTitle,
        description: rule.taskDescription,
        dueDate,
        priority: rule.defaultPriority,
        status: "todo",
        source: "auto_generated",
      },
    });
    created++;

    if (rule.createsCalendarEvent) {
      await createCalendarEventForTask(weddingId, task.id, {
        title: rule.taskTitle,
        scheduledAt: dueDate,
        type: rule.calendarEventType ?? "milestone",
      });
    }
  }

  return { created, skippedPast, skippedExisting };
}

async function createCalendarEventForTask(
  weddingId: string,
  taskId: string,
  event: { title: string; scheduledAt: Date; type: "milestone" | "client_meeting" | "vendor_meeting" | "reminder" }
): Promise<void> {
  const calendarEvent = await prisma.calendarEvent.create({
    data: {
      weddingId,
      taskId,
      type: event.type,
      title: event.title,
      scheduledAt: event.scheduledAt,
    },
  });

  try {
    const googleEventId = await pushCalendarEventCreate({
      title: event.title,
      scheduledAt: event.scheduledAt,
    });
    if (googleEventId) {
      await prisma.calendarEvent.update({
        where: { id: calendarEvent.id },
        data: { googleEventId },
      });
    }
  } catch (err) {
    // Google Calendar being unreachable/unconfigured should never break task
    // generation — the CalendarEvent row still exists locally without a
    // googleEventId.
    console.error("Failed to push calendar event to Google Calendar:", err);
  }
}

/**
 * When a wedding's date changes, shifts the due dates of its still-pending
 * auto-generated tasks to match the new date. Manual tasks and already-done
 * tasks are left untouched. Does not create or remove tasks.
 */
export async function recalculateAutoTaskDueDates(
  weddingId: string,
  newWeddingDate: Date
): Promise<{ updated: number }> {
  const tasks = await prisma.task.findMany({
    where: {
      weddingId,
      source: "auto_generated",
      status: { not: "done" },
      timelineRuleId: { not: null },
    },
    include: { timelineRule: true, calendarEvents: true },
  });

  let updated = 0;
  for (const task of tasks) {
    if (!task.timelineRule) continue;
    const dueDate = computeDueDate(newWeddingDate, task.timelineRule);
    await prisma.task.update({ where: { id: task.id }, data: { dueDate } });
    updated++;

    for (const calendarEvent of task.calendarEvents) {
      await prisma.calendarEvent.update({
        where: { id: calendarEvent.id },
        data: { scheduledAt: dueDate },
      });

      if (calendarEvent.googleEventId) {
        try {
          await pushCalendarEventUpdate(calendarEvent.googleEventId, {
            title: calendarEvent.title,
            scheduledAt: dueDate,
          });
        } catch (err) {
          console.error("Failed to update calendar event on Google Calendar:", err);
        }
      }
    }
  }

  return { updated };
}
