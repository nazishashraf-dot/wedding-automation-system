import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "./db";

// `calendar.events` alone is enough to manage events, but `calendars.insert`
// (creating the dedicated "Weddings" calendar) needs the broader scope.
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CALENDAR_NAME = "Weddings";
const DEFAULT_EVENT_DURATION_MS = 30 * 60 * 1000;

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI
  );
}

function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

/**
 * Exchanges an OAuth code for tokens and persists the refresh token in the
 * single-row GoogleAuthToken table. Google only returns a refresh_token on
 * the first consent (or when prompt=consent forces re-consent, which
 * getAuthUrl always sets) — if for some reason one isn't returned and we
 * don't already have one stored, that's a real failure.
 */
export async function handleOAuthCallback(code: string): Promise<void> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  const existing = await prisma.googleAuthToken.findFirst();

  if (!tokens.refresh_token && !existing) {
    throw new Error("Google did not return a refresh token. Please try connecting again.");
  }

  const data = {
    ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
    accessToken: tokens.access_token ?? undefined,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    scope: tokens.scope ?? undefined,
  };

  if (existing) {
    await prisma.googleAuthToken.update({ where: { id: existing.id }, data });
  } else {
    await prisma.googleAuthToken.create({
      data: { refreshToken: tokens.refresh_token!, ...data },
    });
  }
}

export async function getConnectionStatus(): Promise<{
  connected: boolean;
  calendarId: string | null;
  connectedAt: string | null;
}> {
  const token = await prisma.googleAuthToken.findFirst();
  return {
    connected: Boolean(token),
    calendarId: token?.calendarId ?? null,
    connectedAt: token?.createdAt.toISOString() ?? null,
  };
}

async function getAuthenticatedClient(): Promise<OAuth2Client | null> {
  const token = await prisma.googleAuthToken.findFirst();
  if (!token) return null;
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: token.refreshToken });
  return client;
}

async function ensureCalendarId(auth: OAuth2Client): Promise<string> {
  const existing = await prisma.googleAuthToken.findFirst();
  if (existing?.calendarId) return existing.calendarId;

  const calendar = google.calendar({ version: "v3", auth });
  const created = await calendar.calendars.insert({ requestBody: { summary: CALENDAR_NAME } });
  const calendarId = created.data.id;
  if (!calendarId) throw new Error("Google Calendar did not return an ID for the new calendar");

  if (existing) {
    await prisma.googleAuthToken.update({ where: { id: existing.id }, data: { calendarId } });
  }
  return calendarId;
}

interface EventPayload {
  title: string;
  scheduledAt: Date;
}

/**
 * Creates an event on the dedicated "Weddings" calendar. Returns null (and
 * does nothing) if Google Calendar isn't connected yet — callers store the
 * CalendarEvent locally either way and just leave googleEventId unset.
 */
export async function pushCalendarEventCreate(event: EventPayload): Promise<string | null> {
  const auth = await getAuthenticatedClient();
  if (!auth) return null;

  const calendarId = await ensureCalendarId(auth);
  const calendar = google.calendar({ version: "v3", auth });
  const end = new Date(event.scheduledAt.getTime() + DEFAULT_EVENT_DURATION_MS);

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.title,
      start: { dateTime: event.scheduledAt.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });
  return res.data.id ?? null;
}

export async function pushCalendarEventUpdate(
  googleEventId: string,
  event: EventPayload
): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) return;

  const calendarId = await ensureCalendarId(auth);
  const calendar = google.calendar({ version: "v3", auth });
  const end = new Date(event.scheduledAt.getTime() + DEFAULT_EVENT_DURATION_MS);

  await calendar.events.patch({
    calendarId,
    eventId: googleEventId,
    requestBody: {
      summary: event.title,
      start: { dateTime: event.scheduledAt.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });
}

export async function pushCalendarEventDelete(googleEventId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) return;

  const calendarId = await ensureCalendarId(auth);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    // Already gone on Google's side — not a failure for our purposes.
    if (code !== 410 && code !== 404) throw err;
  }
}
