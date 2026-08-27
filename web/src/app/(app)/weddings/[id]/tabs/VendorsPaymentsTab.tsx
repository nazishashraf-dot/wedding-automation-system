"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  Payment,
  PaymentDirection,
  Vendor,
  Wedding,
  WeddingVendorLink,
  createWeddingPayment,
  deletePayment,
  linkVendorToWedding,
  listVendors,
  listWeddingPayments,
  updatePayment,
  updateWeddingVendorLink,
} from "@/lib/api";
import { formatDate, formatMoney, paymentDirectionLabel, paymentStatusLabel, vendorCategoryLabel } from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";
import Badge from "@/components/Badge";
import DeleteButton from "@/components/DeleteButton";
import {
  btnGhostSageSm,
  btnPrimary,
  btnPrimarySm,
  btnSecondarySm,
  cardClass,
  inputClass,
  paymentStatusTone,
  selectSmClass,
  selectToneClasses,
  vendorLinkStatusTone,
} from "@/lib/ui";

// Click-to-edit price, used for a linked vendor's "Price quoted" — no
// modal, no page navigation, just swaps the display text for a small input
// in place (same lightweight feel as the status dropdown next to it).
function InlinePriceEditor({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (price: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value ?? "");
          setEditing(true);
        }}
        className="rounded text-sm text-plum-600 underline decoration-dotted underline-offset-2 transition-colors hover:text-wine-500"
        title="Click to edit price"
      >
        {formatMoney(value)}
      </button>
    );
  }

  async function handleSave() {
    const num = Number(draft);
    if (draft === "" || Number.isNaN(num) || num < 0) return;
    setSaving(true);
    try {
      await onSave(num);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        type="number"
        min="0"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-24 rounded-lg border border-gold-200 bg-white px-2 py-1 text-sm text-plum focus:border-wine-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-medium text-sage-700 hover:text-sage-900 disabled:opacity-50"
      >
        {saving ? "..." : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs font-medium text-plum-400 hover:text-plum-600"
      >
        Cancel
      </button>
    </div>
  );
}

function vendorPaymentProgressText(quoted: number | null, paid: number): string {
  if (quoted === null && paid === 0) return "No price set";
  if (quoted === null) return `${formatMoney(paid)} paid`;
  if (paid === 0) return `${formatMoney(quoted)} quoted`;
  return `${formatMoney(quoted)} quoted · ${formatMoney(paid)} paid`;
}

export default function VendorsPaymentsTab({
  weddingId,
  wedding,
  onWeddingRefresh,
  isOwner,
}: {
  weddingId: string;
  wedding: Wedding;
  onWeddingRefresh: () => Promise<void>;
  isOwner: boolean;
}) {
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [linkPriceQuoted, setLinkPriceQuoted] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentDirection, setPaymentDirection] = useState<PaymentDirection>("incoming");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paymentVendorId, setPaymentVendorId] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  async function refreshPayments() {
    try {
      const data = await listWeddingPayments(weddingId);
      setPayments(data);
      setPaymentError(null);
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Failed to load payments");
    }
  }

  useEffect(() => {
    refreshPayments();
    listVendors()
      .then(setAllVendors)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId]);

  function vendorPaidTotal(vendorId: string): number {
    return (payments ?? [])
      .filter((p) => p.direction === "outgoing" && p.status === "paid" && p.vendorId === vendorId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  function handleQuickAddVendorPayment(link: WeddingVendorLink) {
    setPaymentDirection("outgoing");
    setPaymentVendorId(link.vendorId);
    setPaymentDescription(`${link.vendor.name} payment`);
    setPaymentAmount(link.priceQuoted ?? "");
    setShowPaymentForm(true);
    paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    setAddingPayment(true);
    setPaymentError(null);
    try {
      await createWeddingPayment(weddingId, {
        direction: paymentDirection,
        description: paymentDescription,
        amount: Number(paymentAmount),
        dueDate: paymentDueDate,
        vendorId: paymentDirection === "outgoing" && paymentVendorId ? paymentVendorId : undefined,
      });
      setPaymentDescription("");
      setPaymentAmount("");
      setPaymentDueDate("");
      setPaymentVendorId("");
      setShowPaymentForm(false);
      await refreshPayments();
      await onWeddingRefresh(); // budget totals depend on paid payments
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Failed to add payment");
    } finally {
      setAddingPayment(false);
    }
  }

  async function handleMarkPaymentPaid(paymentId: string) {
    try {
      await updatePayment(paymentId, { status: "paid" });
      await refreshPayments();
      await onWeddingRefresh();
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Failed to update payment");
    }
  }

  async function handleDeletePayment(paymentId: string) {
    try {
      await deletePayment(paymentId);
      await refreshPayments();
      await onWeddingRefresh();
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Failed to delete payment");
    }
  }

  async function handleLinkVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVendorId) return;
    setLinking(true);
    setLinkError(null);
    try {
      await linkVendorToWedding(weddingId, {
        vendorId: selectedVendorId,
        status: "contacted",
        priceQuoted: linkPriceQuoted === "" ? undefined : Number(linkPriceQuoted),
      });
      setSelectedVendorId("");
      setLinkPriceQuoted("");
      await onWeddingRefresh();
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : "Failed to link vendor");
    } finally {
      setLinking(false);
    }
  }

  async function handleStatusChange(vendorId: string, status: string) {
    try {
      await updateWeddingVendorLink(weddingId, vendorId, {
        status: status as "contacted" | "quoted" | "confirmed",
      });
      await onWeddingRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update vendor status");
    }
  }

  async function handleVendorPriceChange(vendorId: string, priceQuoted: number) {
    try {
      await updateWeddingVendorLink(weddingId, vendorId, { priceQuoted });
      await onWeddingRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update vendor price");
    }
  }

  const linkedVendorIds = new Set(wedding.vendors?.map((v) => v.vendorId));
  const linkableVendors = allVendors.filter((v) => !linkedVendorIds.has(v.id));

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <section ref={paymentSectionRef} className={cardClass}>
        <SectionHeading
          action={
            <button onClick={() => setShowPaymentForm((s) => !s)} className={btnPrimarySm}>
              {showPaymentForm ? "Cancel" : "+ Add Payment"}
            </button>
          }
        >
          Payments
        </SectionHeading>

        {showPaymentForm && (
          <form
            onSubmit={handleAddPayment}
            className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gold-100 bg-ivory-100/60 p-4 sm:grid-cols-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-plum-600">Direction</label>
              <select
                className={inputClass}
                value={paymentDirection}
                onChange={(e) => setPaymentDirection(e.target.value as PaymentDirection)}
              >
                <option value="incoming">From Client</option>
                <option value="outgoing">To Vendor</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-plum-600">Description</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Venue deposit"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-plum-600">Amount</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className={inputClass}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-plum-600">Due date</label>
              <input
                required
                type="date"
                className={inputClass}
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
              />
            </div>
            {paymentDirection === "outgoing" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-plum-600">
                  Vendor (optional)
                </label>
                <select
                  className={inputClass}
                  value={paymentVendorId}
                  onChange={(e) => setPaymentVendorId(e.target.value)}
                >
                  <option value="">No vendor</option>
                  {allVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {paymentError && <p className="text-sm text-rose-700 sm:col-span-4">{paymentError}</p>}
            <div className="flex items-end sm:col-span-4">
              <button type="submit" disabled={addingPayment} className={btnPrimary}>
                {addingPayment ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </form>
        )}

        {!showPaymentForm && paymentError && (
          <p className="mb-2 text-sm text-rose-700">{paymentError}</p>
        )}

        {payments && payments.length === 0 && (
          <p className="rounded-lg border border-gold-100 px-3 py-6 text-center text-sm text-plum-400">
            No payments yet.
          </p>
        )}

        {payments && payments.length > 0 && (
          <>
            {/* Mobile: stacked cards. */}
            <div className="space-y-3 sm:hidden">
              {payments.map((p) => (
                <div key={p.id} className="rounded-lg border border-gold-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-plum">{p.description}</p>
                      <p className="text-xs text-plum-400">
                        {paymentDirectionLabel(p.direction)}
                        {p.vendor ? ` · ${p.vendor.name}` : ""}
                      </p>
                    </div>
                    <Badge tone={paymentStatusTone(p.status, p.overdue)}>
                      {p.overdue ? "Overdue" : paymentStatusLabel(p.status)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-plum-600">
                      {formatMoney(p.amount)}
                    </span>
                    <span className="text-xs text-plum-400">Due {formatDate(p.dueDate)}</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-4">
                    {p.status !== "paid" && (
                      <button
                        onClick={() => handleMarkPaymentPaid(p.id)}
                        className={btnGhostSageSm}
                      >
                        Mark as Paid
                      </button>
                    )}
                    {isOwner && <DeleteButton onDelete={() => handleDeletePayment(p.id)} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet and up: full table. */}
            <div className="hidden overflow-x-auto rounded-lg border border-gold-100 sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Direction</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Vendor</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Due date</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">
                        <Badge tone={p.direction === "incoming" ? "sage" : "gold"}>
                          {paymentDirectionLabel(p.direction)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-medium text-plum">{p.description}</td>
                      <td className="px-3 py-2 text-plum-600">{p.vendor?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-plum-600">{formatMoney(p.amount)}</td>
                      <td className="px-3 py-2 text-plum-600">{formatDate(p.dueDate)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={paymentStatusTone(p.status, p.overdue)}>
                          {p.overdue ? "Overdue" : paymentStatusLabel(p.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-4">
                          {p.status !== "paid" && (
                            <button
                              onClick={() => handleMarkPaymentPaid(p.id)}
                              className={btnGhostSageSm}
                            >
                              Mark as Paid
                            </button>
                          )}
                          {isOwner && <DeleteButton onDelete={() => handleDeletePayment(p.id)} />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className={cardClass}>
        <SectionHeading>Linked Vendors</SectionHeading>

        {(!wedding.vendors || wedding.vendors.length === 0) && (
          <p className="mb-4 rounded-lg border border-gold-100 px-3 py-6 text-center text-sm text-plum-400">
            No vendors linked yet.
          </p>
        )}

        {wedding.vendors && wedding.vendors.length > 0 && (
          <>
            {/* Mobile: stacked cards. */}
            <div className="mb-4 space-y-3 sm:hidden">
              {wedding.vendors.map((link) => {
                const quoted = link.priceQuoted ? Number(link.priceQuoted) : null;
                const paidTotal = vendorPaidTotal(link.vendorId);
                const isPaidInFull = quoted !== null && quoted > 0 && paidTotal >= quoted;
                return (
                  <div key={link.vendorId} className="rounded-lg border border-gold-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-plum">{link.vendor.name}</p>
                      <span className="text-xs text-plum-400">
                        {vendorCategoryLabel(link.vendor.category)}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <select
                        value={link.status}
                        onChange={(e) => handleStatusChange(link.vendorId, e.target.value)}
                        className={`${selectSmClass} ${selectToneClasses[vendorLinkStatusTone(link.status)]}`}
                      >
                        <option value="contacted">Contacted</option>
                        <option value="quoted">Quoted</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                      <InlinePriceEditor
                        value={link.priceQuoted}
                        onSave={(price) => handleVendorPriceChange(link.vendorId, price)}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-plum-400">
                        {vendorPaymentProgressText(quoted, paidTotal)}
                      </p>
                      {isPaidInFull && <Badge tone="sage">Paid in full</Badge>}
                    </div>
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={() => handleQuickAddVendorPayment(link)}
                        className={btnSecondarySm}
                      >
                        + Add Payment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet and up: full table. */}
            <div className="mb-4 hidden overflow-x-auto rounded-lg border border-gold-100 sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Vendor</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Price quoted</th>
                    <th className="px-3 py-2 font-medium">Payment progress</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {wedding.vendors.map((link) => {
                    const quoted = link.priceQuoted ? Number(link.priceQuoted) : null;
                    const paidTotal = vendorPaidTotal(link.vendorId);
                    const isPaidInFull = quoted !== null && quoted > 0 && paidTotal >= quoted;
                    return (
                      <tr key={link.vendorId}>
                        <td className="px-3 py-2 font-medium text-plum">{link.vendor.name}</td>
                        <td className="px-3 py-2 text-plum-600">
                          {vendorCategoryLabel(link.vendor.category)}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={link.status}
                            onChange={(e) => handleStatusChange(link.vendorId, e.target.value)}
                            className={`${selectSmClass} ${selectToneClasses[vendorLinkStatusTone(link.status)]}`}
                          >
                            <option value="contacted">Contacted</option>
                            <option value="quoted">Quoted</option>
                            <option value="confirmed">Confirmed</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-plum-600">
                          <InlinePriceEditor
                            value={link.priceQuoted}
                            onSave={(price) => handleVendorPriceChange(link.vendorId, price)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-plum-600">
                              {vendorPaymentProgressText(quoted, paidTotal)}
                            </span>
                            {isPaidInFull && <Badge tone="sage">Paid in full</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleQuickAddVendorPayment(link)}
                            className={btnSecondarySm}
                          >
                            + Add Payment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <form onSubmit={handleLinkVendor} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-plum-600">Link a vendor</label>
            <select
              className={inputClass}
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
            >
              <option value="">Select a vendor</option>
              {linkableVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({vendorCategoryLabel(v.category)})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-40">
            <label className="mb-1 block text-xs font-medium text-plum-600">
              Price quoted (optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputClass}
              value={linkPriceQuoted}
              onChange={(e) => setLinkPriceQuoted(e.target.value)}
            />
          </div>
          <button type="submit" disabled={linking || !selectedVendorId} className={btnPrimary}>
            {linking ? "Linking..." : "Link Vendor"}
          </button>
        </form>
        {linkError && <p className="mt-2 text-sm text-rose-700">{linkError}</p>}
      </section>
    </div>
  );
}
