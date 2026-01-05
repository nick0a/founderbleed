import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  users,
  auditRuns,
  events,
  roleRecommendations,
  byokKeys,
  subscriptions,
  scheduledAudits,
  calendarConnections,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  try {
    // Fetch all user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    const audits = await db.query.auditRuns.findMany({
      where: eq(auditRuns.userId, session.user.id),
      orderBy: [desc(auditRuns.createdAt)],
    });

    // Fetch events for each audit
    const auditsWithEvents = await Promise.all(
      audits.map(async (audit) => {
        const auditEvents = await db.query.events.findMany({
          where: eq(events.auditRunId, audit.id),
        });

        const recommendations = await db.query.roleRecommendations.findMany({
          where: eq(roleRecommendations.auditRunId, audit.id),
        });

        return {
          ...audit,
          events: auditEvents.map(e => ({
            ...e,
            // Decrypt titles if needed - but for export we'll keep them as-is
            // since the user owns this data
          })),
          recommendations,
        };
      })
    );

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id),
    });

    const scheduled = await db.query.scheduledAudits.findFirst({
      where: eq(scheduledAudits.userId, session.user.id),
    });

    const calendar = await db.query.calendarConnections.findFirst({
      where: eq(calendarConnections.userId, session.user.id),
    });

    const keys = await db.query.byokKeys.findMany({
      where: eq(byokKeys.userId, session.user.id),
    });

    if (format === 'markdown') {
      const markdown = generateMarkdown(user, auditsWithEvents, subscription);

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="founder-bleed-export-${new Date().toISOString().split('T')[0]}.md"`,
        },
      });
    }

    // JSON format
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        email: user?.email,
        name: user?.name,
        username: user?.username,
        createdAt: user?.createdAt,
        currency: user?.currency,
        salaryAnnual: user?.salaryAnnual,
        teamComposition: user?.teamComposition,
        settings: user?.settings,
        notificationPreferences: user?.notificationPreferences,
      },
      subscription: subscription ? {
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        llmBudgetCents: subscription.llmBudgetCents,
        llmSpentCents: subscription.llmSpentCents,
      } : null,
      auditRuns: auditsWithEvents.map(audit => ({
        id: audit.id,
        dateStart: audit.dateStart,
        dateEnd: audit.dateEnd,
        createdAt: audit.createdAt,
        status: audit.status,
        algorithmVersion: audit.algorithmVersion,
        frequency: audit.frequency,
        planningScore: audit.planningScore,
        planningAssessment: audit.planningAssessment,
        leaveDaysDetected: audit.leaveDaysDetected,
        metrics: audit.computedMetrics,
        events: audit.events.map(e => ({
          id: e.id,
          startAt: e.startAt,
          endAt: e.endAt,
          durationMinutes: e.durationMinutes,
          isAllDay: e.isAllDay,
          title: e.title,
          suggestedTier: e.suggestedTier,
          finalTier: e.finalTier,
          reconciled: e.reconciled,
          businessArea: e.businessArea,
          vertical: e.vertical,
          planningScore: e.planningScore,
          isLeave: e.isLeave,
        })),
        recommendations: audit.recommendations.map(r => ({
          roleTitle: r.roleTitle,
          roleTier: r.roleTier,
          vertical: r.vertical,
          businessArea: r.businessArea,
          hoursPerWeek: r.hoursPerWeek,
          costWeekly: r.costWeekly,
          costAnnual: r.costAnnual,
          jdText: r.jdText,
          tasksList: r.tasksList,
        })),
      })),
      scheduledAudits: scheduled ? {
        frequency: scheduled.frequency,
        dayOfWeek: scheduled.dayOfWeek,
        hour: scheduled.hour,
        timezone: scheduled.timezone,
        enabled: scheduled.enabled,
        nextRunAt: scheduled.nextRunAt,
      } : null,
      calendarConnection: calendar ? {
        provider: calendar.provider,
        hasWriteAccess: calendar.hasWriteAccess,
        connectedAt: calendar.connectedAt,
        scopes: calendar.scopes,
      } : null,
      byokKeys: keys.map(k => ({
        provider: k.provider,
        priority: k.priority,
        createdAt: k.createdAt,
        // Don't include actual keys in export
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="founder-bleed-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

function generateMarkdown(
  user: typeof users.$inferSelect | undefined,
  audits: Array<typeof auditRuns.$inferSelect & {
    events: Array<typeof events.$inferSelect>;
    recommendations: Array<typeof roleRecommendations.$inferSelect>;
  }>,
  subscription: typeof subscriptions.$inferSelect | null | undefined
): string {
  const lines: string[] = [];

  lines.push('# Founder Bleed Data Export');
  lines.push(`Exported: ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`);
  lines.push('');

  // User info
  lines.push('## Account');
  lines.push(`- **Email:** ${user?.email || 'N/A'}`);
  lines.push(`- **Name:** ${user?.name || user?.username || 'N/A'}`);
  lines.push(`- **Member since:** ${user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push(`- **Total Audits:** ${audits.length}`);

  if (audits.length > 0) {
    const latestAudit = audits[0];
    const metrics = latestAudit.computedMetrics as Record<string, unknown> | null;

    lines.push(`- **Latest Efficiency Score:** ${metrics?.efficiencyScore ? `${Math.round(metrics.efficiencyScore as number)}%` : 'N/A'}`);
    lines.push(`- **Latest Planning Score:** ${latestAudit.planningScore ? `${latestAudit.planningScore}%` : 'N/A'}`);
  }

  if (subscription?.status === 'active') {
    lines.push(`- **Subscription:** ${subscription.tier || 'Active'}`);
  }
  lines.push('');

  // Audits
  if (audits.length > 0) {
    lines.push('## Audit History');
    lines.push('');

    for (const audit of audits.slice(0, 5)) { // Show last 5 audits
      const startDate = audit.dateStart ? new Date(audit.dateStart).toLocaleDateString() : 'N/A';
      const endDate = audit.dateEnd ? new Date(audit.dateEnd).toLocaleDateString() : 'N/A';

      lines.push(`### ${startDate} - ${endDate}`);

      const metrics = audit.computedMetrics as Record<string, unknown> | null;

      if (metrics) {
        lines.push('#### Metrics');
        lines.push(`- Total Hours: ${metrics.totalHours || 0}`);
        lines.push(`- Unique Hours: ${metrics.uniqueHours || 0} (${metrics.uniquePercent || 0}%)`);
        lines.push(`- Founder Hours: ${metrics.founderHours || 0} (${metrics.founderPercent || 0}%)`);
        lines.push(`- Senior Hours: ${metrics.seniorHours || 0} (${metrics.seniorPercent || 0}%)`);
        lines.push(`- Junior Hours: ${metrics.juniorHours || 0} (${metrics.juniorPercent || 0}%)`);
        lines.push(`- EA Hours: ${metrics.eaHours || 0} (${metrics.eaPercent || 0}%)`);
        lines.push(`- Efficiency Score: ${metrics.efficiencyScore ? Math.round(metrics.efficiencyScore as number) : 0}%`);

        if (metrics.founderCost || metrics.delegatedCost || metrics.arbitrage) {
          lines.push('');
          lines.push('#### Cost Analysis');
          lines.push(`- Founder Cost: $${Number(metrics.founderCost || 0).toLocaleString()}`);
          lines.push(`- Delegated Cost: $${Number(metrics.delegatedCost || 0).toLocaleString()}`);
          lines.push(`- Arbitrage (Savings): $${Number(metrics.arbitrage || 0).toLocaleString()}`);
        }
      }

      if (audit.planningScore !== null) {
        lines.push(`- Planning Score: ${audit.planningScore}%`);
      }

      // Role Recommendations
      if (audit.recommendations.length > 0) {
        lines.push('');
        lines.push('#### Recommended Hires');

        for (const rec of audit.recommendations) {
          lines.push(`- **${rec.roleTitle}** (${rec.roleTier})`);
          lines.push(`  - Hours/week: ${rec.hoursPerWeek}`);
          lines.push(`  - Annual cost: $${Number(rec.costAnnual || 0).toLocaleString()}`);
        }
      }

      lines.push('');
    }

    if (audits.length > 5) {
      lines.push(`*...and ${audits.length - 5} more audits*`);
      lines.push('');
    }
  }

  // Footer
  lines.push('---');
  lines.push('*Exported from [Founder Bleed](https://founderbleed.com)*');

  return lines.join('\n');
}
