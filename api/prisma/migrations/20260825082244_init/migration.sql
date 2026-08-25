-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('lead', 'active', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('inquiry', 'booked', 'in_progress', 'final_month', 'completed');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('florist', 'caterer', 'venue', 'photographer', 'dj_band', 'hair_makeup', 'other');

-- CreateEnum
CREATE TYPE "VendorLinkStatus" AS ENUM ('contacted', 'quoted', 'confirmed');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "partnerName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'lead',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weddings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "budgetTotal" DECIMAL(12,2),
    "budgetSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "planningStatus" "PlanningStatus" NOT NULL DEFAULT 'inquiry',
    "styleNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "contactEmail" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_vendors" (
    "weddingId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "VendorLinkStatus" NOT NULL DEFAULT 'contacted',
    "priceQuoted" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "wedding_vendors_pkey" PRIMARY KEY ("weddingId","vendorId")
);

-- AddForeignKey
ALTER TABLE "weddings" ADD CONSTRAINT "weddings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_vendors" ADD CONSTRAINT "wedding_vendors_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "weddings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_vendors" ADD CONSTRAINT "wedding_vendors_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
