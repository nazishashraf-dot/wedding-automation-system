const VENDOR_CATEGORY_LABELS: Record<string, string> = {
  florist: "Florist",
  caterer: "Caterer",
  venue: "Venue",
  photographer: "Photographer",
  dj_band: "DJ / Band",
  hair_makeup: "Hair & Makeup",
  other: "Other",
};

const PLANNING_STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  booked: "Booked",
  in_progress: "In Progress",
  final_month: "Final Month",
  completed: "Completed",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export function taskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status;
}

export function taskPriorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function vendorCategoryLabel(category: string): string {
  return VENDOR_CATEGORY_LABELS[category] ?? category;
}

export function planningStatusLabel(status: string): string {
  return PLANNING_STATUS_LABELS[status] ?? status;
}

export function clientStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function vendorLinkStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
