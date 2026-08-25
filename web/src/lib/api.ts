const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ClientStatus = "lead" | "active" | "completed" | "archived";
export type PlanningStatus = "inquiry" | "booked" | "in_progress" | "final_month" | "completed";
export type VendorCategory =
  | "florist"
  | "caterer"
  | "venue"
  | "photographer"
  | "dj_band"
  | "hair_makeup"
  | "other";
export type VendorLinkStatus = "contacted" | "quoted" | "confirmed";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskSource = "auto_generated" | "manual";
export type CalendarEventType = "milestone" | "client_meeting" | "vendor_meeting" | "reminder";

export interface WeddingSummary {
  id: string;
  weddingDate: string;
  planningStatus: PlanningStatus;
}

export interface Client {
  id: string;
  fullName: string;
  partnerName: string | null;
  email: string;
  phone: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  weddings?: WeddingSummary[];
}

export interface ClientSummary {
  id: string;
  fullName: string;
  partnerName: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  contactEmail: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WeddingVendorLink {
  weddingId: string;
  vendorId: string;
  status: VendorLinkStatus;
  priceQuoted: string | null;
  notes: string | null;
  vendor: Vendor;
}

export interface Wedding {
  id: string;
  clientId: string;
  weddingDate: string;
  venue: string | null;
  budgetTotal: string | null;
  budgetSpent: string;
  planningStatus: PlanningStatus;
  styleNotes: string | null;
  guestCountEstimate: number | null;
  intakeNotes: string | null;
  createdAt: string;
  updatedAt: string;
  client?: ClientSummary;
  vendors?: WeddingVendorLink[];
}

export interface Meeting {
  id: string;
  weddingId: string;
  taskId: string | null;
  type: CalendarEventType;
  title: string;
  scheduledAt: string;
  googleEventId: string | null;
  createdAt: string;
}

export interface GoogleConnectionStatus {
  connected: boolean;
  calendarId: string | null;
  connectedAt: string | null;
}

export interface IntakeFormData {
  weddingId: string;
  fullName: string;
  partnerName: string | null;
  phone: string | null;
  weddingDate: string;
  venue: string | null;
  guestCountEstimate: number | null;
  styleNotes: string | null;
  intakeNotes: string | null;
}

export interface Task {
  id: string;
  weddingId: string;
  timelineRuleId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  source: TaskSource;
  createdAt: string;
  updatedAt: string;
  overdue: boolean;
  wedding?: {
    id: string;
    weddingDate: string;
    client: ClientSummary;
  };
}

export interface RegenerateTimelineResult {
  created: number;
  skippedPast: number;
  skippedExisting: number;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let details: unknown;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
      details = body?.error?.details;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(res.status, message, details);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Clients
export const listClients = () => request<Client[]>("/clients");
export const getClient = (id: string) => request<Client>(`/clients/${id}`);
export const createClient = (data: {
  fullName: string;
  partnerName?: string;
  email: string;
  phone?: string;
  status?: ClientStatus;
  notes?: string;
}) => request<Client>("/clients", { method: "POST", body: JSON.stringify(data) });

// Weddings
export const listWeddings = () => request<Wedding[]>("/weddings");
export const getWedding = (id: string) => request<Wedding>(`/weddings/${id}`);
export const createWedding = (data: {
  clientId: string;
  weddingDate: string;
  venue?: string;
  budgetTotal?: number;
  planningStatus?: PlanningStatus;
}) => request<Wedding>("/weddings", { method: "POST", body: JSON.stringify(data) });
export const updateWedding = (
  id: string,
  data: Partial<{
    weddingDate: string;
    venue: string;
    budgetTotal: number;
    budgetSpent: number;
    planningStatus: PlanningStatus;
    styleNotes: string;
  }>
) => request<Wedding>(`/weddings/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const linkVendorToWedding = (
  weddingId: string,
  data: { vendorId: string; status?: VendorLinkStatus; priceQuoted?: number; notes?: string }
) =>
  request<WeddingVendorLink>(`/weddings/${weddingId}/vendors`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateWeddingVendorLink = (
  weddingId: string,
  vendorId: string,
  data: Partial<{ status: VendorLinkStatus; priceQuoted: number; notes: string }>
) =>
  request<WeddingVendorLink>(`/weddings/${weddingId}/vendors/${vendorId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const regenerateTimeline = (weddingId: string) =>
  request<RegenerateTimelineResult>(`/weddings/${weddingId}/regenerate-timeline`, {
    method: "POST",
  });

// Tasks
export const listWeddingTasks = (weddingId: string) =>
  request<Task[]>(`/weddings/${weddingId}/tasks`);
export const listTasks = (params?: { status?: TaskStatus; overdue?: boolean }) => {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.overdue !== undefined) search.set("overdue", String(params.overdue));
  const qs = search.toString();
  return request<Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
};
export const createWeddingTask = (
  weddingId: string,
  data: { title: string; description?: string; dueDate: string; priority?: TaskPriority; assignee?: string }
) => request<Task>(`/weddings/${weddingId}/tasks`, { method: "POST", body: JSON.stringify(data) });
export const updateTask = (
  id: string,
  data: Partial<{ status: TaskStatus; priority: TaskPriority; assignee: string; dueDate: string }>
) => request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// Google Calendar integration
export const getGoogleConnectionStatus = () =>
  request<GoogleConnectionStatus>("/auth/google/status");
export const googleConnectUrl = `${API_BASE_URL}/auth/google`;

// Meetings
export const listWeddingMeetings = (weddingId: string) =>
  request<Meeting[]>(`/weddings/${weddingId}/meetings`);
export const createWeddingMeeting = (
  weddingId: string,
  data: { title: string; scheduledAt: string; type?: CalendarEventType }
) =>
  request<Meeting>(`/weddings/${weddingId}/meetings`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const deleteMeeting = (id: string) =>
  request<void>(`/meetings/${id}`, { method: "DELETE" });

// Client intake form (public)
export const getIntakeForm = (weddingId: string) =>
  request<IntakeFormData>(`/forms/intake/${weddingId}`);
export const submitIntakeForm = (
  weddingId: string,
  data: Partial<{
    partnerName: string;
    phone: string;
    guestCountEstimate: number;
    styleNotes: string;
    intakeNotes: string;
  }>
) =>
  request<{ success: boolean }>(`/forms/intake/${weddingId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// Vendors
export const listVendors = (category?: VendorCategory) =>
  request<Vendor[]>(`/vendors${category ? `?category=${category}` : ""}`);
export const getVendor = (id: string) => request<Vendor>(`/vendors/${id}`);
export const createVendor = (data: {
  name: string;
  category: VendorCategory;
  contactEmail?: string;
  phone?: string;
  notes?: string;
}) => request<Vendor>("/vendors", { method: "POST", body: JSON.stringify(data) });
