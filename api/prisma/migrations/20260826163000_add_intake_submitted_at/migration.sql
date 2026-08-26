-- AlterTable
ALTER TABLE "weddings" ADD COLUMN "intakeSubmittedAt" TIMESTAMP(3);

-- Backfill: guestCountEstimate and intakeNotes can only ever be set via the
-- public intake form (no other endpoint writes them), so their presence on
-- existing rows is proof a submission already happened before this column
-- existed to record it. updatedAt is used as an approximate timestamp since
-- the real submission time was never stored.
UPDATE "weddings"
SET "intakeSubmittedAt" = "updatedAt"
WHERE "guestCountEstimate" IS NOT NULL OR "intakeNotes" IS NOT NULL;
