import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userPrivacySettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Get privacy settings
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await db.query.userPrivacySettings.findFirst({
      where: eq(userPrivacySettings.userId, session.user.id),
    });

    // Return defaults if no settings exist
    return NextResponse.json({
      shareScores: settings?.shareScores ?? true,
      anonymousMode: settings?.anonymousMode ?? false,
    });
  } catch (error) {
    console.error('Get privacy settings error:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// PUT - Update privacy settings
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { shareScores, anonymousMode } = await request.json();

    // Check if settings exist
    const existing = await db.query.userPrivacySettings.findFirst({
      where: eq(userPrivacySettings.userId, session.user.id),
    });

    if (existing) {
      await db.update(userPrivacySettings)
        .set({
          shareScores: shareScores ?? existing.shareScores,
          anonymousMode: anonymousMode ?? existing.anonymousMode,
          updatedAt: new Date(),
        })
        .where(eq(userPrivacySettings.userId, session.user.id));
    } else {
      await db.insert(userPrivacySettings).values({
        userId: session.user.id,
        shareScores: shareScores ?? true,
        anonymousMode: anonymousMode ?? false,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
