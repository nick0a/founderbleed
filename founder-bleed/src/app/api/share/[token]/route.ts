import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sharedReports, reportAccessLog, auditRuns, events, roleRecommendations, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

interface Params {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const viewerEmail = searchParams.get('email');
    const verifyToken = searchParams.get('verify');

    // Find shared report
    const sharedReport = await db.query.sharedReports.findFirst({
      where: eq(sharedReports.shareToken, token),
    });

    if (!sharedReport) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    if (sharedReport.revokedAt) {
      return NextResponse.json({ error: 'This share link has been revoked' }, { status: 403 });
    }

    if (sharedReport.expiresAt && new Date(sharedReport.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 403 });
    }

    // Handle verification token from email link
    if (verifyToken) {
      const accessLog = await db.query.reportAccessLog.findFirst({
        where: and(
          eq(reportAccessLog.sharedReportId, sharedReport.id),
          eq(reportAccessLog.verificationToken, verifyToken),
        ),
      });

      if (accessLog) {
        await db.update(reportAccessLog)
          .set({
            emailVerified: true,
            accessedAt: new Date(),
          })
          .where(eq(reportAccessLog.id, accessLog.id));

        // Return the report data immediately since they clicked email link
        return await getReportData(sharedReport.auditRunId, sharedReport.ownerUserId);
      }
    }

    // Check if viewer has verified email
    if (viewerEmail) {
      const accessLog = await db.query.reportAccessLog.findFirst({
        where: and(
          eq(reportAccessLog.sharedReportId, sharedReport.id),
          eq(reportAccessLog.viewerEmail, viewerEmail),
          eq(reportAccessLog.emailVerified, true),
        ),
      });

      if (accessLog) {
        // Update last access time
        await db.update(reportAccessLog)
          .set({ accessedAt: new Date() })
          .where(eq(reportAccessLog.id, accessLog.id));

        return await getReportData(sharedReport.auditRunId, sharedReport.ownerUserId);
      }

      return NextResponse.json({
        requiresVerification: true,
        message: 'Please verify your email to view this report',
      });
    }

    // No email provided - require email gate
    return NextResponse.json({
      requiresVerification: true,
      message: 'Enter your email to view this report',
    });
  } catch (error) {
    console.error('Get shared report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getReportData(auditRunId: string | null, ownerUserId: string | null) {
  if (!auditRunId) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Get audit data
  const audit = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, auditRunId),
  });

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Get owner info (excluding sensitive data)
  let ownerName = 'A Founder';
  if (ownerUserId) {
    const owner = await db.query.users.findFirst({
      where: eq(users.id, ownerUserId),
    });
    if (owner) {
      ownerName = owner.username || owner.name || 'A Founder';
    }
  }

  // Get events (with encrypted titles decrypted)
  const auditEvents = await db.select().from(events).where(eq(events.auditRunId, auditRunId));
  const decryptedEvents = auditEvents.map(event => ({
    id: event.id,
    startAt: event.startAt,
    endAt: event.endAt,
    durationMinutes: event.durationMinutes,
    title: event.title ? decrypt(event.title) : 'Untitled',
    finalTier: event.finalTier,
    businessArea: event.businessArea,
    vertical: event.vertical,
    eventCategory: event.eventCategory,
    isLeave: event.isLeave,
    planningScore: event.planningScore,
  }));

  // Get role recommendations
  const roles = await db.select().from(roleRecommendations).where(eq(roleRecommendations.auditRunId, auditRunId));

  // Return report data WITHOUT sensitive salary/equity info
  const metrics = audit.computedMetrics as Record<string, unknown> | null;

  return NextResponse.json({
    verified: true,
    report: {
      ownerName,
      dateStart: audit.dateStart,
      dateEnd: audit.dateEnd,
      algorithmVersion: audit.algorithmVersion,
      planningScore: audit.planningScore,
      planningAssessment: audit.planningAssessment,
      metrics: metrics ? {
        // Include time metrics but EXCLUDE salary/compensation details
        totalHours: metrics.totalHours,
        uniqueHours: metrics.uniqueHours,
        founderHours: metrics.founderHours,
        seniorHours: metrics.seniorHours,
        juniorHours: metrics.juniorHours,
        eaHours: metrics.eaHours,
        efficiencyPercent: metrics.efficiencyPercent,
        reclaimableHours: metrics.reclaimableHours,
        annualReclaimableHours: metrics.annualReclaimableHours,
        // Hero metric can be shown (it's abstract enough)
        annualArbitrage: metrics.annualArbitrage,
        weeklyArbitrage: metrics.weeklyArbitrage,
        // DO NOT include:
        // - founderCost
        // - salary
        // - equity
        // - hourlyRate
      } : null,
      events: decryptedEvents,
      roles: roles.map(role => ({
        id: role.id,
        roleTitle: role.roleTitle,
        roleTier: role.roleTier,
        vertical: role.vertical,
        businessArea: role.businessArea,
        hoursPerWeek: role.hoursPerWeek,
        costWeekly: role.costWeekly,
        costMonthly: role.costMonthly,
        costAnnual: role.costAnnual,
        jdText: role.jdText,
        tasksList: role.tasksList,
      })),
    },
    // CTA goes to landing page, NEVER to Stripe
    ctaUrl: '/',
    ctaText: 'Get your own audit',
  });
}
