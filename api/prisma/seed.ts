import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clients
  const client1 = await prisma.client.create({
    data: {
      fullName: "Amara Chen",
      partnerName: "Diego Fernandez",
      email: "amara.chen@example.com",
      phone: "555-0101",
      status: "active",
      notes: "Prefers outdoor venues, garden theme.",
    },
  });

  const client2 = await prisma.client.create({
    data: {
      fullName: "Jordan Blake",
      partnerName: "Sam Whitfield",
      email: "jordan.blake@example.com",
      phone: "555-0102",
      status: "active",
    },
  });

  const client3 = await prisma.client.create({
    data: {
      fullName: "Priya Nair",
      email: "priya.nair@example.com",
      phone: "555-0103",
      status: "lead",
      notes: "Still deciding on a date, interested in a fall wedding.",
    },
  });

  // Weddings
  const wedding1 = await prisma.wedding.create({
    data: {
      clientId: client1.id,
      weddingDate: new Date("2026-11-14"),
      venue: "Willowbrook Gardens",
      budgetTotal: 45000,
      budgetSpent: 12500,
      planningStatus: "in_progress",
      styleNotes: "Garden theme, sage green and ivory palette.",
    },
  });

  const wedding2 = await prisma.wedding.create({
    data: {
      clientId: client2.id,
      weddingDate: new Date("2027-02-20"),
      venue: "The Grand Ballroom",
      budgetTotal: 60000,
      budgetSpent: 5000,
      planningStatus: "booked",
      styleNotes: "Classic black-tie affair.",
    },
  });

  const wedding3 = await prisma.wedding.create({
    data: {
      clientId: client3.id,
      weddingDate: new Date("2026-10-03"),
      planningStatus: "inquiry",
    },
  });

  // Vendors
  const vendorFlorist = await prisma.vendor.create({
    data: {
      name: "Bloom & Petal Co.",
      category: "florist",
      contactEmail: "hello@bloompetal.example.com",
      phone: "555-0201",
      notes: "Specializes in seasonal, locally-sourced arrangements.",
    },
  });

  const vendorCaterer = await prisma.vendor.create({
    data: {
      name: "Harvest Table Catering",
      category: "caterer",
      contactEmail: "events@harvesttable.example.com",
      phone: "555-0202",
    },
  });

  const vendorPhotographer = await prisma.vendor.create({
    data: {
      name: "Lena Ortiz Photography",
      category: "photographer",
      contactEmail: "lena@ortizphoto.example.com",
      phone: "555-0203",
    },
  });

  const vendorDj = await prisma.vendor.create({
    data: {
      name: "Nightwave DJ Collective",
      category: "dj_band",
      contactEmail: "book@nightwavedj.example.com",
      phone: "555-0204",
    },
  });

  const vendorHairMakeup = await prisma.vendor.create({
    data: {
      name: "Glow Studio Hair & Makeup",
      category: "hair_makeup",
      contactEmail: "bookings@glowstudio.example.com",
      phone: "555-0205",
    },
  });

  // Link a few vendors to weddings
  await prisma.weddingVendor.create({
    data: {
      weddingId: wedding1.id,
      vendorId: vendorFlorist.id,
      status: "confirmed",
      priceQuoted: 2200,
      notes: "Deposit paid.",
    },
  });

  await prisma.weddingVendor.create({
    data: {
      weddingId: wedding1.id,
      vendorId: vendorPhotographer.id,
      status: "quoted",
      priceQuoted: 3800,
    },
  });

  await prisma.weddingVendor.create({
    data: {
      weddingId: wedding2.id,
      vendorId: vendorCaterer.id,
      status: "contacted",
    },
  });

  await prisma.weddingVendor.create({
    data: {
      weddingId: wedding2.id,
      vendorId: vendorDj.id,
      status: "confirmed",
      priceQuoted: 1500,
    },
  });

  console.log("Seed complete:");
  console.log(`  Clients: ${client1.fullName}, ${client2.fullName}, ${client3.fullName}`);
  console.log(`  Weddings: ${wedding1.id}, ${wedding2.id}, ${wedding3.id}`);
  console.log(
    `  Vendors: ${vendorFlorist.name}, ${vendorCaterer.name}, ${vendorPhotographer.name}, ${vendorDj.name}, ${vendorHairMakeup.name}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
