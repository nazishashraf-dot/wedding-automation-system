"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  Client,
  Wedding,
  createWedding,
  listClients,
  listWeddings,
} from "@/lib/api";
import { formatDate, planningStatusLabel } from "@/lib/format";
import Badge from "@/components/Badge";
import { btnPrimary, btnSecondary, cardClass, inputClass, planningStatusTone } from "@/lib/ui";

export default function WeddingsPage() {
  const [weddings, setWeddings] = useState<Wedding[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [clientId, setClientId] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [venue, setVenue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await listWeddings();
      setWeddings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load weddings");
    }
  }

  useEffect(() => {
    refresh();
    listClients()
      .then(setClients)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await createWedding({
        clientId,
        weddingDate,
        venue: venue || undefined,
      });
      setClientId("");
      setWeddingDate("");
      setVenue("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create wedding");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold text-wine-600">Weddings</h1>
        <button onClick={() => setShowForm((s) => !s)} className={showForm ? btnSecondary : btnPrimary}>
          {showForm ? "Cancel" : "New Wedding"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${cardClass}`}>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Client</label>
            <select
              required
              className={inputClass}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="" disabled>
                Select a client
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                  {c.partnerName ? ` & ${c.partnerName}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Wedding date</label>
            <input
              required
              type="date"
              className={inputClass}
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Venue</label>
            <input className={inputClass} value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          {formError && <p className="text-sm text-rose-700 sm:col-span-3">{formError}</p>}
          <div className="sm:col-span-3">
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Saving..." : "Save Wedding"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-rose-700">{error}</p>}

      <div className={`overflow-hidden !p-0 ${cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Venue</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {weddings?.map((wedding) => (
                <tr key={wedding.id} className="hover:bg-ivory-100/60">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/weddings/${wedding.id}`} className="text-wine-600 hover:underline">
                      {wedding.client?.fullName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-plum-600">{formatDate(wedding.weddingDate)}</td>
                  <td className="px-4 py-3 text-plum-600">{wedding.venue ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={planningStatusTone(wedding.planningStatus)}>
                      {planningStatusLabel(wedding.planningStatus)}
                    </Badge>
                  </td>
                </tr>
              ))}
              {weddings && weddings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-plum-400">
                    No weddings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
