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

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Weddings</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {showForm ? "Cancel" : "New Wedding"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Client</label>
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
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Wedding date
            </label>
            <input
              required
              type="date"
              className={inputClass}
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Venue</label>
            <input
              className={inputClass}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>
          {formError && (
            <p className="sm:col-span-3 text-sm text-red-600">{formError}</p>
          )}
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Wedding"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Venue</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {weddings?.map((wedding) => (
              <tr key={wedding.id} className="hover:bg-neutral-50">
                <td className="px-4 py-2 font-medium">
                  <Link href={`/weddings/${wedding.id}`} className="hover:underline">
                    {wedding.client?.fullName ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-2">{formatDate(wedding.weddingDate)}</td>
                <td className="px-4 py-2">{wedding.venue ?? "—"}</td>
                <td className="px-4 py-2">{planningStatusLabel(wedding.planningStatus)}</td>
              </tr>
            ))}
            {weddings && weddings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  No weddings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
