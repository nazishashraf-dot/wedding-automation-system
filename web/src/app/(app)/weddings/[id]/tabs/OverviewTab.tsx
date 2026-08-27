"use client";

import { useEffect, useState } from "react";
import { ApiError, Wedding, updateWedding } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";
import { btnPrimary, cardClass, inputClass } from "@/lib/ui";

export default function OverviewTab({
  wedding,
  onRefresh,
}: {
  wedding: Wedding;
  onRefresh: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [budgetTotal, setBudgetTotal] = useState(wedding.budgetTotal ?? "");
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  useEffect(() => {
    setBudgetTotal(wedding.budgetTotal ?? "");
  }, [wedding.budgetTotal]);

  const outstandingBalance = (Number(wedding.budgetTotal) || 0) - (Number(wedding.totalSpent) || 0);

  async function handleBudgetSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingBudget(true);
    setBudgetSaved(false);
    try {
      await updateWedding(wedding.id, {
        budgetTotal: budgetTotal === "" ? undefined : Number(budgetTotal),
      });
      await onRefresh();
      setBudgetSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update budget");
    } finally {
      setSavingBudget(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <section className={cardClass}>
        <SectionHeading>Client Intake</SectionHeading>
        {wedding.intakeSubmittedAt ? (
          <>
            <p className="mb-4 text-xs text-plum-400">
              Submitted {formatDate(wedding.intakeSubmittedAt)}
            </p>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-plum-400">Partner name</dt>
                <dd className="mt-1 text-sm text-plum-600">
                  {wedding.client?.partnerName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-plum-400">Phone</dt>
                <dd className="mt-1 text-sm text-plum-600">{wedding.client?.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-plum-400">
                  Estimated guest count
                </dt>
                <dd className="mt-1 text-sm text-plum-600">
                  {wedding.guestCountEstimate ?? "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-plum-400">
                  Style / theme notes
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-plum-600">
                  {wedding.styleNotes || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-plum-400">
                  Additional notes
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-plum-600">
                  {wedding.intakeNotes || "—"}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-gold-200 bg-ivory-100/60 px-4 py-6 text-center text-sm text-plum-400">
            No intake form submission received yet. Use the &ldquo;Copy intake form
            link&rdquo; button above to send the couple their form.
          </p>
        )}
      </section>

      <section className={cardClass}>
        <SectionHeading>Budget</SectionHeading>
        <form onSubmit={handleBudgetSave} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Budget total</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={budgetTotal}
              onChange={(e) => setBudgetTotal(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={savingBudget} className={btnPrimary}>
              {savingBudget ? "Saving..." : "Save Budget"}
            </button>
            {budgetSaved && <span className="text-xs font-medium text-sage-700">Saved</span>}
          </div>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-plum-400">Budget Total</p>
            <p className="mt-1 font-heading text-xl font-semibold text-plum">
              {formatMoney(wedding.budgetTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-plum-400">Total Spent</p>
            <p className="mt-1 font-heading text-xl font-semibold text-plum">
              {formatMoney(wedding.totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-plum-400">Total Collected</p>
            <p className="mt-1 font-heading text-xl font-semibold text-sage-700">
              {formatMoney(wedding.totalCollected)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-plum-400">Outstanding Balance</p>
            <p
              className={`mt-1 font-heading text-xl font-semibold ${
                outstandingBalance > 0 ? "text-rose-700" : "text-plum"
              }`}
            >
              {formatMoney(outstandingBalance)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
