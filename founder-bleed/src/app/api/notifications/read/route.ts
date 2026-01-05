import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

type ReadPayload = {
  notificationId?: string;
  all?: boolean;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as ReadPayload | null;
  const now = new Date();

  if (payload?.notificationId) {
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(
          eq(notifications.id, payload.notificationId),
          eq(notifications.userId, session.user.id)
        )
      );
    return NextResponse.json({ ok: true });
  }

  if (payload?.all) {
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(eq(notifications.userId, session.user.id), isNull(notifications.readAt))
      );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "notificationId or all required" }, { status: 400 });
}
