"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, DashboardData, getDashboard } from "@/lib/api";
import {
  formatCountdown,
  formatDate,
  formatDateTime,
  formatOverdue,
  meetingTypeLabel,
  planningStatusLabel,
  taskPriorityLabel,
} from "@/lib/format";

function coupleName(client: { fullName: string; partnerName: string | null }): string {
  return client.partnerName ? `${client.fullName} & ${client.partnerName}` : client.fullName;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load dashboard"));
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-neutral-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {data.needsAttention.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-amber-900">Needs Attention</h2>
          <ul className="space-y-2">
            {data.needsAttention.map((item) => (
              <li key={item.weddingId}>
                <Link
                  href={`/weddings/${item.weddingId}`}
                  className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm hover:bg-amber-100/50"
                >
                  <span className="font-medium text-neutral-900">
                    {coupleName(item.client)}
                    <span className="ml-2 font-normal text-neutral-500">
                      {formatCountdown(item.daysUntil)}
                    </span>
                  </span>
                  <span className="text-xs text-amber-700">{item.reasons.join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Today&apos;s Meetings</h2>
          {data.todayMeetings.length === 0 ? (
            <p className="text-sm text-neutral-400">No meetings today.</p>
          ) : (
            <ul className="space-y-2">
              {data.todayMeetings.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/weddings/${m.wedding.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    <span>
                      <span className="font-medium">{m.title}</span>
                      <span className="ml-2 text-neutral-500">{coupleName(m.wedding.client)}</span>
                    </span>
                    <span className="text-xs text-neutral-400">{formatDateTime(m.scheduledAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">This Week&apos;s Meetings</h2>
          {data.weekMeetings.length === 0 ? (
            <p className="text-sm text-neutral-400">No meetings this week.</p>
          ) : (
            <ul className="space-y-2">
              {data.weekMeetings.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/weddings/${m.wedding.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    <span>
                      <span className="font-medium">{m.title}</span>
                      <span className="ml-2 text-neutral-500">{coupleName(m.wedding.client)}</span>
                      <span className="ml-2 text-xs text-neutral-400">
                        {meetingTypeLabel(m.type)}
                      </span>
                    </span>
                    <span className="text-xs text-neutral-400">{formatDateTime(m.scheduledAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Overdue Tasks</h2>
        {data.overdueTasks.length === 0 ? (
          <p className="text-sm text-neutral-400">Nothing overdue. Nice work.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-neutral-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Task</th>
                  <th className="px-3 py-2">Wedding</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.overdueTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 font-medium">{task.title}</td>
                    <td className="px-3 py-2">
                      <Link href={`/weddings/${task.wedding.id}`} className="hover:underline">
                        {coupleName(task.wedding.client)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{taskPriorityLabel(task.priority)}</td>
                    <td className="px-3 py-2 font-medium text-red-600">
                      {formatOverdue(task.daysOverdue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Upcoming Weddings</h2>
        {data.upcomingWeddings.length === 0 ? (
          <p className="text-sm text-neutral-400">Nothing in the next 90 days.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.upcomingWeddings.map((w) => (
              <Link
                key={w.id}
                href={`/weddings/${w.id}`}
                className="rounded-md border border-neutral-200 p-3 hover:border-neutral-400"
              >
                <p className="font-medium text-neutral-900">{coupleName(w.client)}</p>
                <p className="mt-1 text-sm text-neutral-500">{formatDate(w.weddingDate)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    {planningStatusLabel(w.planningStatus)}
                  </span>
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
                    {formatCountdown(w.daysUntil)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
