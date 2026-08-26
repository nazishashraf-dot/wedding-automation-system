"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  CalendarEventType,
  Meeting,
  Task,
  Vendor,
  Wedding,
  createWeddingMeeting,
  createWeddingTask,
  deleteMeeting,
  getWedding,
  linkVendorToWedding,
  listVendors,
  listWeddingMeetings,
  listWeddingTasks,
  regenerateTimeline,
  updateTask,
  updateWedding,
  updateWeddingVendorLink,
} from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  meetingTypeLabel,
  planningStatusLabel,
  taskPriorityLabel,
  taskStatusLabel,
  vendorCategoryLabel,
} from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";
import Badge from "@/components/Badge";
import CoupleName from "@/components/CoupleName";
import PhotoBackdrop from "@/components/PhotoBackdrop";
import {
  btnPrimary,
  btnPrimarySm,
  btnSecondarySm,
  cardClass,
  inputClass,
  linkRose,
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
  const [budgetSpent, setBudgetSpent] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  const [selectedVendorId, setSelectedVendorId] = useState("");
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

  async function refresh() {
    try {
      const data = await getWedding(id);
      setWedding(data);
      setBudgetTotal(data.budgetTotal ?? "");
      setBudgetSpent(data.budgetSpent ?? "0");
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

  useEffect(() => {
    refresh();
    refreshTasks();
    refreshMeetings();
    listVendors()
      .then(setAllVendors)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleBudgetSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingBudget(true);
    setBudgetSaved(false);
    try {
      await updateWedding(id, {
        budgetTotal: budgetTotal === "" ? undefined : Number(budgetTotal),
        budgetSpent: budgetSpent === "" ? undefined : Number(budgetSpent),
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
      await linkVendorToWedding(id, { vendorId: selectedVendorId, status: "contacted" });
      setSelectedVendorId("");
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
        <SectionHeading>Budget</SectionHeading>
        <form onSubmit={handleBudgetSave} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <div>
            <label className="mb-1 block text-xs font-medium text-plum-600">Budget spent</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={budgetSpent}
              onChange={(e) => setBudgetSpent(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" disabled={savingBudget} className={btnPrimary}>
              {savingBudget ? "Saving..." : "Save Budget"}
            </button>
            {budgetSaved && <span className="text-xs font-medium text-sage-700">Saved</span>}
          </div>
        </form>
        <p className="mt-4 text-xs text-plum-400">
          Currently: <span className="font-medium text-plum-600">{formatMoney(wedding.budgetSpent)}</span>{" "}
          spent of <span className="font-medium text-plum-600">{formatMoney(wedding.budgetTotal)}</span>
        </p>
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

        <div className="overflow-x-auto rounded-lg border border-gold-100">
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
              {tasks?.map((task) => (
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
              {tasks && tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-plum-400">
                    No tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

        <div className="overflow-x-auto rounded-lg border border-gold-100">
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
              {meetings?.map((meeting) => (
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
              {meetings && meetings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-plum-400">
                    No meetings scheduled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cardClass}>
        <SectionHeading>Linked Vendors</SectionHeading>

        <div className="mb-4 overflow-x-auto rounded-lg border border-gold-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
              <tr>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Price quoted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {wedding.vendors?.map((link) => (
                <tr key={link.vendorId}>
                  <td className="px-3 py-2 font-medium text-plum">{link.vendor.name}</td>
                  <td className="px-3 py-2 text-plum-600">{vendorCategoryLabel(link.vendor.category)}</td>
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
                  <td className="px-3 py-2 text-plum-600">{formatMoney(link.priceQuoted)}</td>
                </tr>
              ))}
              {(!wedding.vendors || wedding.vendors.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-plum-400">
                    No vendors linked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
          <button type="submit" disabled={linking || !selectedVendorId} className={btnPrimary}>
            {linking ? "Linking..." : "Link Vendor"}
          </button>
        </form>
        {linkError && <p className="mt-2 text-sm text-rose-700">{linkError}</p>}
      </section>

      {wedding.styleNotes && (
        <section className={cardClass}>
          <SectionHeading>Style Notes</SectionHeading>
          <p className="text-sm leading-relaxed text-plum-600">{wedding.styleNotes}</p>
        </section>
      )}
      </div>
    </div>
  );
}
