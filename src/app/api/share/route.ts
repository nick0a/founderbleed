import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sharedReports, audits } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// POST /api/share - Create a share link for an audit
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { auditId } = body;

    if (!auditId) {
      return NextResponse.json(
        { error: 'auditId is required' },
        { status: 400 }
      );
    }

    // Verify audit belongs to user
    const [audit] = await db
      .select()
      .from(audits)
      .where(and(eq(audits.id, auditId), eq(audits.userId, session.user.id)))
      .limit(1);

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    // Check if share link already exists
    const [existingShare] = await db
      .select()
      .from(sharedReports)
      .where(
        and(
          eq(sharedReports.auditId, auditId),
          isNull(sharedReports.revokedAt)
        )
      )
      .limit(1);

    if (existingShare) {
      return NextResponse.json({
        shareToken: existingShare.shareToken,
        shareUrl: `${process.env.NEXTAUTH_URL}/share/${existingShare.shareToken}`,
        expiresAt: existingShare.expiresAt,
      });
    }

    // Generate secure token
    const shareToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Create share link
    await db.insert(sharedReports).values({
      auditId,
      shareToken,
      ownerUserId: session.user.id,
      expiresAt,
    });

    return NextResponse.json({
      shareToken,
      shareUrl: `${process.env.NEXTAUTH_URL}/share/${shareToken}`,
      expiresAt,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/share - Revoke a share link
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shareToken } = body;

    if (!shareToken) {
      return NextResponse.json(
        { error: 'shareToken is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const [share] = await db
      .select()
      .from(sharedReports)
      .where(
        and(
          eq(sharedReports.shareToken, shareToken),
          eq(sharedReports.ownerUserId, session.user.id)
        )
      )
      .limit(1);

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Revoke
    await db
      .update(sharedReports)
      .set({ revokedAt: new Date() })
      .where(eq(sharedReports.id, share.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking share link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
