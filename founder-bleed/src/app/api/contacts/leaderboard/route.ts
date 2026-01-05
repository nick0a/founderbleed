import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contacts, users, userPrivacySettings, auditRuns } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

interface LeaderboardEntry {
  userId: string;
  name: string | null;
  displayName: string;
  efficiencyScore: number | null;
  planningScore: number | null;
  isCurrentUser: boolean;
  isHidden: boolean; // When shareScores is false
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all accepted contacts
    const acceptedContacts = await db.query.contacts.findMany({
      where: and(
        or(
          eq(contacts.userId, session.user.id),
          eq(contacts.contactUserId, session.user.id)
        ),
        eq(contacts.status, 'accepted')
      ),
    });

    // Collect all user IDs (including current user)
    const userIds = new Set<string>([session.user.id]);
    acceptedContacts.forEach(c => {
      if (c.userId) userIds.add(c.userId);
      if (c.contactUserId) userIds.add(c.contactUserId);
    });

    // Get user info and privacy settings
    const usersData = await db.query.users.findMany({
      where: or(...Array.from(userIds).map(id => eq(users.id, id))),
      columns: { id: true, name: true, username: true, email: true },
    });

    const privacyData = await db.query.userPrivacySettings.findMany({
      where: or(...Array.from(userIds).map(id => eq(userPrivacySettings.userId, id))),
    });

    const privacyMap = new Map(privacyData.map(p => [p.userId, p]));

    // Get latest audit for each user
    const leaderboard: LeaderboardEntry[] = [];

    for (const user of usersData) {
      const latestAudit = await db.query.auditRuns.findFirst({
        where: and(
          eq(auditRuns.userId, user.id),
          eq(auditRuns.status, 'completed')
        ),
        orderBy: [desc(auditRuns.createdAt)],
        columns: {
          computedMetrics: true,
          planningScore: true,
        },
      });

      const privacy = privacyMap.get(user.id);
      const shareScores = privacy?.shareScores !== false; // Default to true
      const anonymousMode = privacy?.anonymousMode === true;
      const isCurrentUser = user.id === session.user.id;

      // Current user always sees their own data
      const shouldHideScore = !isCurrentUser && !shareScores;

      const metrics = latestAudit?.computedMetrics as { efficiencyScore?: number } | null;

      leaderboard.push({
        userId: user.id,
        name: user.name,
        displayName: anonymousMode && !isCurrentUser
          ? 'Anonymous Founder'
          : (user.username || user.name || user.email?.split('@')[0] || 'Unknown'),
        efficiencyScore: shouldHideScore ? null : (metrics?.efficiencyScore ?? null),
        planningScore: shouldHideScore ? null : (latestAudit?.planningScore ?? null),
        isCurrentUser,
        isHidden: shouldHideScore,
      });
    }

    // Sort by efficiency score (null values at the end)
    const sortedByEfficiency = [...leaderboard].sort((a, b) => {
      if (a.efficiencyScore === null && b.efficiencyScore === null) return 0;
      if (a.efficiencyScore === null) return 1;
      if (b.efficiencyScore === null) return -1;
      return b.efficiencyScore - a.efficiencyScore;
    });

    // Sort by planning score
    const sortedByPlanning = [...leaderboard].sort((a, b) => {
      if (a.planningScore === null && b.planningScore === null) return 0;
      if (a.planningScore === null) return 1;
      if (b.planningScore === null) return -1;
      return b.planningScore - a.planningScore;
    });

    return NextResponse.json({
      byEfficiency: sortedByEfficiency,
      byPlanning: sortedByPlanning,
      totalContacts: acceptedContacts.length,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 });
  }
}
