-- CreateEnum
CREATE TYPE "GuestRsvpStatus" AS ENUM ('pending', 'attending', 'declined');

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "rsvpStatus" "GuestRsvpStatus" NOT NULL DEFAULT 'pending',
    "mealChoice" TEXT,
    "tableAssignment" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "weddings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
