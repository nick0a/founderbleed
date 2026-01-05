import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { Resend } from "resend";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts, notifications, users } from "@/lib/db/schema";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InvitePayload = {
  email?: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as InvitePayload | null;
  const email = payload?.email?.trim().toLowerCase();

  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!currentUser) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const contactUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  const existing = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.userId, session.user.id),
      contactUser?.id
        ? eq(contacts.contactUserId, contactUser.id)
        : eq(contacts.contactEmail, email)
    ),
  });

  if (!existing) {
    await db.insert(contacts).values({
      id: randomUUID(),
      userId: session.user.id,
      contactUserId: contactUser?.id || null,
      contactEmail: contactUser ? null : email,
      status: "pending",
      invitedAt: new Date(),
    });
  }

  if (contactUser) {
    await db.insert(notifications).values({
      id: randomUUID(),
      userId: contactUser.id,
      type: "contact_invite",
      title: "New contact invite",
      body: `${currentUser.name || currentUser.email} invited you to connect.`,
      link: "/settings",
      createdAt: new Date(),
    });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "notifications@founderbleed.com";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;

  if (resendKey && baseUrl) {
    const resend = new Resend(resendKey);
    const inviteUrl = `${baseUrl}/settings`;

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "You're invited to Founder Bleed",
      html: `<p>${currentUser.name || currentUser.email} invited you to compare founder metrics.</p>
             <p><a href="${inviteUrl}">Open settings to accept</a></p>`,
    });
  }

  return NextResponse.json({ ok: true });
}
