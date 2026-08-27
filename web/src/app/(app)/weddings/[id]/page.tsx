"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, Wedding, getWedding } from "@/lib/api";
import { formatDate, planningStatusLabel } from "@/lib/format";
import Badge from "@/components/Badge";
import CoupleName from "@/components/CoupleName";
import PhotoBackdrop from "@/components/PhotoBackdrop";
import { useAuth } from "@/components/AuthProvider";
import { planningStatusTone, weddingPhotoFor } from "@/lib/ui";
import OverviewTab from "./tabs/OverviewTab";
import PlanningTab from "./tabs/PlanningTab";
import VendorsPaymentsTab from "./tabs/VendorsPaymentsTab";
import GuestsTab from "./tabs/GuestsTab";
import FilesTab from "./tabs/FilesTab";

function formatMonthYear(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "planning", label: "Planning" },
  { key: "vendors", label: "Vendors & Payments" },
  { key: "guests", label: "Guests" },
  { key: "files", label: "Files" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Each tab fetches its own data lazily — nothing beyond the wedding itself
// (needed for the hero regardless) loads until a tab is actually visited.
// Once visited, a tab stays mounted (just hidden) so switching back doesn't
// refetch or lose its state.
function WeddingDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "overview";

  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(new Set([initialTab]));
  const [linkCopied, setLinkCopied] = useState(false);

  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  async function refresh() {
    try {
      const data = await getWedding(id);
      setWedding(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load wedding");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    setVisitedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
    router.replace(`/weddings/${id}?tab=${tab}`, { scroll: false });
  }

  async function handleCopyIntakeLink() {
    const url = `${window.location.origin}/forms/intake/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore, button just won't confirm.
    }
  }

  if (error && !wedding) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }

  if (!wedding) {
    return <p className="text-sm text-plum-400">Loading...</p>;
  }

  return (
    <div className="-mx-4 -mt-10 space-y-6 sm:-mx-6">
      <div className="relative flex h-[260px] flex-col justify-end overflow-hidden sm:h-[300px]">
        <PhotoBackdrop
          src={weddingPhotoFor(wedding.id)}
          blurred
          scrimClassName="bg-photo-scrim-soft"
        />
        <button
          onClick={handleCopyIntakeLink}
          className="absolute right-4 top-4 z-10 inline-flex items-center justify-center rounded-full bg-ivory/95 px-4 py-1.5 text-xs font-medium text-wine-600 shadow-soft transition-colors hover:bg-ivory sm:right-8 sm:top-6"
        >
          {linkCopied ? "Copied!" : "Copy intake form link"}
        </button>
        <div className="relative z-10 px-4 pb-6 sm:px-8 sm:pb-8">
          {wedding.client?.partnerName && (
            <p className="font-script text-lg text-gold-200 sm:text-xl">
              est. {formatMonthYear(wedding.weddingDate)}
            </p>
          )}
          <h1 className="font-heading text-3xl font-semibold leading-tight text-ivory sm:text-4xl md:text-5xl">
            {wedding.client ? (
              <CoupleName
                fullName={wedding.client.fullName}
                partnerName={wedding.client.partnerName}
                ampersandClassName="text-gold-200"
              />
            ) : (
              "—"
            )}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ivory/85">
            <span>{formatDate(wedding.weddingDate)}</span>
            <span aria-hidden>·</span>
            <span>{wedding.venue ?? "Venue to be confirmed"}</span>
            <Badge tone={planningStatusTone(wedding.planningStatus)}>
              {planningStatusLabel(wedding.planningStatus)}
            </Badge>
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        {error && <p className="mb-4 text-sm text-rose-700">{error}</p>}

        <div className="mb-6 flex flex-wrap gap-1 border-b border-gold-100">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-wine-500 text-wine-600"
                  : "text-plum-400 hover:text-plum-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {visitedTabs.has("overview") && (
          <div className={activeTab === "overview" ? "" : "hidden"}>
            <OverviewTab wedding={wedding} onRefresh={refresh} />
          </div>
        )}
        {visitedTabs.has("planning") && (
          <div className={activeTab === "planning" ? "" : "hidden"}>
            <PlanningTab weddingId={id} />
          </div>
        )}
        {visitedTabs.has("vendors") && (
          <div className={activeTab === "vendors" ? "" : "hidden"}>
            <VendorsPaymentsTab
              weddingId={id}
              wedding={wedding}
              onWeddingRefresh={refresh}
              isOwner={isOwner}
            />
          </div>
        )}
        {visitedTabs.has("guests") && (
          <div className={activeTab === "guests" ? "" : "hidden"}>
            <GuestsTab weddingId={id} isOwner={isOwner} />
          </div>
        )}
        {visitedTabs.has("files") && (
          <div className={activeTab === "files" ? "" : "hidden"}>
            <FilesTab weddingId={id} isOwner={isOwner} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeddingDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-plum-400 sm:px-6">Loading...</p>}>
      <WeddingDetailInner id={params.id} />
    </Suspense>
  );
}
