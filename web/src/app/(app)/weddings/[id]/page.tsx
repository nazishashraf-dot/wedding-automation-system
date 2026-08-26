"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  CalendarEventType,
  Document,
  Meeting,
  Payment,
  PaymentDirection,
  Task,
  Vendor,
  Wedding,
  WeddingVendorLink,
  createWeddingMeeting,
  createWeddingPayment,
  createWeddingTask,
  deleteDocument,
  deleteMeeting,
  deletePayment,
  getWedding,
  linkVendorToWedding,
  listVendors,
  listWeddingDocuments,
  listWeddingMeetings,
  listWeddingPayments,
  listWeddingTasks,
  regenerateTimeline,
  updatePayment,
  updateTask,
  updateWedding,
  updateWeddingVendorLink,
  uploadWeddingDocument,
} from "@/lib/api";
import {
  documentTypeLabel,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatMoney,
  meetingTypeLabel,
  paymentDirectionLabel,
  paymentStatusLabel,
  planningStatusLabel,
  taskPriorityLabel,
  taskStatusLabel,
  vendorCategoryLabel,
} from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";
import Badge from "@/components/Badge";
import CoupleName from "@/components/CoupleName";
import PhotoBackdrop from "@/components/PhotoBackdrop";
import DeleteButton from "@/components/DeleteButton";
import { useAuth } from "@/components/AuthProvider";
import {
  btnGhostSageSm,
  btnPrimary,
  btnPrimarySm,
  btnSecondarySm,
  cardClass,
  documentTypeTone,
  inputClass,
  linkRose,
  paymentStatusTone,
  planningStatusTone,
  selectSmClass,
  selectToneClasses,
  taskStatusTone,
  vendorLinkStatusTone,
  weddingPhotoFor,
} from "@/lib/ui";

function formatMonthYear(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const linkWine = "text-xs font-medium text-wine-500 hover:text-wine-600 hover:underline";

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

export default function WeddingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [budgetTotal, setBudgetTotal] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [linkPriceQuoted, setLinkPriceQuoted] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const [regenerating, setRegenerating] = useState(false);
  const [regenerateMessage, setRegenerateMessage] = useState<string | null>(null);

  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingScheduledAt, setMeetingScheduledAt] = useState("");
  const [meetingType, setMeetingType] = useState<CalendarEventType>("client_meeting");
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);

  const [linkCopied, setLinkCopied] = useState(false);

  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function vendorPaidTotal(vendorId: string): number {
    return (payments ?? [])
      .filter((p) => p.direction === "outgoing" && p.status === "paid" && p.vendorId === vendorId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  function vendorPaymentProgressText(quoted: number | null, paid: number): string {
    if (quoted === null && paid === 0) return "No price set";
    if (quoted === null) return `${formatMoney(paid)} paid`;
    if (paid === 0) return `${formatMoney(quoted)} quoted`;
    return `${formatMoney(quoted)} quoted · ${formatMoney(paid)} paid`;
  }

  function handleQuickAddVendorPayment(link: WeddingVendorLink) {
    setPaymentDirection("outgoing");
    setPaymentVendorId(link.vendorId);
    setPaymentDescription(`${link.vendor.name} payment`);
    setPaymentAmount(link.priceQuoted ?? "");
    setShowPaymentForm(true);
    paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function refresh() {
    try {
      const data = await getWedding(id);
      setWedding(data);
      setBudgetTotal(data.budgetTotal ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load wedding");
    }
  }

  async function refreshTasks() {
    try {
      const data = await listWeddingTasks(id);
      setTasks(data);
      setTaskError(null);
    } catch (err) {
      setTaskError(err instanceof ApiError ? err.message : "Failed to load tasks");
    }
  }

  async function refreshMeetings() {
    try {
      const data = await listWeddingMeetings(id);
      setMeetings(data);
      setMeetingError(null);
    } catch (err) {
      setMeetingError(err instanceof ApiError ? err.message : "Failed to load meetings");
    }
  }

  async function refreshDocuments() {
    try {
      const data = await listWeddingDocuments(id);
      setDocuments(data);
      setDocumentError(null);
    } catch (err) {
      setDocumentError(err instanceof ApiError ? err.message : "Failed to load documents");
    }
  }

  async function refreshPayments() {
    try {
      const data = await listWeddingPayments(id);
      setPayments(data);
      setPaymentError(null);
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Failed to load payments");
    }
  }

  useEffect(() => {
    refresh();
    refreshTasks();
    refreshMeetings();
    refreshDocuments();
    refreshPayments();
    listVendors()
      .then(setAllVendors)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    setAddingPayment(true);
    setPaymentError(null);
    try {
      await createWeddingPayment(id, {
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
      await refresh(); // budget totals depend on paid payments, but a new one may already affect display context
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
      await refresh();
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Failed to update payment");
    }
  }

  async function handleDeletePayment(paymentId: string) {
    try {
      await deletePayment(paymentId);
      await refreshPayments();
      await refresh();
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Failed to delete payment");
    }
  }

  async function handleUploadFile(file: File) {
    setUploading(true);
    setUploadProgress(0);
    setDocumentError(null);
    try {
      await uploadWeddingDocument(id, file, setUploadProgress);
      await refreshDocuments();
    } catch (err) {
      setDocumentError(err instanceof ApiError ? err.message : "Failed to upload file");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUploadFile(file);
  }

  async function handleDeleteDocument(documentId: string) {
    try {
      await deleteDocument(documentId);
      await refreshDocuments();
    } catch (err) {
      setDocumentError(err instanceof ApiError ? err.message : "Failed to delete document");
    }
  }

  async function handleBudgetSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingBudget(true);
    setBudgetSaved(false);
    try {
      await updateWedding(id, {
        budgetTotal: budgetTotal === "" ? undefined : Number(budgetTotal),
      });
      await refresh();
      setBudgetSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update budget");
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleLinkVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVendorId) return;
    setLinking(true);
    setLinkError(null);
    try {
      await linkVendorToWedding(id, {
        vendorId: selectedVendorId,
        status: "contacted",
        priceQuoted: linkPriceQuoted === "" ? undefined : Number(linkPriceQuoted),
      });
      setSelectedVendorId("");
      setLinkPriceQuoted("");
      await refresh();
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : "Failed to link vendor");
    } finally {
      setLinking(false);
    }
  }

  async function handleStatusChange(vendorId: string, status: string) {
    try {
      await updateWeddingVendorLink(id, vendorId, {
        status: status as "contacted" | "quoted" | "confirmed",
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update vendor status");
    }
  }

  async function handleVendorPriceChange(vendorId: string, priceQuoted: number) {
    try {
      await updateWeddingVendorLink(id, vendorId, { priceQuoted });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update vendor price");
    }
  }

  async function handleTaskStatusChange(taskId: string, status: string) {
    try {
      await updateTask(taskId, { status: status as "todo" | "in_progress" | "done" });
      await refreshTasks();
    } catch (err) {
      setTaskError(err instanceof ApiError ? err.message : "Failed to update task");
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    setAddingTask(true);
    setTaskError(null);
    try {
      await createWeddingTask(id, {
        title: taskTitle,
        dueDate: taskDueDate,
        priority: taskPriority,
        assignee: taskAssignee || undefined,
      });
      setTaskTitle("");
      setTaskDueDate("");
      setTaskPriority("medium");
      setTaskAssignee("");
      setShowTaskForm(false);
      await refreshTasks();
    } catch (err) {
      setTaskError(err instanceof ApiError ? err.message : "Failed to add task");
    } finally {
      setAddingTask(false);
    }
  }

  async function handleRegenerateTimeline() {
    setRegenerating(true);
    setRegenerateMessage(null);
    try {
      const result = await regenerateTimeline(id);
      setRegenerateMessage(
        `${result.created} task${result.created === 1 ? "" : "s"} added` +
          (result.skippedExisting > 0 ? `, ${result.skippedExisting} already existed` : "") +
          (result.skippedPast > 0 ? `, ${result.skippedPast} skipped (past due)` : "")
      );
      await refreshTasks();
    } catch (err) {
      setTaskError(err instanceof ApiError ? err.message : "Failed to regenerate timeline");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleScheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    setSchedulingMeeting(true);
    setMeetingError(null);
    try {
      await createWeddingMeeting(id, {
        title: meetingTitle,
        scheduledAt: new Date(meetingScheduledAt).toISOString(),
        type: meetingType,
      });
      setMeetingTitle("");
      setMeetingScheduledAt("");
      setMeetingType("client_meeting");
      setShowMeetingForm(false);
      await refreshMeetings();
    } catch (err) {
      setMeetingError(err instanceof ApiError ? err.message : "Failed to schedule meeting");
    } finally {
      setSchedulingMeeting(false);
    }
  }

  async function handleDeleteMeeting(meetingId: string) {
    try {
      await deleteMeeting(meetingId);
      await refreshMeetings();
    } catch (err) {
      setMeetingError(err instanceof ApiError ? err.message : "Failed to cancel meeting");
    }
  }

  async function handleCopyIntakeLink() {
    const url = `${window.location.origin}/forms/intake/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore, button just won't confirm.
    }
  }

  if (error && !wedding) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }

  if (!wedding) {
    return <p className="text-sm text-plum-400">Loading...</p>;
  }

  const linkedVendorIds = new Set(wedding.vendors?.map((v) => v.vendorId));
  const linkableVendors = allVendors.filter((v) => !linkedVendorIds.has(v.id));
  const outstandingBalance = (Number(wedding.budgetTotal) || 0) - (Number(wedding.totalSpent) || 0);

  return (
    <div className="-mx-4 -mt-10 space-y-6 sm:-mx-6">
      <div className="relative flex h-[260px] flex-col justify-end overflow-hidden sm:h-[300px]">
        <PhotoBackdrop
          src={weddingPhotoFor(wedding.id)}
          blurred
          scrimClassName="bg-photo-scrim-soft"
        />
        <button
          onClick={handleCopyIntakeLink}
          className="absolute right-4 top-4 z-10 inline-flex items-center justify-center rounded-full bg-ivory/95 px-4 py-1.5 text-xs font-medium text-wine-600 shadow-soft transition-colors hover:bg-ivory sm:right-8 sm:top-6"
        >
          {linkCopied ? "Copied!" : "Copy intake form link"}
        </button>
        <div className="relative z-10 px-4 pb-6 sm:px-8 sm:pb-8">
          {wedding.client?.partnerName && (
            <p className="font-script text-lg text-gold-200 sm:text-xl">
              est. {formatMonthYear(wedding.weddingDate)}
            </p>
          )}
          <h1 className="font-heading text-3xl font-semibold leading-tight text-ivory sm:text-4xl md:text-5xl">
            {wedding.client ? (
              <CoupleName
                fullName={wedding.client.fullName}
                partnerName={wedding.client.partnerName}
                ampersandClassName="text-gold-200"
              />
            ) : (
              "—"
            )}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ivory/85">
            <span>{formatDate(wedding.weddingDate)}</span>
            <span aria-hidden>·</span>
            <span>{wedding.venue ?? "Venue to be confirmed"}</span>
            <Badge tone={planningStatusTone(wedding.planningStatus)}>
              {planningStatusLabel(wedding.planningStatus)}
            </Badge>
          </p>
        </div>
      </div>

      <div className="space-y-6 px-4 sm:px-6">
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <section className={cardClass}>
        <SectionHeading>Client Intake</SectionHeading>
        {wedding.intakeSubmittedAt ? (
          <>
            <p className="mb-4 text-xs text-plum-400">
              Submitted {formatDate(wedding.intakeSubmittedAt)}
            </p>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-plum-400">Partner name</dt>
                <dd className="mt-1 text-sm text-plum-600">
                  {wedding.client?.partnerName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-plum-400">Phone</dt>
                <dd className="mt-1 text-sm text-plum-600">{wedding.client?.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-plum-400">
                  Estimated guest count
                </dt>
                <dd className="mt-1 text-sm text-plum-600">
                  {wedding.guestCountEstimate ?? "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-plum-400">
                  Style / theme notes
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-plum-600">
                  {wedding.styleNotes || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-plum-400">
                  Additional notes
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-plum-600">
                  {wedding.intakeNotes || "—"}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-gold-200 bg-ivory-100/60 px-4 py-6 text-center text-sm text-plum-400">
            No intake form submission received yet. Use the &ldquo;Copy intake form
            link&rdquo; button above to send the couple their form.
          </p>
        )}
      </section>

      <section className={cardClass}>
        <SectionHeading>Budget</SectionHeading>
        <form onSubmit={handleBudgetSave} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Budget total</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={budgetTotal}
              onChange={(e) => setBudgetTotal(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={savingBudget} className={btnPrimary}>
              {savingBudget ? "Saving..." : "Save Budget"}
            </button>
            {budgetSaved && <span className="text-xs font-medium text-sage-700">Saved</span>}
          </div>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-plum-400">Budget Total</p>
            <p className="mt-1 font-heading text-xl font-semibold text-plum">
              {formatMoney(wedding.budgetTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-plum-400">Total Spent</p>
            <p className="mt-1 font-heading text-xl font-semibold text-plum">
              {formatMoney(wedding.totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-plum-400">Total Collected</p>
            <p className="mt-1 font-heading text-xl font-semibold text-sage-700">
              {formatMoney(wedding.totalCollected)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-plum-400">Outstanding Balance</p>
            <p
              className={`mt-1 font-heading text-xl font-semibold ${
                outstandingBalance > 0 ? "text-rose-700" : "text-plum"
              }`}
            >
              {formatMoney(outstandingBalance)}
            </p>
          </div>
        </div>
      </section>

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
        <SectionHeading
          action={
            <>
              {regenerateMessage && (
                <span className="text-xs text-plum-400">{regenerateMessage}</span>
              )}
              <button
                onClick={handleRegenerateTimeline}
                disabled={regenerating}
                className={btnSecondarySm}
              >
                {regenerating ? "Regenerating..." : "Regenerate timeline"}
              </button>
              <button onClick={() => setShowTaskForm((s) => !s)} className={btnPrimarySm}>
                {showTaskForm ? "Cancel" : "+ Add Task"}
              </button>
            </>
          }
        >
          Tasks
        </SectionHeading>

        {showTaskForm && (
          <form
            onSubmit={handleAddTask}
            className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gold-100 bg-ivory-100/60 p-4 sm:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-plum-600">Title</label>
              <input
                required
                className={inputClass}
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-plum-600">Due date</label>
              <input
                required
                type="date"
                className={inputClass}
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-plum-600">Priority</label>
              <select
                className={inputClass}
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as "low" | "medium" | "high")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-plum-600">
                Assignee (optional)
              </label>
              <input
                className={inputClass}
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <button type="submit" disabled={addingTask} className={btnPrimary}>
                {addingTask ? "Saving..." : "Save Task"}
              </button>
            </div>
          </form>
        )}

        {taskError && <p className="mb-2 text-sm text-rose-700">{taskError}</p>}

        {tasks && tasks.length === 0 && (
          <p className="rounded-lg border border-gold-100 px-3 py-6 text-center text-sm text-plum-400">
            No tasks yet.
          </p>
        )}

        {tasks && tasks.length > 0 && (
          <>
            {/* Mobile: stacked cards. */}
            <div className="space-y-3 sm:hidden">
              {tasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-gold-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-plum">{task.title}</p>
                    {task.overdue && <Badge tone="rose">Overdue</Badge>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-plum-400">
                    <span>Due {formatDate(task.dueDate)}</span>
                    <span>{taskPriorityLabel(task.priority)} priority</span>
                    <span>{task.source === "auto_generated" ? "Auto" : "Manual"}</span>
                  </div>
                  <select
                    value={task.status}
                    onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                    className={`mt-2.5 ${selectSmClass} ${selectToneClasses[taskStatusTone(task.status)]}`}
                  >
                    <option value="todo">{taskStatusLabel("todo")}</option>
                    <option value="in_progress">{taskStatusLabel("in_progress")}</option>
                    <option value="done">{taskStatusLabel("done")}</option>
                  </select>
                </div>
              ))}
            </div>

            {/* Tablet and up: full table. */}
            <div className="hidden overflow-x-auto rounded-lg border border-gold-100 sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Due date</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-3 py-2 font-medium text-plum">{task.title}</td>
                      <td className="px-3 py-2 text-plum-600">
                        <span className="flex items-center gap-1.5">
                          {formatDate(task.dueDate)}
                          {task.overdue && <Badge tone="rose">Overdue</Badge>}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-plum-600">{taskPriorityLabel(task.priority)}</td>
                      <td className="px-3 py-2">
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                          className={`${selectSmClass} ${selectToneClasses[taskStatusTone(task.status)]}`}
                        >
                          <option value="todo">{taskStatusLabel("todo")}</option>
                          <option value="in_progress">{taskStatusLabel("in_progress")}</option>
                          <option value="done">{taskStatusLabel("done")}</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs text-plum-400">
                        {task.source === "auto_generated" ? "Auto" : "Manual"}
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
        <SectionHeading
          action={
            <button onClick={() => setShowMeetingForm((s) => !s)} className={btnPrimarySm}>
              {showMeetingForm ? "Cancel" : "Schedule Meeting"}
            </button>
          }
        >
          Upcoming Meetings
        </SectionHeading>

        {showMeetingForm && (
          <form
            onSubmit={handleScheduleMeeting}
            className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gold-100 bg-ivory-100/60 p-4 sm:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-plum-600">Title</label>
              <input
                required
                className={inputClass}
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-plum-600">Date &amp; time</label>
              <input
                required
                type="datetime-local"
                className={inputClass}
                value={meetingScheduledAt}
                onChange={(e) => setMeetingScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-plum-600">Type</label>
              <select
                className={inputClass}
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as CalendarEventType)}
              >
                <option value="client_meeting">Client Meeting</option>
                <option value="vendor_meeting">Vendor Meeting</option>
                <option value="milestone">Milestone</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
            <div className="flex items-end sm:col-span-4">
              <button type="submit" disabled={schedulingMeeting} className={btnPrimary}>
                {schedulingMeeting ? "Scheduling..." : "Save Meeting"}
              </button>
            </div>
          </form>
        )}

        {meetingError && <p className="mb-2 text-sm text-rose-700">{meetingError}</p>}

        {meetings && meetings.length === 0 && (
          <p className="rounded-lg border border-gold-100 px-3 py-6 text-center text-sm text-plum-400">
            No meetings scheduled.
          </p>
        )}

        {meetings && meetings.length > 0 && (
          <>
            {/* Mobile: stacked cards. */}
            <div className="space-y-3 sm:hidden">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="rounded-lg border border-gold-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-plum">{meeting.title}</p>
                    <button onClick={() => handleDeleteMeeting(meeting.id)} className={linkRose}>
                      Cancel
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-plum-400">
                    {formatDateTime(meeting.scheduledAt)} · {meetingTypeLabel(meeting.type)}
                  </p>
                  <div className="mt-2.5">
                    <Badge tone={meeting.googleEventId ? "sage" : "neutral"}>
                      {meeting.googleEventId ? "Synced" : "Not synced"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet and up: full table. */}
            <div className="hidden overflow-x-auto rounded-lg border border-gold-100 sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Calendar</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {meetings.map((meeting) => (
                    <tr key={meeting.id}>
                      <td className="px-3 py-2 font-medium text-plum">{meeting.title}</td>
                      <td className="px-3 py-2 text-plum-600">{formatDateTime(meeting.scheduledAt)}</td>
                      <td className="px-3 py-2 text-plum-600">{meetingTypeLabel(meeting.type)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={meeting.googleEventId ? "sage" : "neutral"}>
                          {meeting.googleEventId ? "Synced" : "Not synced"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => handleDeleteMeeting(meeting.id)} className={linkRose}>
                          Cancel
                        </button>
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

      <section className={cardClass}>
        <SectionHeading>Documents</SectionHeading>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`mb-4 cursor-pointer rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragActive
              ? "border-wine-400 bg-wine-50"
              : "border-gold-200 bg-ivory-100/60 hover:border-gold-300"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />
          {uploading ? (
            <div className="space-y-2">
              <p className="text-sm text-plum-600">Uploading... {uploadProgress}%</p>
              <div className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gold-100">
                <div
                  className="h-full bg-wine-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-plum-400">
              <span className="font-medium text-wine-500">Click to upload</span> or drag and drop
              a file here — PDFs, images, and common document formats, up to 10MB.
            </p>
          )}
        </div>

        {documentError && <p className="mb-3 text-sm text-rose-700">{documentError}</p>}

        {documents && documents.length === 0 && (
          <p className="rounded-lg border border-gold-100 px-3 py-6 text-center text-sm text-plum-400">
            No documents yet.
          </p>
        )}

        {documents && documents.length > 0 && (
          <>
            {/* Mobile: stacked cards. */}
            <div className="space-y-3 sm:hidden">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-gold-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="break-all font-medium text-plum">{doc.fileName}</p>
                    <Badge tone={documentTypeTone(doc.fileType)}>
                      {documentTypeLabel(doc.fileType)}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-plum-400">
                    <span>{formatFileSize(doc.fileSizeBytes)}</span>
                    <span>Uploaded by {doc.uploadedBy.name}</span>
                    <span>{formatDate(doc.uploadedAt)}</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-4">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className={linkWine}>
                      View / Download
                    </a>
                    {isOwner && <DeleteButton onDelete={() => handleDeleteDocument(doc.id)} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet and up: full table. */}
            <div className="hidden overflow-x-auto rounded-lg border border-gold-100 sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Size</th>
                    <th className="px-3 py-2 font-medium">Uploaded by</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-3 py-2 font-medium text-plum">{doc.fileName}</td>
                      <td className="px-3 py-2">
                        <Badge tone={documentTypeTone(doc.fileType)}>
                          {documentTypeLabel(doc.fileType)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-plum-600">
                        {formatFileSize(doc.fileSizeBytes)}
                      </td>
                      <td className="px-3 py-2 text-plum-600">{doc.uploadedBy.name}</td>
                      <td className="px-3 py-2 text-plum-400">{formatDate(doc.uploadedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkWine}
                          >
                            View
                          </a>
                          {isOwner && (
                            <DeleteButton onDelete={() => handleDeleteDocument(doc.id)} />
                          )}
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

      </div>
    </div>
  );
}
