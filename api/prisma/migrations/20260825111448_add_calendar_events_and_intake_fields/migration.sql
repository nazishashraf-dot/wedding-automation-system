-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('milestone', 'client_meeting', 'vendor_meeting', 'reminder');

-- AlterTable
ALTER TABLE "timeline_rules" ADD COLUMN     "calendarEventType" "CalendarEventType",
ADD COLUMN     "createsCalendarEvent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "weddings" ADD COLUMN     "guestCountEstimate" INTEGER,
ADD COLUMN     "intakeNotes" TEXT;

-- CreateTable
CREATE TABLE "google_auth_tokens" (
    "id" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "expiryDate" TIMESTAMP(3),
    "scope" TEXT,
    "calendarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "taskId" TEXT,
    "type" "CalendarEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "googleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "weddings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
