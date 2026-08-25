"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, GoogleConnectionStatus, getGoogleConnectionStatus, googleConnectUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";

function ConnectionBanner() {
  const searchParams = useSearchParams();
  const connectedParam = searchParams.get("connected");

  if (connectedParam === "1") {
    return (
      <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
        Google Calendar connected successfully.
      </p>
    );
  }
  if (connectedParam === "0") {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
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
      <h1 className="text-xl font-semibold">Settings</h1>

      <Suspense fallback={null}>
        <ConnectionBanner />
      </Suspense>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Google Calendar</h2>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {status && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status.connected ? "bg-green-500" : "bg-neutral-300"
                }`}
              />
              <span className="text-sm font-medium">
                {status.connected ? "Connected" : "Not connected"}
              </span>
            </div>

            {status.connected ? (
              <p className="text-xs text-neutral-500">
                Milestones and meetings are pushed to the &ldquo;Weddings&rdquo; calendar on this
                Google account
                {status.connectedAt ? ` · connected ${formatDate(status.connectedAt)}` : ""}.
              </p>
            ) : (
              <>
                <p className="text-xs text-neutral-500">
                  Connect a Google account so wedding milestones and scheduled meetings
                  automatically appear on a dedicated &ldquo;Weddings&rdquo; calendar.
                </p>
                <a
                  href={googleConnectUrl}
                  className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                >
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
