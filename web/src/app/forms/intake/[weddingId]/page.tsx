"use client";

import { useEffect, useState } from "react";
import { ApiError, IntakeFormData, getIntakeForm, submitIntakeForm } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { btnPrimary, inputClass } from "@/lib/ui";

const labelClass = "mb-1.5 block text-sm font-medium text-plum-600";

/**
 * A soft, self-contained botanical line pattern — no external image/stock
 * URLs to break. Sits behind the form card at very low opacity as a
 * "whisper" of texture, not a loud illustration.
 */
function BotanicalBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id="botanical-sprig"
          width="220"
          height="220"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(8)"
        >
          <g stroke="#C9A96E" strokeWidth="1.3" fill="none" strokeLinecap="round">
            <path d="M18 205 C 42 165, 28 128, 56 96 C 78 70, 68 42, 92 12" />
            <ellipse cx="40" cy="152" rx="11" ry="5.5" transform="rotate(38 40 152)" />
            <ellipse cx="60" cy="108" rx="10" ry="5" transform="rotate(-18 60 108)" />
            <ellipse cx="76" cy="58" rx="9" ry="4.5" transform="rotate(42 76 58)" />
            <circle cx="92" cy="12" r="3.2" fill="#C9A96E" stroke="none" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#botanical-sprig)" />
    </svg>
  );
}

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
    <div className="relative min-h-screen overflow-hidden bg-wash-blush">
      <BotanicalBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg rounded-card border border-gold-100 bg-paper p-7 shadow-soft-lg sm:p-10">
          {loadError && <p className="text-sm text-rose-700">{loadError}</p>}

          {!loadError && !data && <p className="text-sm text-plum-400">Loading...</p>}

          {data && !submitted && (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-700">
                A few details for your day
              </p>
              <h1 className="mt-2 font-heading text-3xl font-semibold leading-tight text-wine-600">
                {data.fullName}
                {data.partnerName ? ` & ${data.partnerName}` : ""}
              </h1>
              <p className="mt-1.5 text-sm text-plum-400">
                {formatDate(data.weddingDate)}
                {data.venue ? ` · ${data.venue}` : ""}
              </p>
              <div className="my-5 h-px w-16 bg-gold-300" />
              <p className="mb-6 text-sm leading-relaxed text-plum-600">
                We&apos;re so glad to be part of your celebration. A few details below will help
                us plan beautifully for your day — share whatever you have; nothing here is
                required.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className={labelClass}>Your partner&apos;s name</label>
                  <input
                    className={inputClass}
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Best number to reach you</label>
                  <input
                    className={inputClass}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>About how many guests are you expecting?</label>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={guestCountEstimate}
                    onChange={(e) => setGuestCountEstimate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tell us about your style or theme</label>
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

                {submitError && <p className="text-sm text-rose-700">{submitError}</p>}

                <button type="submit" disabled={submitting} className={`w-full ${btnPrimary}`}>
                  {submitting ? "Sending..." : "Share These Details"}
                </button>
              </form>
            </>
          )}

          {submitted && (
            <div className="py-10 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-700">
                Thank you
              </p>
              <h1 className="mt-2 font-heading text-3xl font-semibold text-wine-600">
                You&apos;re All Set
              </h1>
              <div className="my-5 h-px w-16 bg-gold-300 mx-auto" />
              <p className="text-sm leading-relaxed text-plum-600">
                We&apos;ve received your details and can&apos;t wait to start planning your
                celebration. Your planner will be in touch if anything else is needed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
