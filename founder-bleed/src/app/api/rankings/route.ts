import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contacts, users, userPrivacySettings, auditRuns } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

interface RankingEntry {
  rank: number;
  displayName: string;
  efficiencyScore: number | null;
  planningScore: number | null;
  uniqueTimeMinutes: number | null;
  isCurrentUser: boolean;
  isContact: boolean;
  isTeammate: boolean;
  isHidden: boolean;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  // Allow unauthenticated access - will return fully anonymized data
  const isAuthenticated = !!session?.user?.id;
  const currentUserId = session?.user?.id || null;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'global'; // 'global', 'friends', 'team'
  const sortBy = searchParams.get('sortBy') || 'unique'; // 'unique', 'delegation', 'planning'

  // Friends and team require authentication
  if ((type === 'friends' || type === 'team') && !isAuthenticated) {
    return NextResponse.json({ error: 'Authentication required for this view' }, { status: 401 });
  }

  try {
    let currentUser: { email: string | null; name: string | null; username: string | null } | null = null;
    let currentUserDomain: string | null = null;
    let contactUserIds = new Set<string>();

    if (isAuthenticated && currentUserId) {
      // Get current user's company domain for team rankings
      currentUser = await db.query.users.findFirst({
        where: eq(users.id, currentUserId),
        columns: { email: true, name: true, username: true },
      }) || null;

      currentUserDomain = currentUser?.email?.split('@')[1] || null;

      // Get all accepted contacts for the current user
      const acceptedContacts = await db.query.contacts.findMany({
        where: and(
          or(
            eq(contacts.userId, currentUserId),
            eq(contacts.contactUserId, currentUserId)
          ),
          eq(contacts.status, 'accepted')
        ),
      });

      acceptedContacts.forEach(c => {
        if (c.userId && c.userId !== currentUserId) contactUserIds.add(c.userId);
        if (c.contactUserId && c.contactUserId !== currentUserId) contactUserIds.add(c.contactUserId);
      });
    }

    // Get all users with completed audits
    const allUsersWithAudits = await db.query.users.findMany({
      columns: { id: true, name: true, username: true, email: true },
    });

    // Get privacy settings for all users
    const allPrivacySettings = await db.query.userPrivacySettings.findMany();
    const privacyMap = new Map(allPrivacySettings.map(p => [p.userId, p]));

    // Build rankings
    const rankings: RankingEntry[] = [];

    for (const user of allUsersWithAudits) {
      // Get latest completed audit for this user
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

      // Skip users without completed audits
      if (!latestAudit) continue;

      const metrics = latestAudit.computedMetrics as {
        efficiencyScore?: number;
        hoursByTier?: { unique?: number };
      } | null;
      const efficiencyScore = metrics?.efficiencyScore ?? null;
      const planningScore = latestAudit.planningScore ?? null;
      // Convert unique hours to minutes for display as HH:MM
      const uniqueHours = metrics?.hoursByTier?.unique ?? null;
      const uniqueTimeMinutes = uniqueHours !== null ? Math.round(uniqueHours * 60) : null;

      // Skip if no scores
      if (efficiencyScore === null && planningScore === null && uniqueTimeMinutes === null) continue;

      const privacy = privacyMap.get(user.id);
      const shareScores = privacy?.shareScores !== false;
      const anonymousMode = privacy?.anonymousMode === true;
      const isCurrentUser = currentUserId ? user.id === currentUserId : false;
      const isContact = currentUserId ? contactUserIds.has(user.id) : false;
      const userDomain = user.email?.split('@')[1] || null;
      const isTeammate = currentUserDomain && userDomain === currentUserDomain && !isCurrentUser;

      // Filter based on type
      if (type === 'friends' && !isContact && !isCurrentUser) continue;
      if (type === 'team' && !isTeammate && !isCurrentUser) continue;

      // Determine display name and visibility
      let displayName: string;
      let shouldHideScore = false;

      if (!isAuthenticated) {
        // Unauthenticated: everyone is completely anonymous
        displayName = `Founder #${user.id.slice(0, 4)}`;
        shouldHideScore = !shareScores;
      } else if (isCurrentUser) {
        displayName = currentUser?.username || currentUser?.name || 'You';
      } else if (isContact || isTeammate) {
        // Contacts and teammates can see names (unless anonymous mode)
        if (anonymousMode) {
          displayName = 'Anonymous Founder';
        } else {
          displayName = user.username || user.name || user.email?.split('@')[0] || 'Founder';
        }
        shouldHideScore = !shareScores;
      } else {
        // Global: everyone is anonymous unless they're a contact
        displayName = `Founder #${user.id.slice(0, 4)}`;
        shouldHideScore = !shareScores;
      }

      rankings.push({
        rank: 0, // Will be set after sorting
        displayName,
        efficiencyScore: shouldHideScore && !isCurrentUser ? null : efficiencyScore,
        planningScore: shouldHideScore && !isCurrentUser ? null : planningScore,
        uniqueTimeMinutes: shouldHideScore && !isCurrentUser ? null : uniqueTimeMinutes,
        isCurrentUser,
        isContact,
        isTeammate: isTeammate || false,
        isHidden: shouldHideScore && !isCurrentUser,
      });
    }

    // Sort based on sortBy parameter
    if (sortBy === 'planning') {
      // Sort by planning score (highest first, null values at end)
      rankings.sort((a, b) => {
        if (a.planningScore === null && b.planningScore === null) return 0;
        if (a.planningScore === null) return 1;
        if (b.planningScore === null) return -1;
        return b.planningScore - a.planningScore;
      });
    } else if (sortBy === 'delegation') {
      // Sort by efficiency/delegation score (highest first, null values at end)
      rankings.sort((a, b) => {
        if (a.efficiencyScore === null && b.efficiencyScore === null) return 0;
        if (a.efficiencyScore === null) return 1;
        if (b.efficiencyScore === null) return -1;
        return b.efficiencyScore - a.efficiencyScore;
      });
    } else {
      // Default: Sort by unique time (highest first, null values at end)
      rankings.sort((a, b) => {
        if (a.uniqueTimeMinutes === null && b.uniqueTimeMinutes === null) return 0;
        if (a.uniqueTimeMinutes === null) return 1;
        if (b.uniqueTimeMinutes === null) return -1;
        return b.uniqueTimeMinutes - a.uniqueTimeMinutes;
      });
    }

    // Assign ranks
    rankings.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Find current user's rank
    const currentUserRank = rankings.find(r => r.isCurrentUser)?.rank || null;

    // For global, limit to top 100 but always include current user
    let finalRankings = rankings;
    if (type === 'global' && rankings.length > 100) {
      const top100 = rankings.slice(0, 100);
      const currentUserEntry = rankings.find(r => r.isCurrentUser);
      if (currentUserEntry && currentUserEntry.rank > 100) {
        top100.push(currentUserEntry);
      }
      finalRankings = top100;
    }

    return NextResponse.json({
      rankings: finalRankings,
      totalParticipants: rankings.length,
      currentUserRank,
      type,
      sortBy,
      isAuthenticated,
      hasTeam: type === 'team' ? finalRankings.length > 1 : undefined,
    });
  } catch (error) {
    console.error('Get rankings error:', error);
    return NextResponse.json({ error: 'Failed to get rankings' }, { status: 500 });
  }
}
