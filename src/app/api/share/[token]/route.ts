import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sharedReports, audits, events, roleRecommendations, reportAccessLog } from '@/lib/db/schema';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { randomBytes } from 'crypto';

// GET /api/share/[token] - Get shared report data (requires email verification)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const url = new URL(request.url);
    const verificationToken = url.searchParams.get('verification');

    // Find share link
    const [share] = await db
      .select()
      .from(sharedReports)
      .where(
        and(
          eq(sharedReports.shareToken, token),
          isNull(sharedReports.revokedAt)
        )
      )
      .limit(1);

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // If no verification token, return minimal info (prompts email capture)
    if (!verificationToken) {
      return NextResponse.json({
        requiresEmail: true,
        message: 'Email verification required to view report',
      });
    }

    // Verify email token
    const [accessLog] = await db
      .select()
      .from(reportAccessLog)
      .where(
        and(
          eq(reportAccessLog.sharedReportId, share.id),
          eq(reportAccessLog.verificationToken, verificationToken),
          eq(reportAccessLog.emailVerified, true)
        )
      )
      .limit(1);

    if (!accessLog) {
      return NextResponse.json({ error: 'Invalid or unverified access token' }, { status: 403 });
    }

    // Fetch audit data (excluding sensitive info)
    const [audit] = await db
      .select()
      .from(audits)
      .where(eq(audits.id, share.auditId))
      .limit(1);

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    // Get events
    const auditEvents = await db
      .select()
      .from(events)
      .where(eq(events.auditId, share.auditId));

    // Decrypt titles for display
    const decryptedEvents = auditEvents.map((event) => ({
      id: event.id,
      title: event.title ? decrypt(event.title) : 'Event',
      startAt: event.startAt,
      durationMinutes: event.durationMinutes,
      finalTier: event.finalTier,
      businessArea: event.businessArea,
      isLeave: event.isLeave,
    }));

    // Get role recommendations
    const roles = await db
      .select()
      .from(roleRecommendations)
      .where(eq(roleRecommendations.auditId, share.auditId));

    // Return report data WITHOUT sensitive compensation info
    return NextResponse.json({
      audit: {
        id: audit.id,
        dateStart: audit.dateStart,
        dateEnd: audit.dateEnd,
        computedMetrics: audit.computedMetrics ? {
          // Only include non-sensitive metrics
          totalHours: (audit.computedMetrics as Record<string, unknown>).totalHours,
          hoursByTier: (audit.computedMetrics as Record<string, unknown>).hoursByTier,
          reclaimableHoursWeekly: (audit.computedMetrics as Record<string, unknown>).reclaimableHoursWeekly,
          efficiencyScore: (audit.computedMetrics as Record<string, unknown>).efficiencyScore,
          // EXCLUDE: arbitrage, founderCost, etc.
        } : null,
        planningScore: audit.planningScore,
      },
      events: decryptedEvents,
      roles: roles.map((r) => ({
        roleTitle: r.roleTitle,
        roleTier: r.roleTier,
        vertical: r.vertical,
        businessArea: r.businessArea,
        hoursPerWeek: r.hoursPerWeek,
        jdText: r.jdText,
        // EXCLUDE: cost info
      })),
    });
  } catch (error) {
    console.error('Error fetching shared report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/share/[token] - Request email verification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Find share link
    const [share] = await db
      .select()
      .from(sharedReports)
      .where(
        and(
          eq(sharedReports.shareToken, token),
          isNull(sharedReports.revokedAt)
        )
      )
      .limit(1);

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');

    // Create access log entry
    await db.insert(reportAccessLog).values({
      sharedReportId: share.id,
      viewerEmail: email.toLowerCase(),
      verificationToken,
      emailVerified: false,
    });

    // In production, send verification email
    // For MVP, auto-verify
    await db
      .update(reportAccessLog)
      .set({ emailVerified: true })
      .where(eq(reportAccessLog.verificationToken, verificationToken));

    return NextResponse.json({
      success: true,
      verificationToken, // In production, this would be sent via email
      message: 'Email verified. You can now view the report.',
    });
  } catch (error) {
    console.error('Error requesting email verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
