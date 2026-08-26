"use client";

import { useEffect, useState } from "react";
import { ApiError, Vendor, VendorCategory, createVendor, listVendors } from "@/lib/api";
import { vendorCategoryLabel } from "@/lib/format";
import { btnPrimary, btnSecondary, cardClass, inputClass, vendorCategoryPhoto } from "@/lib/ui";

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
        <h1 className="font-heading text-4xl font-semibold text-wine-600 sm:text-5xl">Vendors</h1>
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

      {vendors && vendors.length === 0 && (
        <div className={`text-center text-plum-400 ${cardClass}`}>No vendors yet.</div>
      )}

      {vendors && vendors.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="overflow-hidden rounded-card border border-gold-100 bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <div
                className="h-32 bg-cover bg-center bg-gold-100"
                style={{ backgroundImage: `url(${vendorCategoryPhoto[vendor.category]})` }}
              />
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-gold-700">
                  {vendorCategoryLabel(vendor.category)}
                </p>
                <p className="mt-1 font-heading text-xl font-semibold text-plum">{vendor.name}</p>
                <p className="mt-2 text-sm text-plum-400">{vendor.contactEmail ?? "No email on file"}</p>
                <p className="text-sm text-plum-400">{vendor.phone ?? "No phone on file"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
