import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Email validation helper
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auditId, emails } = await request.json();

    if (!auditId || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Missing auditId or emails' }, { status: 400 });
    }

    // Validate all emails
    for (const email of emails) {
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: `Invalid email: ${email}` }, { status: 400 });
      }
    }

    // Verify audit exists and belongs to user
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [audit] = await db.select().from(auditRuns).where(eq(auditRuns.id, auditId));
    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    if (audit.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to share this audit' }, { status: 403 });
    }

    // Generate share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/results/${auditId}`;

    // For now, we'll just log the share action
    // In production, integrate with Resend as per integration-resend.md
    console.log(`Sharing audit ${auditId} with emails:`, emails);
    console.log(`Share URL: ${shareUrl}`);

    // TODO: Integrate with Resend for actual email sending
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // for (const email of emails) {
    //   await resend.emails.send({
    //     from: 'Founder Bleed <noreply@founderbleed.com>',
    //     to: email,
    //     subject: `${session.user.name || 'Someone'} shared their calendar audit with you`,
    //     html: generateShareEmailTemplate({ shareUrl, senderName: session.user.name || 'A Founder Bleed user' })
    //   });
    // }

    return NextResponse.json({ 
      success: true, 
      sentCount: emails.length,
      shareUrl 
    });
  } catch (error) {
    console.error('Error sending report:', error);
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
  }
}