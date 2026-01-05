import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, users, sharedReports, reportAccessLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resend, EMAIL_FROM, isEmailConfigured } from '@/lib/resend';
import { nanoid } from 'nanoid';

// Email validation helper
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateShareEmailHtml(senderName: string, shareUrl: string, heroMetric?: string): string {
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
      ${senderName} shared their calendar audit with you
    </h1>

    ${heroMetric ? `
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="font-size: 20px; font-weight: bold; color: #dc2626; margin: 0;">
        They discovered they're losing ${heroMetric}/year on delegatable work
      </p>
    </div>
    ` : ''}

    <p style="color: #374151; line-height: 1.6; margin-bottom: 24px;">
      Click below to view their detailed audit results, including role recommendations
      and delegation opportunities.
    </p>

    <a href="${shareUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
      View Audit Results
    </a>

    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0 20px;">

    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      Want to audit your own calendar?
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://founderbleed.com'}" style="color: #000;">Get started free</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auditId, emails } = await request.json();

    if (!auditId || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Missing auditId or emails' }, { status: 400 });
    }

    // Validate all emails
    for (const email of emails) {
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: `Invalid email: ${email}` }, { status: 400 });
      }
    }

    // Verify audit exists and belongs to user
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [audit] = await db.select().from(auditRuns).where(eq(auditRuns.id, auditId));
    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    if (audit.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to share this audit' }, { status: 403 });
    }

    // Get or create share token
    let sharedReport = await db.query.sharedReports.findFirst({
      where: eq(sharedReports.auditRunId, auditId),
    });

    if (!sharedReport) {
      const shareToken = nanoid(32);
      const [created] = await db.insert(sharedReports).values({
        auditRunId: auditId,
        shareToken,
        ownerUserId: session.user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }).returning();
      sharedReport = created;
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'}/share/${sharedReport.shareToken}`;

    // Extract hero metric if available
    const metrics = audit.computedMetrics as { annualArbitrage?: number } | null;
    const heroMetric = metrics?.annualArbitrage
      ? `$${Math.round(metrics.annualArbitrage).toLocaleString()}`
      : undefined;

    // Send emails via Resend (if configured)
    if (isEmailConfigured()) {
      const emailPromises = emails.map((email: string) => ({
        from: EMAIL_FROM,
        to: [email],
        subject: `${session.user?.name || user.name || 'Someone'} shared their calendar audit with you`,
        html: generateShareEmailHtml(
          session.user?.name || user.name || 'A Founder Bleed user',
          shareUrl,
          heroMetric
        ),
      }));

      try {
        const { data, error } = await resend.batch.send(emailPromises);
        if (error) {
          console.error('Resend batch error:', error);
          // Continue anyway - we'll still log the access
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Continue anyway
      }
    } else {
      console.log('Email not configured. Would send to:', emails);
      console.log('Share URL:', shareUrl);
    }

    // Store emails as leads
    for (const email of emails) {
      await db.insert(reportAccessLog).values({
        sharedReportId: sharedReport.id,
        viewerEmail: email,
        emailVerified: false,
      });
    }

    return NextResponse.json({
      success: true,
      sentCount: emails.length,
      shareUrl,
      shareToken: sharedReport.shareToken,
    });
  } catch (error) {
    console.error('Error sending report:', error);
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
  }
}
