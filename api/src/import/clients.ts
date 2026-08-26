import { prisma } from "../db";
import { generateTimelineForWedding } from "../timeline";
import { buildColumnMap, parseCsv, parseFlexibleDate, parseFlexibleMoney } from "./csv";

const CLIENT_FIELD_ALIASES: Record<string, string[]> = {
  fullName: [
    "full name",
    "name",
    "client name",
    "bride groom",
    "bride/groom",
    "primary contact",
    "couple",
    "bride",
    "client",
  ],
  partnerName: ["partner name", "partner", "groom", "spouse", "co client", "second partner"],
  email: ["email", "client email", "e mail", "email address", "contact email"],
  phone: ["phone", "phone number", "contact number", "tel", "telephone", "mobile"],
  weddingDate: ["wedding date", "date", "event date", "ceremony date"],
  venue: ["venue", "location", "wedding venue"],
  budgetTotal: ["budget", "budget total", "total budget", "estimated budget"],
  status: ["status", "client status", "lead status"],
};

const STATUS_ALIASES: Record<string, string[]> = {
  lead: ["lead", "new", "prospect", "inquiry"],
  active: ["active", "in progress", "booked", "confirmed"],
  completed: ["completed", "done", "finished", "past"],
  archived: ["archived", "cancelled", "canceled", "inactive", "lost"],
};

function mapStatus(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  for (const [status, aliases] of Object.entries(STATUS_ALIASES)) {
    if (aliases.includes(normalized)) return status;
  }
  return "lead";
}

export interface ClientPreviewRow {
  rowNumber: number;
  mapped: {
    fullName: string;
    partnerName: string | null;
    email: string;
    phone: string | null;
    weddingDate: string | null;
    venue: string | null;
    budgetTotal: number | null;
    status: string;
  };
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
  importable: boolean;
}

export interface ClientPreviewResult {
  columnMap: Record<string, string>;
  unmappedHeaders: string[];
  rows: ClientPreviewRow[];
}

export async function previewClientsCsv(buffer: Buffer): Promise<ClientPreviewResult> {
  const { headers, rows } = parseCsv(buffer);
  const columnMap = buildColumnMap(headers, CLIENT_FIELD_ALIASES);
  const mappedHeaderValues = new Set(Object.values(columnMap));
  const unmappedHeaders = headers.filter((h) => !mappedHeaderValues.has(h));

  const existingEmails = new Set(
    (await prisma.client.findMany({ select: { email: true } })).map((c) => c.email.toLowerCase())
  );
  const seenInBatch = new Set<string>();

  const previewRows: ClientPreviewRow[] = rows.map((row, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fullName = columnMap.fullName ? row[columnMap.fullName] ?? "" : "";
    const emailRaw = columnMap.email ? row[columnMap.email] ?? "" : "";
    const partnerName = columnMap.partnerName ? row[columnMap.partnerName] || null : null;
    const phone = columnMap.phone ? row[columnMap.phone] || null : null;
    const venue = columnMap.venue ? row[columnMap.venue] || null : null;

    if (!fullName) errors.push("Missing full name");
    if (!emailRaw) errors.push("Missing email");

    let weddingDateIso: string | null = null;
    if (columnMap.weddingDate) {
      const rawDate = row[columnMap.weddingDate];
      if (rawDate) {
        const parsed = parseFlexibleDate(rawDate);
        if (parsed) {
          weddingDateIso = parsed.toISOString();
        } else {
          warnings.push(`Invalid date format: "${rawDate}" — wedding won't be created for this row`);
        }
      }
    }

    let budgetTotal: number | null = null;
    if (columnMap.budgetTotal) {
      const rawBudget = row[columnMap.budgetTotal];
      if (rawBudget) budgetTotal = parseFlexibleMoney(rawBudget);
    }

    const status = columnMap.status ? mapStatus(row[columnMap.status] ?? "") : "lead";

    const emailNormalized = emailRaw.toLowerCase();
    let isDuplicate = false;
    if (emailRaw) {
      isDuplicate = existingEmails.has(emailNormalized) || seenInBatch.has(emailNormalized);
      if (isDuplicate) warnings.push(`Duplicate email: ${emailRaw} already exists`);
      seenInBatch.add(emailNormalized);
    }

    return {
      rowNumber: idx + 1,
      mapped: {
        fullName,
        partnerName,
        email: emailRaw,
        phone,
        weddingDate: weddingDateIso,
        venue,
        budgetTotal,
        status,
      },
      isDuplicate,
      errors,
      warnings,
      importable: errors.length === 0,
    };
  });

  return { columnMap, unmappedHeaders, rows: previewRows };
}

export interface ClientImportResult {
  totalRows: number;
  imported: number;
  weddingsCreated: number;
  skippedDuplicates: number;
  skippedErrors: number;
  skippedByChoice: number;
}

export async function confirmClientsImport(
  buffer: Buffer,
  includeRows: number[]
): Promise<ClientImportResult> {
  const preview = await previewClientsCsv(buffer);
  const includeSet = new Set(includeRows);

  const result: ClientImportResult = {
    totalRows: preview.rows.length,
    imported: 0,
    weddingsCreated: 0,
    skippedDuplicates: 0,
    skippedErrors: 0,
    skippedByChoice: 0,
  };

  for (const row of preview.rows) {
    const included = includeSet.has(row.rowNumber);

    if (!row.importable) {
      result.skippedErrors++;
      continue; // never import a row missing a required field, even if selected
    }
    if (!included) {
      if (row.isDuplicate) result.skippedDuplicates++;
      else result.skippedByChoice++;
      continue;
    }

    const client = await prisma.client.create({
      data: {
        fullName: row.mapped.fullName,
        partnerName: row.mapped.partnerName ?? undefined,
        email: row.mapped.email,
        phone: row.mapped.phone ?? undefined,
        status: row.mapped.status as "lead" | "active" | "completed" | "archived",
      },
    });
    result.imported++;

    if (row.mapped.weddingDate) {
      const wedding = await prisma.wedding.create({
        data: {
          clientId: client.id,
          weddingDate: new Date(row.mapped.weddingDate),
          venue: row.mapped.venue ?? undefined,
          budgetTotal: row.mapped.budgetTotal ?? undefined,
        },
      });
      await generateTimelineForWedding(wedding.id, wedding.weddingDate);
      result.weddingsCreated++;
    }
  }

  return result;
}
