"use client";

import { useEffect, useState } from "react";
import { ApiError, Client, createClient, deleteClient, listClients } from "@/lib/api";
import { clientStatusLabel, formatDate } from "@/lib/format";
import Badge from "@/components/Badge";
import DeleteButton from "@/components/DeleteButton";
import { useAuth } from "@/components/AuthProvider";
import { btnPrimary, btnSecondary, cardClass, clientStatusTone, inputClass } from "@/lib/ui";

export default function ClientsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
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

  async function handleDelete(id: string) {
    try {
      await deleteClient(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete client");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-4xl font-semibold text-wine-600 sm:text-5xl">Clients</h1>
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

      {clients && clients.length === 0 && (
        <div className={`text-center text-plum-400 ${cardClass}`}>No clients yet.</div>
      )}

      {clients && clients.length > 0 && (
        <>
          {/* Mobile: stacked cards. Hidden from sm and up, where the table takes over. */}
          <div className="space-y-3 sm:hidden">
            {clients.map((client) => (
              <div key={client.id} className="rounded-card border border-gold-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-plum">
                    {client.fullName}
                    {client.partnerName ? ` & ${client.partnerName}` : ""}
                  </p>
                  <Badge tone={clientStatusTone(client.status)}>
                    {clientStatusLabel(client.status)}
                  </Badge>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-plum-400">Wedding date</dt>
                    <dd className="text-plum-600">
                      {client.weddings && client.weddings.length > 0
                        ? formatDate(client.weddings[0].weddingDate)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-plum-400">Email</dt>
                    <dd className="truncate text-plum-600">{client.email}</dd>
                  </div>
                </dl>
                {isOwner && (
                  <div className="mt-3 text-right">
                    <DeleteButton onDelete={() => handleDelete(client.id)} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tablet and up: full table. */}
          <div className={`hidden overflow-hidden !p-0 sm:block ${cardClass}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Wedding date</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    {isOwner && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {clients.map((client) => (
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
                      {isOwner && (
                        <td className="px-4 py-3 text-right">
                          <DeleteButton onDelete={() => handleDelete(client.id)} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
