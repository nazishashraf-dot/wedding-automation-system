"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  Client,
  Wedding,
  createWedding,
  deleteWedding,
  listClients,
  listWeddings,
} from "@/lib/api";
import { formatDate, planningStatusLabel } from "@/lib/format";
import Badge from "@/components/Badge";
import CoupleName from "@/components/CoupleName";
import DeleteButton from "@/components/DeleteButton";
import { useAuth } from "@/components/AuthProvider";
import {
  btnPrimary,
  btnSecondary,
  cardClass,
  inputClass,
  planningStatusTone,
  weddingPhotoFor,
} from "@/lib/ui";

export default function WeddingsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
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

  async function handleDelete(id: string) {
    try {
      await deleteWedding(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete wedding");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-4xl font-semibold text-wine-600 sm:text-5xl">Weddings</h1>
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

      {weddings && weddings.length === 0 && (
        <div className={`text-center text-plum-400 ${cardClass}`}>No weddings yet.</div>
      )}

      {weddings && weddings.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {weddings.map((wedding) => (
            <div
              key={wedding.id}
              className="group relative overflow-hidden rounded-card border border-gold-100 bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <Link href={`/weddings/${wedding.id}`} className="block">
                <div
                  className="h-40 bg-cover bg-center bg-gold-100"
                  style={{ backgroundImage: `url(${weddingPhotoFor(wedding.id)})` }}
                />
                <div className="p-5">
                  <p className="font-heading text-xl font-semibold text-plum">
                    {wedding.client ? (
                      <CoupleName
                        fullName={wedding.client.fullName}
                        partnerName={wedding.client.partnerName}
                      />
                    ) : (
                      "—"
                    )}
                  </p>
                  <p className="mt-1 text-sm text-plum-400">
                    {formatDate(wedding.weddingDate)} · {wedding.venue ?? "Venue to be confirmed"}
                  </p>
                  <div className="mt-3">
                    <Badge tone={planningStatusTone(wedding.planningStatus)}>
                      {planningStatusLabel(wedding.planningStatus)}
                    </Badge>
                  </div>
                </div>
              </Link>
              {isOwner && (
                <div className="absolute right-3 top-3">
                  <DeleteButton
                    onDelete={() => handleDelete(wedding.id)}
                    className="rounded-full bg-ivory/95 px-3 py-1 text-xs font-medium text-rose-700 shadow-soft transition-colors hover:bg-ivory"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
