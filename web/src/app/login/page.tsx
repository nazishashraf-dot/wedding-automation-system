"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getMe, login } from "@/lib/api";
import { btnPrimary, heroPhotoUrl, inputClass } from "@/lib/ui";
import PhotoBackdrop from "@/components/PhotoBackdrop";

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Skip the form.
  useEffect(() => {
    getMe()
      .then(() => router.replace("/"))
      .catch(() => setCheckingSession(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) return null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PhotoBackdrop src={heroPhotoUrl} blurred scrimClassName="bg-photo-scrim-soft" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-card border border-gold-100 bg-paper p-7 shadow-soft-lg sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-700">
            Wedding Studio
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold leading-tight text-wine-600 sm:text-4xl">
            Sign in
          </h1>
          <div className="my-5 h-px w-16 bg-gold-300" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-plum-600">Email</label>
              <input
                required
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-plum-600">Password</label>
              <input
                required
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={submitting} className={`w-full ${btnPrimary}`}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
