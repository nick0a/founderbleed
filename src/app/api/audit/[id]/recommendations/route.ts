import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audits, events, users, roleRecommendations } from '@/lib/db/schema';
import { decrypt } from '@/lib/encryption';
import { generateRoleRecommendations } from '@/lib/role-clustering';
import { eq, and } from 'drizzle-orm';

// Get or generate role recommendations for an audit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: auditId } = await params;

  // Verify audit belongs to user
  const auditResult = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.userId, session.user.id)))
    .limit(1);

  const audit = auditResult[0];

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Check if recommendations already exist
  const existingRoles = await db
    .select()
    .from(roleRecommendations)
    .where(eq(roleRecommendations.auditId, auditId))
    .orderBy(roleRecommendations.sortOrder);

  if (existingRoles.length > 0) {
    return NextResponse.json({
      recommendations: existingRoles.map((r) => ({
        id: r.id,
        roleTitle: r.roleTitle,
        roleTier: r.roleTier,
        vertical: r.vertical,
        businessArea: r.businessArea,
        hoursPerWeek: Number(r.hoursPerWeek),
        costWeekly: Number(r.costWeekly),
        costMonthly: Number(r.costMonthly),
        costAnnual: Number(r.costAnnual),
        jdText: r.jdText,
        tasks: r.tasksList || [],
      })),
    });
  }

  // Get user rates
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userResult[0];

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get all events for this audit
  const auditEvents = await db
    .select()
    .from(events)
    .where(eq(events.auditId, auditId));

  // Calculate audit days
  const auditDays =
    Math.ceil(
      (audit.dateEnd.getTime() - audit.dateStart.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  // Generate recommendations
  const clusterEvents = auditEvents.map((e) => ({
    title: e.title ? decrypt(e.title) : 'Untitled',
    finalTier: e.finalTier,
    businessArea: e.businessArea,
    vertical: e.vertical,
    durationMinutes: e.durationMinutes || 0,
  }));

  // Calculate average tier rates (use vertical-specific later)
  const tierRates = {
    senior: (Number(user.seniorEngineeringRate) + Number(user.seniorBusinessRate)) / 2 || 100000,
    junior: (Number(user.juniorEngineeringRate) + Number(user.juniorBusinessRate)) / 2 || 50000,
    ea: Number(user.eaRate) || 30000,
  };

  const recommendations = generateRoleRecommendations(
    clusterEvents,
    auditDays,
    tierRates
  );

  // Store recommendations in database
  if (recommendations.length > 0) {
    await db.insert(roleRecommendations).values(
      recommendations.map((r, index) => ({
        auditId,
        roleTitle: r.roleTitle,
        roleTier: r.roleTier,
        vertical: r.vertical,
        businessArea: r.businessArea,
        hoursPerWeek: String(r.hoursPerWeek),
        costWeekly: String(r.costWeekly),
        costMonthly: String(r.costMonthly),
        costAnnual: String(r.costAnnual),
        jdText: r.jdText,
        tasksList: r.tasks,
        sortOrder: index,
      }))
    );
  }

  return NextResponse.json({
    recommendations: recommendations.map((r) => ({
      roleTitle: r.roleTitle,
      roleTier: r.roleTier,
      vertical: r.vertical,
      businessArea: r.businessArea,
      hoursPerWeek: r.hoursPerWeek,
      costWeekly: r.costWeekly,
      costMonthly: r.costMonthly,
      costAnnual: r.costAnnual,
      jdText: r.jdText,
      tasks: r.tasks,
    })),
  });
}

// Regenerate recommendations (delete existing and create new)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: auditId } = await params;

  // Verify audit belongs to user
  const auditResult = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.userId, session.user.id)))
    .limit(1);

  const audit = auditResult[0];

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Delete existing recommendations
  await db
    .delete(roleRecommendations)
    .where(eq(roleRecommendations.auditId, auditId));

  // Get user rates
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userResult[0];

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get all events for this audit
  const auditEvents = await db
    .select()
    .from(events)
    .where(eq(events.auditId, auditId));

  // Calculate audit days
  const auditDays =
    Math.ceil(
      (audit.dateEnd.getTime() - audit.dateStart.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  // Generate recommendations
  const clusterEvents = auditEvents.map((e) => ({
    title: e.title ? decrypt(e.title) : 'Untitled',
    finalTier: e.finalTier,
    businessArea: e.businessArea,
    vertical: e.vertical,
    durationMinutes: e.durationMinutes || 0,
  }));

  const tierRates = {
    senior: (Number(user.seniorEngineeringRate) + Number(user.seniorBusinessRate)) / 2 || 100000,
    junior: (Number(user.juniorEngineeringRate) + Number(user.juniorBusinessRate)) / 2 || 50000,
    ea: Number(user.eaRate) || 30000,
  };

  const recommendations = generateRoleRecommendations(
    clusterEvents,
    auditDays,
    tierRates
  );

  // Store recommendations
  if (recommendations.length > 0) {
    await db.insert(roleRecommendations).values(
      recommendations.map((r, index) => ({
        auditId,
        roleTitle: r.roleTitle,
        roleTier: r.roleTier,
        vertical: r.vertical,
        businessArea: r.businessArea,
        hoursPerWeek: String(r.hoursPerWeek),
        costWeekly: String(r.costWeekly),
        costMonthly: String(r.costMonthly),
        costAnnual: String(r.costAnnual),
        jdText: r.jdText,
        tasksList: r.tasks,
        sortOrder: index,
      }))
    );
  }

  return NextResponse.json({
    success: true,
    recommendations: recommendations.map((r) => ({
      roleTitle: r.roleTitle,
      roleTier: r.roleTier,
      vertical: r.vertical,
      businessArea: r.businessArea,
      hoursPerWeek: r.hoursPerWeek,
      costWeekly: r.costWeekly,
      costMonthly: r.costMonthly,
      costAnnual: r.costAnnual,
      jdText: r.jdText,
      tasks: r.tasks,
    })),
  });
}
