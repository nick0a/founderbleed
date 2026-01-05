import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, events, roleRecommendations, users } from '@/lib/db/schema';
import { decrypt } from '@/lib/encryption';
import { eq, and } from 'drizzle-orm';
import { generateRoleRecommendations, generateJobDescription, RoleRecommendation } from '@/lib/role-clustering';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Get the audit run
  const auditRun = await db.query.auditRuns.findFirst({
    where: and(
      eq(auditRuns.id, id),
      eq(auditRuns.userId, session.user.id)
    )
  });

  if (!auditRun) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Get all events for this audit
  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, id)
  });

  // Decrypt event titles and descriptions
  const decryptedEvents = auditEvents.map(e => ({
    ...e,
    title: e.title ? decrypt(e.title) : '',
    description: e.description ? decrypt(e.description) : ''
  }));

  // Get existing role recommendations
  let existingRecommendations = await db.query.roleRecommendations.findMany({
    where: eq(roleRecommendations.auditRunId, id)
  });

  // If no recommendations exist, generate them
  if (existingRecommendations.length === 0 && decryptedEvents.length > 0) {
    // Get user for tier rates
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    });

    const tierRates = {
      senior: Math.max(
        parseFloat(user?.seniorEngineeringRate || '100000'),
        parseFloat(user?.seniorBusinessRate || '80000')
      ),
      junior: Math.max(
        parseFloat(user?.juniorEngineeringRate || '40000'),
        parseFloat(user?.juniorBusinessRate || '50000')
      ),
      ea: parseFloat(user?.eaRate || '25000')
    };

    // Calculate audit days
    const auditDays = Math.max(1, Math.ceil(
      (new Date(auditRun.dateEnd).getTime() - new Date(auditRun.dateStart).getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Generate recommendations
    const generatedRoles = generateRoleRecommendations(
      decryptedEvents.map(e => ({
        title: e.title,
        finalTier: e.finalTier || 'founder',
        businessArea: e.businessArea || 'Operations',
        vertical: e.vertical || 'business',
        durationMinutes: e.durationMinutes || 0
      })),
      auditDays,
      tierRates
    );

    // Save recommendations to database
    for (const role of generatedRoles) {
      const jdText = generateJobDescription(role);
      await db.insert(roleRecommendations).values({
        auditRunId: id,
        roleTitle: role.roleTitle,
        roleTier: role.roleTier,
        vertical: role.vertical,
        businessArea: role.businessArea,
        hoursPerWeek: role.hoursPerWeek.toString(),
        costWeekly: role.costWeekly.toString(),
        costMonthly: role.costMonthly.toString(),
        costAnnual: role.costAnnual.toString(),
        jdText,
        tasksList: role.tasks
      });
    }

    // Fetch the saved recommendations
    existingRecommendations = await db.query.roleRecommendations.findMany({
      where: eq(roleRecommendations.auditRunId, id)
    });
  }

  // Get user info for display
  const userData = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      name: true,
      username: true,
      salaryAnnual: true
    }
  });

  return NextResponse.json({
    audit: auditRun,
    events: decryptedEvents,
    roleRecommendations: existingRecommendations.map(r => ({
      ...r,
      hoursPerWeek: parseFloat(r.hoursPerWeek),
      costWeekly: parseFloat(r.costWeekly),
      costMonthly: parseFloat(r.costMonthly),
      costAnnual: parseFloat(r.costAnnual)
    })),
    user: userData
  });
}