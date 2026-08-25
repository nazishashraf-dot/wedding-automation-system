"use client";

import { useEffect, useState } from "react";
import { ApiError, IntakeFormData, getIntakeForm, submitIntakeForm } from "@/lib/api";
import { formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

export default function IntakeFormPage({
  params,
}: {
  params: { weddingId: string };
}) {
  const { weddingId } = params;

  const [data, setData] = useState<IntakeFormData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [partnerName, setPartnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [guestCountEstimate, setGuestCountEstimate] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");

  useEffect(() => {
    getIntakeForm(weddingId)
      .then((d) => {
        setData(d);
        setPartnerName(d.partnerName ?? "");
        setPhone(d.phone ?? "");
        setGuestCountEstimate(d.guestCountEstimate?.toString() ?? "");
        setStyleNotes(d.styleNotes ?? "");
        setIntakeNotes(d.intakeNotes ?? "");
      })
      .catch((err) => {
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "We couldn't find this wedding. Please check the link and try again."
        );
      });
  }, [weddingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitIntakeForm(weddingId, {
        partnerName: partnerName || undefined,
        phone: phone || undefined,
        guestCountEstimate: guestCountEstimate === "" ? undefined : Number(guestCountEstimate),
        styleNotes: styleNotes || undefined,
        intakeNotes: intakeNotes || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        {loadError && <p className="text-sm text-red-600">{loadError}</p>}

        {!loadError && !data && <p className="text-sm text-neutral-500">Loading...</p>}

        {data && !submitted && (
          <>
            <h1 className="text-lg font-semibold text-neutral-900">
              Wedding Details — {data.fullName}
              {data.partnerName ? ` & ${data.partnerName}` : ""}
            </h1>
            <p className="mt-1 mb-6 text-sm text-neutral-500">
              {formatDate(data.weddingDate)}
              {data.venue ? ` · ${data.venue}` : ""}
            </p>
            <p className="mb-6 text-sm text-neutral-600">
              A few details to help us plan your day — nothing here is required, fill in
              whatever you have so far.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Partner&apos;s name</label>
                <input
                  className={inputClass}
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Best contact phone number</label>
                <input
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Estimated guest count</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={guestCountEstimate}
                  onChange={(e) => setGuestCountEstimate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Style / theme preferences</label>
                <textarea
                  rows={3}
                  className={inputClass}
                  value={styleNotes}
                  onChange={(e) => setStyleNotes(e.target.value)}
                  placeholder="Colors, vibe, inspiration..."
                />
              </div>
              <div>
                <label className={labelClass}>Anything else we should know?</label>
                <textarea
                  rows={3}
                  className={inputClass}
                  value={intakeNotes}
                  onChange={(e) => setIntakeNotes(e.target.value)}
                  placeholder="Accessibility needs, key contacts, allergies, etc."
                />
              </div>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </>
        )}

        {submitted && (
          <div className="py-8 text-center">
            <h1 className="text-lg font-semibold text-neutral-900">Thank you!</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Your details have been received. Your planner will be in touch if anything else is
              needed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
