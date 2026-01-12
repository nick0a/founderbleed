import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// Returns a redirect URL to Google OAuth with write scope
export async function POST(_req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user already has write access
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, session.user.id),
  });

  if (connection?.hasWriteAccess) {
    return NextResponse.json({ hasWriteAccess: true });
  }

  // Build Google OAuth URL with write scope
  // This bypasses NextAuth to directly request the calendar.events scope
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/upgrade-scope/callback`;
  const scope = 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent'); // Force consent to get new refresh token with updated scopes
  // Include login_hint to pre-fill the email
  if (session.user.email) {
    authUrl.searchParams.set('login_hint', session.user.email);
  }

  return NextResponse.json({
    redirectUrl: authUrl.toString(),
  });
}

// GET: Redirect directly to Google OAuth for write scope upgrade
// This is used when linking directly to the upgrade page (e.g., from settings)
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  // Check if user already has write access
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, session.user.id),
  });

  if (connection?.hasWriteAccess) {
    // Already has write access, redirect back to planning
    return NextResponse.redirect(new URL('/planning?write_access=already_granted', req.url));
  }

  if (!connection) {
    // No calendar connection, redirect to planning with error
    return NextResponse.redirect(new URL('/planning?error=no_calendar_connection', req.url));
  }

  // Build Google OAuth URL with write scope
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/upgrade-scope/callback`;
  const scope = 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  if (session.user.email) {
    authUrl.searchParams.set('login_hint', session.user.email);
  }

  return NextResponse.redirect(authUrl.toString());
}
