import { prisma } from "../src/db";
import { generateTimelineForWedding } from "../src/timeline";

type CalendarEventType = "milestone" | "client_meeting" | "vendor_meeting" | "reminder";

const EMAIL_TEMPLATES: Array<{ key: string; subject: string; bodyTemplate: string }> = [
  {
    key: "milestone_reminder",
    subject: "Reminder: {{taskTitle}} is coming up",
    bodyTemplate:
      "Hi {{clientName}}{{partnerNameSuffix}},\n\n" +
      'Just a friendly reminder that "{{taskTitle}}" is due on {{dueDate}}, as part of planning ' +
      "for your wedding on {{weddingDate}}.\n\n" +
      "Let us know if you have any questions or need a hand with this one!\n\n" +
      "Warmly,\nYour Wedding Planning Team",
  },
  {
    key: "task_overdue",
    subject: "Following up: {{taskTitle}} is now overdue",
    bodyTemplate:
      "Hi {{clientName}}{{partnerNameSuffix}},\n\n" +
      '"{{taskTitle}}" was due on {{dueDate}} ({{daysOverdue}} day(s) ago) and we haven\'t heard ' +
      "back yet. No worries if it's already in progress — just wanted to check in so nothing " +
      "slips through the cracks before {{weddingDate}}.\n\n" +
      "Let us know how we can help!\n\n" +
      "Warmly,\nYour Wedding Planning Team",
  },
  {
    key: "vendor_followup",
    subject: "Checking in on your booking for {{clientName}}'s wedding",
    bodyTemplate:
      "Hi there,\n\n" +
      "Just following up regarding your booking for {{clientName}}{{partnerNameSuffix}}'s " +
      "wedding on {{weddingDate}}. Could you confirm your current status (contacted / quoted / " +
      "confirmed) when you get a chance?\n\n" +
      "Thanks so much!\n\nYour Wedding Planning Team",
  },
  {
    key: "info_request",
    subject: "A few details for your upcoming wedding",
    bodyTemplate:
      "Hi {{clientName}}{{partnerNameSuffix}},\n\n" +
      "As we get closer to {{weddingDate}}, could you share a few more details with us? " +
      "You can fill out our quick intake form here: {{intakeFormLink}}\n\n" +
      "Thanks so much — we're looking forward to helping make your day perfect!\n\n" +
      "Your Wedding Planning Team",
  },
  {
    key: "status_checkin",
    subject: "How's wedding planning going, {{clientName}}?",
    bodyTemplate:
      "Hi {{clientName}}{{partnerNameSuffix}},\n\n" +
      "Just checking in as your wedding on {{weddingDate}} approaches ({{daysUntilWedding}} " +
      "days to go!). How are things feeling on your end? Let us know if there's anything you " +
      "need from us.\n\n" +
      "Warmly,\nYour Wedding Planning Team",
  },
];

const TIMELINE_RULES: Array<{
  label: string;
  monthsBeforeWedding?: number;
  weeksBeforeWedding?: number;
  taskTitle: string;
  taskDescription?: string;
  defaultPriority: "low" | "medium" | "high";
  createsCalendarEvent?: boolean;
  calendarEventType?: CalendarEventType;
}> = [
  {
    label: "Book venue",
    monthsBeforeWedding: 12,
    taskTitle: "Book venue",
    taskDescription: "Tour and confirm the ceremony/reception venue.",
    defaultPriority: "high",
    createsCalendarEvent: true,
    calendarEventType: "milestone",
  },
  {
    label: "Book major vendors",
    monthsBeforeWedding: 10,
    taskTitle: "Book major vendors (caterer, photographer)",
    defaultPriority: "high",
  },
  {
    label: "Book florist and entertainment",
    monthsBeforeWedding: 9,
    taskTitle: "Book florist and entertainment (DJ/band)",
    defaultPriority: "medium",
  },
  {
    label: "Send save-the-dates",
    monthsBeforeWedding: 6,
    taskTitle: "Send save-the-dates",
    defaultPriority: "medium",
  },
  {
    label: "Order wedding attire",
    monthsBeforeWedding: 5,
    taskTitle: "Order/shop for wedding attire",
    defaultPriority: "medium",
  },
  {
    label: "Book hair & makeup trial",
    monthsBeforeWedding: 4,
    taskTitle: "Book hair & makeup trial",
    defaultPriority: "low",
  },
  {
    label: "Finalize guest list",
    monthsBeforeWedding: 3,
    taskTitle: "Finalize guest list and headcount",
    defaultPriority: "high",
    createsCalendarEvent: true,
    calendarEventType: "milestone",
  },
  {
    label: "Send invitations",
    monthsBeforeWedding: 2,
    taskTitle: "Send invitations",
    defaultPriority: "high",
  },
  {
    label: "Confirm all vendor bookings",
    weeksBeforeWedding: 6,
    taskTitle: "Confirm all vendor bookings",
    defaultPriority: "high",
  },
  {
    label: "Final walkthrough with venue",
    weeksBeforeWedding: 2,
    taskTitle: "Final walkthrough with venue",
    defaultPriority: "high",
    createsCalendarEvent: true,
    calendarEventType: "vendor_meeting",
  },
  {
    label: "Confirm final details with all vendors",
    weeksBeforeWedding: 1,
    taskTitle: "Confirm final details with all vendors",
    defaultPriority: "high",
    createsCalendarEvent: true,
    calendarEventType: "reminder",
  },
];

async function main() {
  console.log("Seeding database...");

  // Timeline rules (standard milestone template)
  for (const rule of TIMELINE_RULES) {
    await prisma.timelineRule.create({
      data: {
        label: rule.label,
        monthsBeforeWedding: rule.monthsBeforeWedding ?? null,
        weeksBeforeWedding: rule.weeksBeforeWedding ?? null,
        taskTitle: rule.taskTitle,
        taskDescription: rule.taskDescription,
        defaultPriority: rule.defaultPriority,
        createsCalendarEvent: rule.createsCalendarEvent ?? false,
        calendarEventType: rule.calendarEventType,
      },
    });
  }
  console.log(`  Timeline rules: ${TIMELINE_RULES.length}`);

  // Email templates
  for (const template of EMAIL_TEMPLATES) {
    await prisma.emailTemplate.create({ data: template });
  }
  console.log(`  Email templates: ${EMAIL_TEMPLATES.length}`);

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

  // Auto-generate each wedding's task timeline from the rules above
  for (const wedding of [wedding1, wedding2, wedding3]) {
    const result = await generateTimelineForWedding(wedding.id, wedding.weddingDate);
    console.log(
      `  Timeline for ${wedding.id}: created ${result.created}, skipped ${result.skippedPast} (past due)`
    );
  }

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
