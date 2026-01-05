import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { getCalendarClient } from "@/lib/google-calendar";

type CreateEventPayload = {
  title?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | CreateEventPayload
    | null;

  if (!payload?.title || !payload.startTime || !payload.endTime) {
    return NextResponse.json(
      { error: "title, startTime, endTime required" },
      { status: 400 }
    );
  }

  const startDate = new Date(payload.startTime);
  const endDate = new Date(payload.endTime);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "invalid time range" }, { status: 400 });
  }

  if (endDate <= startDate) {
    return NextResponse.json({ error: "endTime before startTime" }, { status: 400 });
  }

  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, session.user.id),
  });

  if (!connection?.hasWriteAccess) {
    return NextResponse.json(
      { error: "write_access_required" },
      { status: 403 }
    );
  }

  try {
    const calendar = await getCalendarClient(session.user.id);
    const calendarId = connection.calendarId || "primary";

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: payload.title,
        description: payload.description || undefined,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      },
    });

    return NextResponse.json({ eventId: event.data.id });
  } catch (error) {
    console.error("Calendar event creation error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
