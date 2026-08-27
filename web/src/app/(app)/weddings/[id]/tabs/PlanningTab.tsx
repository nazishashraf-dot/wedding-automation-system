"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  CalendarEventType,
  Meeting,
  Task,
  createWeddingMeeting,
  createWeddingTask,
  deleteMeeting,
  listWeddingMeetings,
  listWeddingTasks,
  regenerateTimeline,
  updateTask,
} from "@/lib/api";
import { formatDate, formatDateTime, meetingTypeLabel, taskPriorityLabel, taskStatusLabel } from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";
import Badge from "@/components/Badge";
import {
  btnPrimary,
  btnPrimarySm,
  btnSecondarySm,
  cardClass,
  inputClass,
  linkRose,
  selectSmClass,
  selectToneClasses,
  taskStatusTone,
} from "@/lib/ui";

export default function PlanningTab({ weddingId }: { weddingId: string }) {
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

  async function refreshTasks() {
    try {
      const data = await listWeddingTasks(weddingId);
      setTasks(data);
      setTaskError(null);
    } catch (err) {
      setTaskError(err instanceof ApiError ? err.message : "Failed to load tasks");
    }
  }

  async function refreshMeetings() {
    try {
      const data = await listWeddingMeetings(weddingId);
      setMeetings(data);
      setMeetingError(null);
    } catch (err) {
      setMeetingError(err instanceof ApiError ? err.message : "Failed to load meetings");
    }
  }

  useEffect(() => {
    refreshTasks();
    refreshMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId]);

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
      await createWeddingTask(weddingId, {
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
      const result = await regenerateTimeline(weddingId);
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
      await createWeddingMeeting(weddingId, {
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

  return (
    <div className="space-y-6">
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
    </div>
  );
}
