"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, GoogleConnectionStatus, getGoogleConnectionStatus, googleConnectUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";
import { btnPrimary, cardClass } from "@/lib/ui";

function ConnectionBanner() {
  const searchParams = useSearchParams();
  const connectedParam = searchParams.get("connected");

  if (connectedParam === "1") {
    return (
      <p className="rounded-lg border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-sage-700">
        Google Calendar connected successfully.
      </p>
    );
  }
  if (connectedParam === "0") {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
        Connecting Google Calendar failed. Please try again.
      </p>
    );
  }
  return null;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<GoogleConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await getGoogleConnectionStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load connection status");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-heading text-4xl font-semibold text-wine-600 sm:text-5xl">Settings</h1>

      <Suspense fallback={null}>
        <ConnectionBanner />
      </Suspense>

      <section className={cardClass}>
        <SectionHeading>Google Calendar</SectionHeading>

        {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}

        {status && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status.connected ? "bg-sage-500" : "bg-plum-100"
                }`}
              />
              <span className="text-sm font-medium text-plum">
                {status.connected ? "Connected" : "Not connected"}
              </span>
            </div>

            {status.connected ? (
              <p className="text-xs text-plum-400">
                Milestones and meetings are pushed to the &ldquo;Weddings&rdquo; calendar on this
                Google account
                {status.connectedAt ? ` · connected ${formatDate(status.connectedAt)}` : ""}.
              </p>
            ) : (
              <>
                <p className="text-xs text-plum-400">
                  Connect a Google account so wedding milestones and scheduled meetings
                  automatically appear on a dedicated &ldquo;Weddings&rdquo; calendar.
                </p>
                <a href={googleConnectUrl} className={btnPrimary}>
                  Connect Google Calendar
                </a>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
