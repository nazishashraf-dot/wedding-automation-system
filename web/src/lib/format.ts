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

const MEETING_TYPE_LABELS: Record<string, string> = {
  milestone: "Milestone",
  client_meeting: "Client Meeting",
  vendor_meeting: "Vendor Meeting",
  reminder: "Reminder",
};

export function meetingTypeLabel(type: string): string {
  return MEETING_TYPE_LABELS[type] ?? type;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export function formatCountdown(daysUntil: number): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  return `In ${daysUntil} days`;
}

export function formatOverdue(daysOverdue: number): string {
  if (daysOverdue <= 0) return "Due today";
  if (daysOverdue === 1) return "1 day overdue";
  return `${daysOverdue} days overdue`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function documentTypeLabel(fileType: string): string {
  if (fileType === "application/pdf") return "PDF";
  if (fileType.startsWith("image/")) return "Image";
  if (fileType === "text/csv" || fileType.includes("spreadsheet") || fileType === "application/vnd.ms-excel")
    return "Spreadsheet";
  if (fileType.includes("word") || fileType === "application/msword") return "Word Doc";
  if (fileType === "text/plain") return "Text";
  return "File";
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
