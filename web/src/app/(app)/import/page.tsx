"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ApiError,
  ClientImportSummary,
  ImportPreviewResult,
  VendorImportSummary,
  confirmClientsImport,
  confirmVendorsImport,
  previewClientsImport,
  previewVendorsImport,
} from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import Badge from "@/components/Badge";
import { btnPrimary, btnPrimarySm, btnSecondary, btnSecondarySm, cardClass } from "@/lib/ui";

type ImportKind = "clients" | "vendors";
type Step = "upload" | "preview" | "result";

interface ColumnConfig {
  key: string;
  label: string;
  format?: (value: string | number | null) => string;
}

const CLIENT_COLUMNS: ColumnConfig[] = [
  { key: "fullName", label: "Name" },
  { key: "partnerName", label: "Partner" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "weddingDate", label: "Wedding Date", format: (v) => (v ? formatDate(String(v)) : "—") },
  { key: "venue", label: "Venue" },
  { key: "budgetTotal", label: "Budget", format: (v) => (v === null ? "—" : formatMoney(v as number)) },
  { key: "status", label: "Status" },
];

const VENDOR_COLUMNS: ColumnConfig[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "contactEmail", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "notes", label: "Notes" },
];

function formatCell(value: string | number | null, format?: ColumnConfig["format"]): string {
  if (format) return format(value);
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function ImportPageInner() {
  const searchParams = useSearchParams();
  const initialKind: ImportKind = searchParams.get("type") === "vendors" ? "vendors" : "clients";

  const [kind, setKind] = useState<ImportKind>(initialKind);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [includedRows, setIncludedRows] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [summary, setSummary] = useState<ClientImportSummary | VendorImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columns = kind === "clients" ? CLIENT_COLUMNS : VENDOR_COLUMNS;

  function handleStartOver() {
    setFile(null);
    setPreview(null);
    setIncludedRows(new Set());
    setSummary(null);
    setError(null);
    setStep("upload");
  }

  function handleKindChange(newKind: ImportKind) {
    setKind(newKind);
    handleStartOver();
  }

  async function handleFileSelected(selected: File) {
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported");
      return;
    }
    setFile(selected);
    setError(null);
    setLoading(true);
    try {
      const result =
        kind === "clients"
          ? await previewClientsImport(selected)
          : await previewVendorsImport(selected);
      setPreview(result);
      setIncludedRows(
        new Set(result.rows.filter((r) => r.importable && !r.isDuplicate).map((r) => r.rowNumber))
      );
      setStep("preview");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to parse CSV");
    } finally {
      setLoading(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelected(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelected(f);
  }

  function toggleRow(rowNumber: number) {
    setIncludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!preview) return;
    setIncludedRows(
      checked ? new Set(preview.rows.filter((r) => r.importable).map((r) => r.rowNumber)) : new Set()
    );
  }

  async function handleConfirm() {
    if (!file) return;
    setConfirming(true);
    setError(null);
    try {
      const result =
        kind === "clients"
          ? await confirmClientsImport(file, Array.from(includedRows))
          : await confirmVendorsImport(file, Array.from(includedRows));
      setSummary(result);
      setStep("result");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl font-semibold text-wine-600 sm:text-5xl">
          Import from CSV
        </h1>
        <p className="mt-2 text-sm text-plum-400">
          Bring existing clients or vendors in from a spreadsheet export — nothing is saved until
          you review and confirm.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleKindChange("clients")}
          className={kind === "clients" ? btnPrimarySm : btnSecondarySm}
        >
          Clients
        </button>
        <button
          type="button"
          onClick={() => handleKindChange("vendors")}
          className={kind === "vendors" ? btnPrimarySm : btnSecondarySm}
        >
          Vendors
        </button>
      </div>

      {step === "upload" && (
        <section className={cardClass}>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-12 text-center transition-colors ${
              dragActive
                ? "border-wine-400 bg-wine-50"
                : "border-gold-200 bg-ivory-100/60 hover:border-gold-300"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileInputChange}
            />
            {loading ? (
              <p className="text-sm text-plum-600">Parsing file...</p>
            ) : (
              <p className="text-sm text-plum-400">
                <span className="font-medium text-wine-500">Click to upload</span> or drag and
                drop a .csv export of your {kind === "clients" ? "clients" : "vendors"}.
              </p>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
        </section>
      )}

      {step === "preview" && preview && (
        <section className={cardClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-plum">{file?.name}</p>
              <p className="text-xs text-plum-400">
                {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"} found ·{" "}
                {includedRows.size} selected to import
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleStartOver} className={btnSecondarySm}>
                Start Over
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming || includedRows.size === 0}
                className={btnPrimary}
              >
                {confirming
                  ? "Importing..."
                  : `Import ${includedRows.size} Row${includedRows.size === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>

          {preview.unmappedHeaders.length > 0 && (
            <p className="mb-3 text-xs text-plum-400">
              Columns not recognized (ignored): {preview.unmappedHeaders.join(", ")}
            </p>
          )}

          {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}

          <div className="overflow-x-auto rounded-lg border border-gold-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all importable rows"
                      checked={
                        preview.rows.some((r) => r.importable) &&
                        preview.rows.filter((r) => r.importable).every((r) => includedRows.has(r.rowNumber))
                      }
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-3 py-2 font-medium">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className={!row.importable ? "bg-rose-50/40" : undefined}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        disabled={!row.importable}
                        checked={includedRows.has(row.rowNumber)}
                        onChange={() => toggleRow(row.rowNumber)}
                      />
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 text-plum-600">
                        {formatCell(row.mapped[c.key], c.format)}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {!row.importable ? (
                        <Badge tone="rose">{row.errors.join("; ")}</Badge>
                      ) : row.isDuplicate ? (
                        <Badge tone="gold">Duplicate</Badge>
                      ) : (
                        <Badge tone="sage">Valid</Badge>
                      )}
                      {row.warnings.length > 0 && (
                        <p className="mt-1 max-w-xs text-xs text-plum-400">
                          {row.warnings.join("; ")}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {step === "result" && summary && (
        <section className={cardClass}>
          <h2 className="font-heading text-2xl font-semibold text-wine-600">Import complete</h2>
          <p className="mt-3 text-sm leading-relaxed text-plum-600">
            {summary.imported} {kind === "clients" ? "client" : "vendor"}
            {summary.imported === 1 ? "" : "s"} imported
            {"weddingsCreated" in summary && summary.weddingsCreated > 0
              ? ` (${summary.weddingsCreated} wedding${summary.weddingsCreated === 1 ? "" : "s"} created)`
              : ""}
            , {summary.skippedDuplicates} skipped as duplicate
            {summary.skippedDuplicates === 1 ? "" : "s"}, {summary.skippedErrors} skipped due to
            error{summary.skippedErrors === 1 ? "" : "s"}
            {summary.skippedByChoice > 0
              ? `, ${summary.skippedByChoice} skipped by choice`
              : ""}
            .
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={kind === "clients" ? "/clients" : "/vendors"} className={btnPrimary}>
              View {kind === "clients" ? "Clients" : "Vendors"}
            </Link>
            <button type="button" onClick={handleStartOver} className={btnSecondary}>
              Import Another File
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<p className="text-sm text-plum-400">Loading...</p>}>
      <ImportPageInner />
    </Suspense>
  );
}
