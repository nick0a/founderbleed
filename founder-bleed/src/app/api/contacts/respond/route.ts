import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts, notifications, users } from "@/lib/db/schema";

type RespondPayload = {
  contactId?: string;
  action?: "accept" | "decline";
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as RespondPayload | null;
  if (!payload?.contactId || !payload.action) {
    return NextResponse.json({ error: "contactId and action required" }, { status: 400 });
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!currentUser) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.id, payload.contactId),
      or(
        eq(contacts.contactUserId, session.user.id),
        eq(contacts.contactEmail, currentUser.email)
      )
    ),
  });

  if (!contact) {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }

  if (payload.action === "decline") {
    await db
      .update(contacts)
      .set({ status: "declined" })
      .where(eq(contacts.id, contact.id));

    return NextResponse.json({ ok: true, status: "declined" });
  }

  await db
    .update(contacts)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      contactUserId: contact.contactUserId || session.user.id,
    })
    .where(eq(contacts.id, contact.id));

  if (contact.userId) {
    const existingReverse = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, session.user.id),
        eq(contacts.contactUserId, contact.userId)
      ),
    });

    if (!existingReverse) {
      await db.insert(contacts).values({
        id: randomUUID(),
        userId: session.user.id,
        contactUserId: contact.userId,
        status: "accepted",
        invitedAt: new Date(),
        acceptedAt: new Date(),
      });
    }

    await db.insert(notifications).values({
      id: randomUUID(),
      userId: contact.userId,
      type: "contact_accept",
      title: "Contact accepted",
      body: `${currentUser.name || currentUser.email} accepted your invite.`,
      link: "/settings",
      createdAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true, status: "accepted" });
}
