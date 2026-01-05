import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/encryption";

export async function getCalendarClient(userId: string) {
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, userId),
  });

  if (!connection) {
    throw new Error("No calendar connection found");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const accessToken = decrypt(connection.accessToken);
  const refreshToken = connection.refreshToken
    ? decrypt(connection.refreshToken)
    : null;

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.tokenExpiresAt?.getTime(),
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db
        .update(calendarConnections)
        .set({
          accessToken: encrypt(tokens.access_token),
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
        })
        .where(eq(calendarConnections.userId, userId));
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function listCalendars(userId: string) {
  const calendar = await getCalendarClient(userId);
  const response = await calendar.calendarList.list();

  return (
    response.data.items?.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      primary: cal.primary || false,
    })) || []
  );
}

export async function getEvents(
  userId: string,
  calendarIds: string[],
  dateStart: string,
  dateEnd: string
) {
  const calendar = await getCalendarClient(userId);
  const allEvents: Array<{
    id: string;
    calendarId: string;
    title: string;
    description: string;
    start: string;
    end: string;
    isAllDay: boolean;
    attendees: number;
    hasMeetLink: boolean;
    isRecurring: boolean;
    eventType: string | null | undefined;
  }> = [];

  for (const calendarId of calendarIds) {
    let pageToken: string | undefined;

    do {
      const response = await calendar.events.list({
        calendarId,
        timeMin: new Date(dateStart).toISOString(),
        timeMax: new Date(dateEnd).toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 2500,
        pageToken,
      });

      const events =
        response.data.items?.map((event) => ({
          id: event.id || "",
          calendarId,
          title: event.summary || "Untitled",
          description: event.description || "",
          start: event.start?.dateTime || event.start?.date || "",
          end: event.end?.dateTime || event.end?.date || "",
          isAllDay: !event.start?.dateTime,
          attendees: event.attendees?.length || 0,
          hasMeetLink: !!event.hangoutLink || !!event.conferenceData,
          isRecurring: !!event.recurringEventId,
          eventType: event.eventType,
        })) || [];

      allEvents.push(...events);
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);
  }

  return allEvents;
}
