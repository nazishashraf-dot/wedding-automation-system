"use client";

import { useEffect, useState } from "react";
import { ApiError, Vendor, VendorCategory, createVendor, listVendors } from "@/lib/api";
import { vendorCategoryLabel } from "@/lib/format";
import { btnPrimary, btnSecondary, cardClass, inputClass } from "@/lib/ui";

const CATEGORIES: VendorCategory[] = [
  "florist",
  "caterer",
  "venue",
  "photographer",
  "dj_band",
  "hair_makeup",
  "other",
];

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | "">("");
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<VendorCategory>("florist");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await listVendors(categoryFilter || undefined);
      setVendors(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load vendors");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await createVendor({
        name,
        category,
        contactEmail: contactEmail || undefined,
        phone: phone || undefined,
      });
      setName("");
      setCategory("florist");
      setContactEmail("");
      setPhone("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create vendor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold text-wine-600">Vendors</h1>
        <button onClick={() => setShowForm((s) => !s)} className={showForm ? btnSecondary : btnPrimary}>
          {showForm ? "Cancel" : "New Vendor"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${cardClass}`}>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Name</label>
            <input
              required
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Category</label>
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value as VendorCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {vendorCategoryLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Contact email</label>
            <input
              type="email"
              className={inputClass}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Phone</label>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {formError && <p className="text-sm text-rose-700 sm:col-span-2">{formError}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Saving..." : "Save Vendor"}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-plum-600">Filter by category:</label>
        <select
          className="rounded-full border border-gold-200 bg-white px-3 py-1.5 text-sm text-plum focus:border-wine-400 focus:outline-none"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as VendorCategory | "")}
        >
          <option value="">All</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {vendorCategoryLabel(c)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-rose-700">{error}</p>}

      <div className={`overflow-hidden !p-0 ${cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Contact email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {vendors?.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-ivory-100/60">
                  <td className="px-4 py-3 font-medium text-plum">{vendor.name}</td>
                  <td className="px-4 py-3 text-plum-600">{vendorCategoryLabel(vendor.category)}</td>
                  <td className="px-4 py-3 text-plum-400">{vendor.contactEmail ?? "—"}</td>
                  <td className="px-4 py-3 text-plum-400">{vendor.phone ?? "—"}</td>
                </tr>
              ))}
              {vendors && vendors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-plum-400">
                    No vendors yet.
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
