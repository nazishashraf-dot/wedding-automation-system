"use client";

import { useEffect, useState } from "react";
import { ApiError, Client, createClient, listClients } from "@/lib/api";
import { clientStatusLabel, formatDate } from "@/lib/format";
import Badge from "@/components/Badge";
import { btnPrimary, btnSecondary, cardClass, clientStatusTone, inputClass } from "@/lib/ui";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold text-wine-600">Clients</h1>
        <button onClick={() => setShowForm((s) => !s)} className={showForm ? btnSecondary : btnPrimary}>
          {showForm ? "Cancel" : "New Client"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${cardClass}`}>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Full name</label>
            <input
              required
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Partner name</label>
            <input
              className={inputClass}
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Email</label>
            <input
              required
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Phone</label>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {formError && <p className="text-sm text-rose-700 sm:col-span-2">{formError}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Saving..." : "Save Client"}
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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Wedding date</th>
                <th className="px-4 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {clients?.map((client) => (
                <tr key={client.id} className="hover:bg-ivory-100/60">
                  <td className="px-4 py-3 font-medium text-plum">
                    {client.fullName}
                    {client.partnerName ? ` & ${client.partnerName}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={clientStatusTone(client.status)}>
                      {clientStatusLabel(client.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-plum-600">
                    {client.weddings && client.weddings.length > 0
                      ? formatDate(client.weddings[0].weddingDate)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-plum-400">{client.email}</td>
                </tr>
              ))}
              {clients && clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-plum-400">
                    No clients yet.
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
