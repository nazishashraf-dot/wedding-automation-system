"use client";

import { useEffect, useState } from "react";
import { ApiError, Vendor, VendorCategory, createVendor, listVendors } from "@/lib/api";
import { vendorCategoryLabel } from "@/lib/format";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vendors</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {showForm ? "Cancel" : "New Vendor"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
            <input
              required
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Category</label>
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
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Contact email
            </label>
            <input
              type="email"
              className={inputClass}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
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
              {submitting ? "Saving..." : "Save Vendor"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <label className="mr-2 text-xs font-medium text-neutral-600">Filter by category:</label>
        <select
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
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

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Contact email</th>
              <th className="px-4 py-2">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {vendors?.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-neutral-50">
                <td className="px-4 py-2 font-medium">{vendor.name}</td>
                <td className="px-4 py-2">{vendorCategoryLabel(vendor.category)}</td>
                <td className="px-4 py-2 text-neutral-500">{vendor.contactEmail ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-500">{vendor.phone ?? "—"}</td>
              </tr>
            ))}
            {vendors && vendors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  No vendors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
