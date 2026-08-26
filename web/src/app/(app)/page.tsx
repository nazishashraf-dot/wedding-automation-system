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
import SectionHeading from "@/components/SectionHeading";
import Badge from "@/components/Badge";
import CoupleName from "@/components/CoupleName";
import PhotoBackdrop from "@/components/PhotoBackdrop";
import { cardClass, heroPhotoUrl, planningStatusTone, weddingPhotoFor } from "@/lib/ui";

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
    return <p className="text-sm text-rose-700">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-plum-400">Loading...</p>;
  }

  const nearest = data.upcomingWeddings[0];

  return (
    <div className="-mx-4 -mt-10 sm:-mx-6">
      {/* Hero — the emotional anchor of the page: the single nearest
          upcoming wedding, large and photo-backed, not a stat card. */}
      <div className="relative flex h-[380px] flex-col justify-end overflow-hidden sm:h-[440px] md:h-[500px]">
        <PhotoBackdrop src={heroPhotoUrl} blurred scrimClassName="bg-photo-scrim" />
        <div className="relative z-10 px-4 pb-10 sm:px-10 sm:pb-14 md:px-14">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold-200">
            Wedding Studio
          </p>
          {nearest ? (
            <>
              <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold leading-[1.05] text-ivory sm:text-5xl md:text-6xl">
                {nearest.daysUntil} {nearest.daysUntil === 1 ? "day" : "days"} until{" "}
                <CoupleName
                  fullName={nearest.client.fullName}
                  partnerName={nearest.client.partnerName}
                  ampersandClassName="text-gold-200"
                />
                &apos;s wedding
              </h1>
              <p className="mt-4 text-sm text-ivory/80 sm:text-base">
                {formatDate(nearest.weddingDate)} · {nearest.venue ?? "Venue to be confirmed"}
              </p>
            </>
          ) : (
            <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold leading-[1.05] text-ivory sm:text-5xl md:text-6xl">
              Nothing on the horizon yet
            </h1>
          )}
        </div>
      </div>

      <div className="bg-wash-blush px-4 pb-16 pt-10 sm:px-6">
        <div className="space-y-8">
          <p className="text-sm text-plum-400">
            Everything else that needs your attention today, in one place.
          </p>

          {data.needsAttention.length > 0 && (
          <section>
            <SectionHeading>Needs Attention</SectionHeading>
            <ul className="space-y-2.5">
              {data.needsAttention.map((item) => (
                <li key={item.weddingId}>
                  <Link
                    href={`/weddings/${item.weddingId}`}
                    className="flex flex-col gap-2 rounded-card border-l-4 border-l-rose-500 bg-paper px-4 py-3 shadow-soft transition-colors hover:bg-rose-50/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-heading text-base font-semibold text-plum">
                      {coupleName(item.client)}
                      <span className="ml-2 font-sans text-sm font-normal text-plum-400">
                        {formatCountdown(item.daysUntil)}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {item.reasons.map((reason) => (
                        <Badge key={reason} tone="rose">
                          {reason}
                        </Badge>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <SectionHeading>Today&apos;s Meetings</SectionHeading>
            {data.todayMeetings.length === 0 ? (
              <p className="text-sm text-plum-400">No meetings today.</p>
            ) : (
              <ul className="space-y-1">
                {data.todayMeetings.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/weddings/${m.wedding.id}`}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-ivory-100"
                    >
                      <span>
                        <span className="font-medium text-plum">{m.title}</span>
                        <span className="ml-2 text-plum-400">{coupleName(m.wedding.client)}</span>
                      </span>
                      <span className="text-xs text-gold-700">{formatDateTime(m.scheduledAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={cardClass}>
            <SectionHeading>This Week&apos;s Meetings</SectionHeading>
            {data.weekMeetings.length === 0 ? (
              <p className="text-sm text-plum-400">No meetings this week.</p>
            ) : (
              <ul className="space-y-1">
                {data.weekMeetings.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/weddings/${m.wedding.id}`}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-ivory-100"
                    >
                      <span>
                        <span className="font-medium text-plum">{m.title}</span>
                        <span className="ml-2 text-plum-400">{coupleName(m.wedding.client)}</span>
                        <span className="ml-2 text-xs text-plum-400">
                          {meetingTypeLabel(m.type)}
                        </span>
                      </span>
                      <span className="text-xs text-gold-700">{formatDateTime(m.scheduledAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className={cardClass}>
          <SectionHeading>Overdue Tasks</SectionHeading>
          {data.overdueTasks.length === 0 ? (
            <p className="text-sm text-plum-400">Nothing overdue. Nice work.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gold-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Task</th>
                    <th className="px-3 py-2 font-medium">Wedding</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {data.overdueTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-ivory-100/60">
                      <td className="px-3 py-2 font-medium text-plum">{task.title}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/weddings/${task.wedding.id}`}
                          className="text-wine-500 hover:underline"
                        >
                          {coupleName(task.wedding.client)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-plum-600">{taskPriorityLabel(task.priority)}</td>
                      <td className="px-3 py-2">
                        <Badge tone="rose">{formatOverdue(task.daysOverdue)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={cardClass}>
          <SectionHeading>Upcoming Weddings</SectionHeading>
          {data.upcomingWeddings.length === 0 ? (
            <p className="text-sm text-plum-400">Nothing in the next 90 days.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.upcomingWeddings.map((w) => (
                <Link
                  key={w.id}
                  href={`/weddings/${w.id}`}
                  className="overflow-hidden rounded-card border border-gold-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-soft-lg"
                >
                  <div
                    className="h-28 bg-cover bg-center bg-gold-100"
                    style={{ backgroundImage: `url(${weddingPhotoFor(w.id)})` }}
                  />
                  <div className="p-4">
                    <p className="font-heading text-lg font-semibold text-plum">
                      <CoupleName fullName={w.client.fullName} partnerName={w.client.partnerName} />
                    </p>
                    <p className="mt-0.5 text-sm text-plum-400">{formatDate(w.weddingDate)}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge tone={planningStatusTone(w.planningStatus)}>
                        {planningStatusLabel(w.planningStatus)}
                      </Badge>
                      <span className="rounded-full bg-wine-500 px-2.5 py-1 text-xs font-medium text-ivory">
                        {formatCountdown(w.daysUntil)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}
