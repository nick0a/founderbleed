import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  users,
  accounts,
  sessions,
  auditRuns,
  events,
  roleRecommendations,
  byokKeys,
  subscriptions,
  scheduledAudits,
  calendarConnections,
  notifications,
  planningSessions,
  sharedReports,
  reportAccessLog,
  contacts,
  userPrivacySettings,
} from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import Stripe from 'stripe';
import { resend, EMAIL_FROM, isEmailConfigured } from '@/lib/resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { confirmation } = await request.json();

    // Require user to type "DELETE" to confirm
    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type DELETE to confirm account deletion' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Get user info for confirmation email
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // 1. Cancel active subscription if any
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (subscription?.stripeSubscriptionId && subscription.status === 'active') {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
          prorate: true,
        });
      } catch (error) {
        console.error('Failed to cancel Stripe subscription:', error);
        // Continue with deletion even if Stripe fails
      }
    }

    // 2. Delete all audit-related data
    // First get all audit IDs for this user
    const userAudits = await db.query.auditRuns.findMany({
      where: eq(auditRuns.userId, userId),
      columns: { id: true },
    });

    const auditIds = userAudits.map(a => a.id);

    // Delete events and recommendations for each audit
    for (const auditId of auditIds) {
      await db.delete(events).where(eq(events.auditRunId, auditId));
      await db.delete(roleRecommendations).where(eq(roleRecommendations.auditRunId, auditId));

      // Delete shared reports and their access logs
      const reports = await db.query.sharedReports.findMany({
        where: eq(sharedReports.auditRunId, auditId),
        columns: { id: true },
      });

      for (const report of reports) {
        await db.delete(reportAccessLog).where(eq(reportAccessLog.sharedReportId, report.id));
      }

      await db.delete(sharedReports).where(eq(sharedReports.auditRunId, auditId));
    }

    // Delete audit runs
    await db.delete(auditRuns).where(eq(auditRuns.userId, userId));

    // 3. Delete calendar connections
    await db.delete(calendarConnections).where(eq(calendarConnections.userId, userId));

    // 4. Delete notifications
    await db.delete(notifications).where(eq(notifications.userId, userId));

    // 5. Delete contacts (where user is either sender or receiver)
    await db.delete(contacts).where(
      or(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, userId)
      )
    );

    // 6. Delete privacy settings
    await db.delete(userPrivacySettings).where(eq(userPrivacySettings.userId, userId));

    // 7. Delete BYOK keys
    await db.delete(byokKeys).where(eq(byokKeys.userId, userId));

    // 8. Delete scheduled audits
    await db.delete(scheduledAudits).where(eq(scheduledAudits.userId, userId));

    // 9. Delete planning sessions
    await db.delete(planningSessions).where(eq(planningSessions.userId, userId));

    // 10. Delete subscription record
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));

    // 11. Delete shared reports by owner (if any remaining)
    await db.delete(sharedReports).where(eq(sharedReports.ownerUserId, userId));

    // 12. Delete sessions (required before deleting accounts and user)
    await db.delete(sessions).where(eq(sessions.userId, userId));

    // 13. Delete accounts (OAuth records)
    await db.delete(accounts).where(eq(accounts.userId, userId));

    // 14. Finally, delete user record
    await db.delete(users).where(eq(users.id, userId));

    // 15. Send confirmation email
    if (isEmailConfigured() && user?.email) {
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: user.email,
          subject: 'Your Founder Bleed account has been deleted',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Account Deleted</h2>
              <p>Your Founder Bleed account has been successfully deleted.</p>
              <p>All your data has been permanently removed, including:</p>
              <ul>
                <li>All audit history and events</li>
                <li>Calendar connections</li>
                <li>Subscription information</li>
                <li>API keys</li>
                <li>Contact connections</li>
              </ul>
              <p>If you did not request this deletion, please contact support immediately.</p>
              <p style="color: #666; font-size: 14px; margin-top: 24px;">
                Thank you for using Founder Bleed. We hope to see you again!
              </p>
            </div>
          `,
        });
      } catch (error) {
        console.error('Failed to send deletion confirmation email:', error);
        // Don't fail the deletion if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
