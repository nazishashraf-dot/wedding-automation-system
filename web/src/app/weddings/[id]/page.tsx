"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  Task,
  Vendor,
  Wedding,
  createWeddingTask,
  getWedding,
  linkVendorToWedding,
  listVendors,
  listWeddingTasks,
  regenerateTimeline,
  updateTask,
  updateWedding,
  updateWeddingVendorLink,
} from "@/lib/api";
import {
  formatDate,
  formatMoney,
  planningStatusLabel,
  taskPriorityLabel,
  taskStatusLabel,
  vendorCategoryLabel,
} from "@/lib/format";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

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

  useEffect(() => {
    refresh();
    refreshTasks();
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

  if (error && !wedding) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!wedding) {
    return <p className="text-sm text-neutral-500">Loading...</p>;
  }

  const linkedVendorIds = new Set(wedding.vendors?.map((v) => v.vendorId));
  const linkableVendors = allVendors.filter((v) => !linkedVendorIds.has(v.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {wedding.client?.fullName}
          {wedding.client?.partnerName ? ` & ${wedding.client.partnerName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {formatDate(wedding.weddingDate)} · {wedding.venue ?? "Venue TBD"} ·{" "}
          {planningStatusLabel(wedding.planningStatus)}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Budget</h2>
        <form onSubmit={handleBudgetSave} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Budget total
            </label>
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
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Budget spent
            </label>
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
            <button
              type="submit"
              disabled={savingBudget}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {savingBudget ? "Saving..." : "Save Budget"}
            </button>
            {budgetSaved && <span className="text-xs text-green-600">Saved</span>}
          </div>
        </form>
        <p className="mt-3 text-xs text-neutral-400">
          Currently: {formatMoney(wedding.budgetSpent)} spent of{" "}
          {formatMoney(wedding.budgetTotal)}
        </p>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Tasks</h2>
          <div className="flex items-center gap-3">
            {regenerateMessage && (
              <span className="text-xs text-neutral-500">{regenerateMessage}</span>
            )}
            <button
              onClick={handleRegenerateTimeline}
              disabled={regenerating}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            >
              {regenerating ? "Regenerating..." : "Regenerate timeline"}
            </button>
            <button
              onClick={() => setShowTaskForm((s) => !s)}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
            >
              {showTaskForm ? "Cancel" : "+ Add Task"}
            </button>
          </div>
        </div>

        {showTaskForm && (
          <form
            onSubmit={handleAddTask}
            className="mb-4 grid grid-cols-1 gap-3 rounded-md border border-neutral-100 bg-neutral-50 p-3 sm:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
              <input
                required
                className={inputClass}
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Due date</label>
              <input
                required
                type="date"
                className={inputClass}
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Priority</label>
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
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Assignee (optional)
              </label>
              <input
                className={inputClass}
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                disabled={addingTask}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {addingTask ? "Saving..." : "Save Task"}
              </button>
            </div>
          </form>
        )}

        {taskError && <p className="mb-2 text-sm text-red-600">{taskError}</p>}

        <div className="overflow-hidden rounded-md border border-neutral-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Due date</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tasks?.map((task) => (
                <tr key={task.id}>
                  <td className="px-3 py-2 font-medium">{task.title}</td>
                  <td
                    className={`px-3 py-2 ${
                      task.overdue ? "font-medium text-red-600" : ""
                    }`}
                  >
                    {formatDate(task.dueDate)}
                    {task.overdue && (
                      <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                        Overdue
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{taskPriorityLabel(task.priority)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={task.status}
                      onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    >
                      <option value="todo">{taskStatusLabel("todo")}</option>
                      <option value="in_progress">{taskStatusLabel("in_progress")}</option>
                      <option value="done">{taskStatusLabel("done")}</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-400">
                    {task.source === "auto_generated" ? "Auto" : "Manual"}
                  </td>
                </tr>
              ))}
              {tasks && tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-neutral-400">
                    No tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Linked Vendors</h2>

        <div className="mb-4 overflow-hidden rounded-md border border-neutral-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Price quoted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {wedding.vendors?.map((link) => (
                <tr key={link.vendorId}>
                  <td className="px-3 py-2 font-medium">{link.vendor.name}</td>
                  <td className="px-3 py-2">{vendorCategoryLabel(link.vendor.category)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={link.status}
                      onChange={(e) => handleStatusChange(link.vendorId, e.target.value)}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    >
                      <option value="contacted">Contacted</option>
                      <option value="quoted">Quoted</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">{formatMoney(link.priceQuoted)}</td>
                </tr>
              ))}
              {(!wedding.vendors || wedding.vendors.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-neutral-400">
                    No vendors linked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleLinkVendor} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Link a vendor
            </label>
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
          <button
            type="submit"
            disabled={linking || !selectedVendorId}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {linking ? "Linking..." : "Link Vendor"}
          </button>
        </form>
        {linkError && <p className="mt-2 text-sm text-red-600">{linkError}</p>}
      </section>

      {wedding.styleNotes && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">Style Notes</h2>
          <p className="text-sm text-neutral-600">{wedding.styleNotes}</p>
        </section>
      )}
    </div>
  );
}
