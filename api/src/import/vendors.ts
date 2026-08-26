import { prisma } from "../db";
import { buildColumnMap, parseCsv } from "./csv";

const VENDOR_FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "vendor name", "company", "business name"],
  category: ["category", "type", "vendor type", "service"],
  contactEmail: ["contact email", "email", "e mail", "vendor email"],
  phone: ["phone", "phone number", "contact number", "tel", "telephone"],
  notes: ["notes", "note", "comments", "description"],
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  florist: ["florist", "flowers", "floral"],
  caterer: ["caterer", "catering", "food"],
  venue: ["venue", "location", "hall"],
  photographer: ["photographer", "photography", "photo"],
  dj_band: ["dj", "dj band", "band", "music", "entertainment"],
  hair_makeup: ["hair makeup", "hair and makeup", "makeup", "beauty", "hair"],
  other: ["other"],
};

function mapCategory(raw: string): { category: string; warning: string | null } {
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return { category: "other", warning: null };

  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(normalized)) return { category, warning: null };
  }
  return { category: "other", warning: `Unrecognized category "${raw}" — defaulted to Other` };
}

export interface VendorPreviewRow {
  rowNumber: number;
  mapped: {
    name: string;
    category: string;
    contactEmail: string | null;
    phone: string | null;
    notes: string | null;
  };
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
  importable: boolean;
}

export interface VendorPreviewResult {
  columnMap: Record<string, string>;
  unmappedHeaders: string[];
  rows: VendorPreviewRow[];
}

export async function previewVendorsCsv(buffer: Buffer): Promise<VendorPreviewResult> {
  const { headers, rows } = parseCsv(buffer);
  const columnMap = buildColumnMap(headers, VENDOR_FIELD_ALIASES);
  const mappedHeaderValues = new Set(Object.values(columnMap));
  const unmappedHeaders = headers.filter((h) => !mappedHeaderValues.has(h));

  const existingVendors = await prisma.vendor.findMany({
    select: { name: true, contactEmail: true },
  });
  const existingEmails = new Set(
    existingVendors.filter((v) => v.contactEmail).map((v) => v.contactEmail!.toLowerCase())
  );
  const existingNames = new Set(existingVendors.map((v) => v.name.toLowerCase()));
  const seenEmailsInBatch = new Set<string>();
  const seenNamesInBatch = new Set<string>();

  const previewRows: VendorPreviewRow[] = rows.map((row, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const name = columnMap.name ? row[columnMap.name] ?? "" : "";
    const contactEmail = columnMap.contactEmail ? row[columnMap.contactEmail] || null : null;
    const phone = columnMap.phone ? row[columnMap.phone] || null : null;
    const notes = columnMap.notes ? row[columnMap.notes] || null : null;

    if (!name) errors.push("Missing vendor name");

    const rawCategory = columnMap.category ? row[columnMap.category] ?? "" : "";
    const { category, warning } = mapCategory(rawCategory);
    if (warning) warnings.push(warning);

    let isDuplicate = false;
    if (contactEmail) {
      const normalizedEmail = contactEmail.toLowerCase();
      isDuplicate = existingEmails.has(normalizedEmail) || seenEmailsInBatch.has(normalizedEmail);
      seenEmailsInBatch.add(normalizedEmail);
    } else if (name) {
      const normalizedName = name.toLowerCase();
      isDuplicate = existingNames.has(normalizedName) || seenNamesInBatch.has(normalizedName);
      seenNamesInBatch.add(normalizedName);
    }
    if (isDuplicate) {
      warnings.push(
        contactEmail
          ? `Duplicate contact email: ${contactEmail} already exists`
          : `Duplicate vendor name: ${name} already exists`
      );
    }

    return {
      rowNumber: idx + 1,
      mapped: { name, category, contactEmail, phone, notes },
      isDuplicate,
      errors,
      warnings,
      importable: errors.length === 0,
    };
  });

  return { columnMap, unmappedHeaders, rows: previewRows };
}

export interface VendorImportResult {
  totalRows: number;
  imported: number;
  skippedDuplicates: number;
  skippedErrors: number;
  skippedByChoice: number;
}

export async function confirmVendorsImport(
  buffer: Buffer,
  includeRows: number[]
): Promise<VendorImportResult> {
  const preview = await previewVendorsCsv(buffer);
  const includeSet = new Set(includeRows);

  const result: VendorImportResult = {
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

    await prisma.vendor.create({
      data: {
        name: row.mapped.name,
        category: row.mapped.category as
          | "florist"
          | "caterer"
          | "venue"
          | "photographer"
          | "dj_band"
          | "hair_makeup"
          | "other",
        contactEmail: row.mapped.contactEmail ?? undefined,
        phone: row.mapped.phone ?? undefined,
        notes: row.mapped.notes ?? undefined,
      },
    });
    result.imported++;
  }

  return result;
}
