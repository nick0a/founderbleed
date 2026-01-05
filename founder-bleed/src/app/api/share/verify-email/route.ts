import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sharedReports, reportAccessLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { resend, EMAIL_FROM, isEmailConfigured } from '@/lib/resend';
import { nanoid } from 'nanoid';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateVerificationEmailHtml(verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 24px;">
      Verify your email to view the report
    </h1>

    <p style="color: #374151; line-height: 1.6; margin-bottom: 24px;">
      Click the button below to verify your email and access the shared audit report.
    </p>

    <a href="${verificationUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
      Verify Email
    </a>

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      This link expires in 24 hours.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// POST - Request email verification
export async function POST(request: NextRequest) {
  try {
    const { shareToken, email } = await request.json();

    if (!shareToken || !email) {
      return NextResponse.json({ error: 'Missing shareToken or email' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Verify share token exists and is valid
    const sharedReport = await db.query.sharedReports.findFirst({
      where: and(
        eq(sharedReports.shareToken, shareToken),
      ),
    });

    if (!sharedReport) {
      return NextResponse.json({ error: 'Invalid share token' }, { status: 404 });
    }

    if (sharedReport.revokedAt) {
      return NextResponse.json({ error: 'This share link has been revoked' }, { status: 403 });
    }

    if (sharedReport.expiresAt && new Date(sharedReport.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 403 });
    }

    // Check if already verified
    const existingAccess = await db.query.reportAccessLog.findFirst({
      where: and(
        eq(reportAccessLog.sharedReportId, sharedReport.id),
        eq(reportAccessLog.viewerEmail, email),
        eq(reportAccessLog.emailVerified, true),
      ),
    });

    if (existingAccess) {
      return NextResponse.json({ alreadyVerified: true });
    }

    // Generate verification token
    const verificationToken = nanoid(32);
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'}/share/${shareToken}?verify=${verificationToken}`;

    // Upsert access log entry
    const existingLog = await db.query.reportAccessLog.findFirst({
      where: and(
        eq(reportAccessLog.sharedReportId, sharedReport.id),
        eq(reportAccessLog.viewerEmail, email),
      ),
    });

    if (existingLog) {
      await db.update(reportAccessLog)
        .set({ verificationToken })
        .where(eq(reportAccessLog.id, existingLog.id));
    } else {
      await db.insert(reportAccessLog).values({
        sharedReportId: sharedReport.id,
        viewerEmail: email,
        emailVerified: false,
        verificationToken,
      });
    }

    // Send verification email
    if (isEmailConfigured()) {
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: [email],
          subject: 'Verify your email to view the shared audit report',
          html: generateVerificationEmailHtml(verificationUrl),
        });
      } catch (emailError) {
        console.error('Verification email send error:', emailError);
        return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
      }
    } else {
      console.log('Email not configured. Verification URL:', verificationUrl);
    }

    return NextResponse.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Verify token and grant access
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verificationToken = searchParams.get('token');

    if (!verificationToken) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
    }

    // Find access log entry with this verification token
    const accessLog = await db.query.reportAccessLog.findFirst({
      where: eq(reportAccessLog.verificationToken, verificationToken),
    });

    if (!accessLog) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 404 });
    }

    if (accessLog.emailVerified) {
      return NextResponse.json({ alreadyVerified: true });
    }

    // Mark as verified
    await db.update(reportAccessLog)
      .set({
        emailVerified: true,
        accessedAt: new Date(),
      })
      .where(eq(reportAccessLog.id, accessLog.id));

    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
