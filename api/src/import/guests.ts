import { prisma } from "../db";
import { normalizeTableAssignment } from "../utils";
import { buildColumnMap, parseCsv } from "./csv";

const GUEST_FIELD_ALIASES: Record<string, string[]> = {
  fullName: ["name", "guest", "guest name", "full name"],
  partySize: ["party size", "party", "guests", "number of guests", "seats", "headcount"],
  rsvpStatus: ["rsvp status", "rsvp", "status"],
  mealChoice: ["meal", "meal choice", "entree", "food", "dietary"],
  tableAssignment: ["table", "table assignment", "table number", "table no"],
  contactEmail: ["email", "contact email", "guest email"],
  notes: ["notes", "note", "comments"],
};

const RSVP_ALIASES: Record<string, string[]> = {
  attending: ["attending", "yes", "confirmed", "accept", "accepted", "going"],
  declined: ["declined", "no", "decline", "not attending", "regret", "regrets"],
  pending: ["pending", "invited", "no response", "awaiting", "tbd"],
};

function mapRsvpStatus(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return "pending";
  for (const [status, aliases] of Object.entries(RSVP_ALIASES)) {
    if (aliases.includes(normalized)) return status;
  }
  return "pending";
}

export interface GuestPreviewRow {
  rowNumber: number;
  mapped: {
    fullName: string;
    partySize: number;
    rsvpStatus: string;
    mealChoice: string | null;
    tableAssignment: string | null;
    contactEmail: string | null;
    notes: string | null;
  };
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
  importable: boolean;
}

export interface GuestPreviewResult {
  columnMap: Record<string, string>;
  unmappedHeaders: string[];
  rows: GuestPreviewRow[];
}

function guestKey(fullName: string, contactEmail: string | null): string {
  return `${fullName.toLowerCase()}|${(contactEmail ?? "").toLowerCase()}`;
}

export async function previewGuestsCsv(weddingId: string, buffer: Buffer): Promise<GuestPreviewResult> {
  const { headers, rows } = parseCsv(buffer);
  const columnMap = buildColumnMap(headers, GUEST_FIELD_ALIASES);
  const mappedHeaderValues = new Set(Object.values(columnMap));
  const unmappedHeaders = headers.filter((h) => !mappedHeaderValues.has(h));

  const existingGuests = await prisma.guest.findMany({
    where: { weddingId },
    select: { fullName: true, contactEmail: true },
  });
  const existingKeys = new Set(existingGuests.map((g) => guestKey(g.fullName, g.contactEmail)));
  const seenInBatch = new Set<string>();

  const previewRows: GuestPreviewRow[] = rows.map((row, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fullName = columnMap.fullName ? row[columnMap.fullName] ?? "" : "";
    const contactEmail = columnMap.contactEmail ? row[columnMap.contactEmail] || null : null;
    const mealChoice = columnMap.mealChoice ? row[columnMap.mealChoice] || null : null;
    const rawTableAssignment = columnMap.tableAssignment ? row[columnMap.tableAssignment] || null : null;
    const tableAssignment = rawTableAssignment ? normalizeTableAssignment(rawTableAssignment) : null;
    const notes = columnMap.notes ? row[columnMap.notes] || null : null;

    if (!fullName) errors.push("Missing guest name");

    let partySize = 1;
    if (columnMap.partySize) {
      const raw = row[columnMap.partySize];
      if (raw) {
        const digitsOnly = raw.replace(/[^0-9]/g, "");
        const parsed = digitsOnly ? parseInt(digitsOnly, 10) : NaN;
        if (!Number.isNaN(parsed) && parsed > 0) partySize = parsed;
      }
    }

    const rsvpStatus = columnMap.rsvpStatus ? mapRsvpStatus(row[columnMap.rsvpStatus] ?? "") : "pending";

    let isDuplicate = false;
    if (fullName) {
      const key = guestKey(fullName, contactEmail);
      isDuplicate = existingKeys.has(key) || seenInBatch.has(key);
      if (isDuplicate) warnings.push(`Duplicate guest: ${fullName} is already on the list`);
      seenInBatch.add(key);
    }

    return {
      rowNumber: idx + 1,
      mapped: { fullName, partySize, rsvpStatus, mealChoice, tableAssignment, contactEmail, notes },
      isDuplicate,
      errors,
      warnings,
      importable: errors.length === 0,
    };
  });

  return { columnMap, unmappedHeaders, rows: previewRows };
}

export interface GuestImportResult {
  totalRows: number;
  imported: number;
  skippedDuplicates: number;
  skippedErrors: number;
  skippedByChoice: number;
}

export async function confirmGuestsImport(
  weddingId: string,
  buffer: Buffer,
  includeRows: number[]
): Promise<GuestImportResult> {
  const preview = await previewGuestsCsv(weddingId, buffer);
  const includeSet = new Set(includeRows);

  const result: GuestImportResult = {
    totalRows: preview.rows.length,
    imported: 0,
    skippedDuplicates: 0,
    skippedErrors: 0,
    skippedByChoice: 0,
  };

  for (const row of preview.rows) {
    const included = includeSet.has(row.rowNumber);

    if (!row.importable) {
      result.skippedErrors++;
      continue;
    }
    if (!included) {
      if (row.isDuplicate) result.skippedDuplicates++;
      else result.skippedByChoice++;
      continue;
    }

    await prisma.guest.create({
      data: {
        weddingId,
        fullName: row.mapped.fullName,
        partySize: row.mapped.partySize,
        rsvpStatus: row.mapped.rsvpStatus as "pending" | "attending" | "declined",
        mealChoice: row.mapped.mealChoice ?? undefined,
        tableAssignment: row.mapped.tableAssignment ?? undefined,
        contactEmail: row.mapped.contactEmail ?? undefined,
        notes: row.mapped.notes ?? undefined,
      },
    });
    result.imported++;
  }

  return result;
}
