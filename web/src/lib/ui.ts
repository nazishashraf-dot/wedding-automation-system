// Shared visual-design building blocks so every page pulls from the same
// palette instead of scattering one-off classes/colors. Status "tone" is
// meaningful across the app: sage = confirmed/done, gold = pending/active,
// rose = overdue/urgent, neutral = not yet started / archived.

export type Tone = "sage" | "gold" | "rose" | "neutral";

export const badgeToneClasses: Record<Tone, string> = {
  sage: "bg-sage-100 text-sage-700 border-sage-200",
  gold: "bg-gold-100 text-gold-700 border-gold-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  neutral: "bg-plum-50 text-plum-600 border-plum-100",
};

export const selectToneClasses: Record<Tone, string> = {
  sage: "bg-sage-50 border-sage-300 text-sage-900 focus:border-sage-500",
  gold: "bg-gold-50 border-gold-300 text-gold-900 focus:border-gold-500",
  rose: "bg-rose-50 border-rose-300 text-rose-900 focus:border-rose-500",
  neutral: "bg-white border-plum-100 text-plum-600 focus:border-wine-400",
};

export function taskStatusTone(status: string): Tone {
  if (status === "done") return "sage";
  if (status === "in_progress") return "gold";
  return "neutral"; // todo
}

export function planningStatusTone(status: string): Tone {
  if (status === "completed") return "sage";
  if (status === "final_month") return "rose";
  if (status === "booked" || status === "in_progress") return "gold";
  return "neutral"; // inquiry
}

export function vendorLinkStatusTone(status: string): Tone {
  if (status === "confirmed") return "sage";
  if (status === "quoted") return "gold";
  return "neutral"; // contacted
}

export function clientStatusTone(status: string): Tone {
  if (status === "active" || status === "completed") return "sage";
  if (status === "lead") return "gold";
  return "neutral"; // archived
}

export const cardClass = "rounded-card border border-gold-100 bg-paper p-6 shadow-soft";

export const inputClass =
  "w-full rounded-lg border border-gold-200 bg-white px-3 py-2 text-sm text-plum placeholder:text-plum-400/60 transition-colors focus:border-wine-400 focus:outline-none";

export const selectSmClass =
  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-wine-500 px-5 py-2.5 text-sm font-medium text-ivory shadow-soft transition-colors hover:bg-wine-600 disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimarySm =
  "inline-flex items-center justify-center rounded-full bg-wine-500 px-4 py-1.5 text-xs font-medium text-ivory shadow-soft transition-colors hover:bg-wine-600 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-full border border-wine-400 px-5 py-2.5 text-sm font-medium text-wine-500 transition-colors hover:bg-wine-50 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondarySm =
  "inline-flex items-center justify-center rounded-full border border-wine-400 px-4 py-1.5 text-xs font-medium text-wine-500 transition-colors hover:bg-wine-50 disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhostSageSm =
  "inline-flex items-center justify-center rounded-full border border-sage-400 px-4 py-1.5 text-xs font-medium text-sage-700 transition-colors hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-50";

export const linkRose = "text-xs font-medium text-rose-700 hover:text-rose-900 hover:underline";
