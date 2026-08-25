import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler, notFound } from "../errors";
import { param } from "../utils";
import { pushCalendarEventDelete } from "../googleCalendar";

const router = Router();

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const meeting = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!meeting) throw notFound("Meeting");

    if (meeting.googleEventId) {
      try {
        await pushCalendarEventDelete(meeting.googleEventId);
      } catch (err) {
        console.error("Failed to delete calendar event on Google Calendar:", err);
      }
    }

    await prisma.calendarEvent.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
