import Papa from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parses raw CSV bytes into header-keyed rows. Values are trimmed (Sheets
 * exports routinely have trailing/leading whitespace from copy-paste), and
 * completely empty lines are dropped rather than turning into a garbage row.
 */
export function parseCsv(buffer: Buffer): ParsedCsv {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const rows = result.data.map((row) => {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      cleaned[key] = typeof value === "string" ? value.trim() : (value ?? "");
    }
    return cleaned;
  });

  return { headers, rows };
}

function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Matches CSV headers to known field names using a flexible alias table —
 * "Bride/Groom", "Wedding Date", "Client Email" and similar real-world
 * variants all normalize to something in the alias list. Returns a map of
 * our field name -> the actual header string found in this file.
 */
export function buildColumnMap(
  headers: string[],
  aliasGroups: Record<string, string[]>
): Record<string, string> {
  const normalizedHeaders = headers.map((h) => ({ original: h, norm: normalizeHeader(h) }));
  const map: Record<string, string> = {};

  for (const [field, aliases] of Object.entries(aliasGroups)) {
    const normalizedAliases = aliases.map(normalizeHeader);
    const found = normalizedHeaders.find((h) => normalizedAliases.includes(h.norm));
    if (found) map[field] = found.original;
  }

  return map;
}

/**
 * Handles the date-format inconsistency real Sheets exports have: ISO
 * (2027-03-15), US slash format (3/15/2027), spelled-out months
 * (March 15, 2027), and non-US day-first formats (15/03/2027, 15-03-2027)
 * where the day value alone (>12) makes the order unambiguous. Returns null
 * if nothing reasonable can be made of it.
 */
export function parseFlexibleDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const native = new Date(trimmed);
  if (!Number.isNaN(native.getTime())) return native;

  const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (match) {
    const [, a, b, y] = match;
    let year = Number(y);
    if (year < 100) year += year < 50 ? 2000 : 1900;

    const first = Number(a);
    const second = Number(b);
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/**
 * Strips currency symbols, thousands separators, and stray text ("$45,000",
 * "45000.00 USD") down to a plain number. Returns null when there's nothing
 * numeric to salvage (e.g. "N/A") — callers treat that as "not provided"
 * rather than an error, since budget is never a required field.
 */
export function parseFlexibleMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}
