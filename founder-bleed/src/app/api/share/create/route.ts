import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, sharedReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET or create a share token for an audit
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auditId } = await request.json();

    if (!auditId) {
      return NextResponse.json({ error: 'Missing auditId' }, { status: 400 });
    }

    // Verify audit exists and belongs to user
    const [audit] = await db.select().from(auditRuns).where(eq(auditRuns.id, auditId));
    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    if (audit.userId !== session.user.id) {
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

    return NextResponse.json({
      shareToken: sharedReport.shareToken,
      shareUrl,
      expiresAt: sharedReport.expiresAt,
    });
  } catch (error) {
    console.error('Error creating share token:', error);
    return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 });
  }
}
