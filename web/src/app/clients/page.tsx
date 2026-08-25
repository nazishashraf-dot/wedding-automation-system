"use client";

import { useEffect, useState } from "react";
import { ApiError, Client, createClient, listClients } from "@/lib/api";
import { clientStatusLabel, formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [fullName, setFullName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await listClients();
      setClients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load clients");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await createClient({
        fullName,
        partnerName: partnerName || undefined,
        email,
        phone: phone || undefined,
      });
      setFullName("");
      setPartnerName("");
      setEmail("");
      setPhone("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create client");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {showForm ? "Cancel" : "New Client"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Full name
            </label>
            <input
              required
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Partner name
            </label>
            <input
              className={inputClass}
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
            <input
              required
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Phone</label>
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {formError && (
            <p className="sm:col-span-2 text-sm text-red-600">{formError}</p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Client"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Wedding date</th>
              <th className="px-4 py-2">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {clients?.map((client) => (
              <tr key={client.id} className="hover:bg-neutral-50">
                <td className="px-4 py-2 font-medium">
                  {client.fullName}
                  {client.partnerName ? ` & ${client.partnerName}` : ""}
                </td>
                <td className="px-4 py-2">{clientStatusLabel(client.status)}</td>
                <td className="px-4 py-2">
                  {client.weddings && client.weddings.length > 0
                    ? formatDate(client.weddings[0].weddingDate)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-neutral-500">{client.email}</td>
              </tr>
            ))}
            {clients && clients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
