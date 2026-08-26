"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// Wraps every page under the (app) layout. The public intake form lives
// outside this route group entirely, so it's never touched by this check.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <p className="px-4 py-10 text-sm text-plum-400 sm:px-6">Loading...</p>;
  }

  if (!user) {
    // Redirect is in flight (see effect above) — render nothing meanwhile.
    return null;
  }

  return <>{children}</>;
}
