import type { VendorCategory } from "./api";

// Shared visual-design building blocks so every page pulls from the same
// palette instead of scattering one-off classes/colors. Status "tone" is
// meaningful across the app: sage = confirmed/done, gold = pending/active,
// rose = overdue/urgent, neutral = not yet started / archived.

export type Tone = "sage" | "gold" | "rose" | "neutral";

// Curated, hand-checked real photography (Unsplash) so the app reads as a
// wedding brand rather than flat color blocks. Each URL was opened and
// visually confirmed before use. CSS background-image (not <img>/next/image)
// is used everywhere these are consumed, with a solid color underneath —
// if a URL ever 404s, the layout quietly falls back to that color instead
// of a broken-image icon.
const UNSPLASH = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

// The single dedicated image for the dashboard's hero banner.
export const heroPhotoUrl = UNSPLASH("photo-1519225421980-715cb0215aed");

// The single dedicated image for the public intake form's full-bleed
// background.
export const intakeBackgroundPhotoUrl = UNSPLASH("photo-1520854221256-17451cc331bf");

// A small pool of real wedding-photography images, deterministically
// assigned per wedding so a given wedding always shows the same photo
// across the weddings grid and its own detail page header.
const WEDDING_PHOTO_POOL = [
  UNSPLASH("photo-1465495976277-4387d4b0b4c6"),
  UNSPLASH("photo-1583939003579-730e3918a45a"),
  UNSPLASH("photo-1606216794074-735e91aa2c92"),
  UNSPLASH("photo-1519741497674-611481863552"),
  UNSPLASH("photo-1522673607200-164d1b6ce486"),
];

export function weddingPhotoFor(weddingId: string): string {
  let hash = 0;
  for (let i = 0; i < weddingId.length; i++) {
    hash = (hash * 31 + weddingId.charCodeAt(i)) >>> 0;
  }
  return WEDDING_PHOTO_POOL[hash % WEDDING_PHOTO_POOL.length];
}

// One tasteful, category-matched image per vendor type for the vendor grid.
export const vendorCategoryPhoto: Record<VendorCategory, string> = {
  florist: UNSPLASH("photo-1465146344425-f00d5f5c8f07"),
  caterer: UNSPLASH("photo-1519225421980-715cb0215aed"),
  venue: UNSPLASH("photo-1519167758481-83f550bb49b3"),
  photographer: UNSPLASH("photo-1606216794074-735e91aa2c92"),
  dj_band: UNSPLASH("photo-1493225457124-a3eb161ffa5f"),
  hair_makeup: UNSPLASH("photo-1522337360788-8b13dee7a37e"),
  other: UNSPLASH("photo-1522673607200-164d1b6ce486"),
};

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

export function documentTypeTone(fileType: string): Tone {
  if (fileType === "application/pdf") return "rose";
  if (fileType.startsWith("image/")) return "sage";
  return "gold";
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
