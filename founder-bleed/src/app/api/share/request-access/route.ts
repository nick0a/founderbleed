import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/lib/db";
import { reportAccessLog, sharedReports } from "@/lib/db/schema";

type AccessPayload = {
  token?: string;
  email?: string;
};

function isEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as AccessPayload | null;
  if (!payload?.token || !payload?.email) {
    return NextResponse.json({ error: "token and email required" }, { status: 400 });
  }

  if (!isEmail(payload.email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const now = new Date();
  const sharedReport = await db.query.sharedReports.findFirst({
    where: and(
      eq(sharedReports.shareToken, payload.token),
      isNull(sharedReports.revokedAt)
    ),
  });

  if (!sharedReport) {
    return NextResponse.json({ error: "share not found" }, { status: 404 });
  }

  if (sharedReport.expiresAt && sharedReport.expiresAt < now) {
    return NextResponse.json({ error: "share expired" }, { status: 410 });
  }

  const verificationToken = randomUUID().replace(/-/g, "");
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";

  const shouldVerify = Boolean(resendKey && emailFrom && baseUrl);

  await db.insert(reportAccessLog).values({
    id: randomUUID(),
    sharedReportId: sharedReport.id,
    viewerEmail: payload.email.toLowerCase(),
    emailVerified: shouldVerify ? false : true,
    verificationToken: verificationToken,
    accessedAt: new Date(),
  });

  if (shouldVerify) {
    const resend = new Resend(resendKey);
    const verificationUrl = `${baseUrl}/share/verify/${verificationToken}`;

    await resend.emails.send({
      from: emailFrom,
      to: payload.email,
      subject: "Verify your email to view the Founder Bleed report",
      html: `<p>Click to verify your email and view the report:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
    });

    return NextResponse.json({ status: "verification_sent" });
  }

  return NextResponse.json({ status: "verified" });
}
