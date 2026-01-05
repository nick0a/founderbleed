import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';

// Handle OAuth callback for calendar write scope upgrade
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL('/planning?error=oauth_denied', req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/planning?error=no_code', req.url));
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/calendar/upgrade-scope/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/planning?error=token_exchange_failed', req.url));
    }

    const tokens = await tokenResponse.json();

    // Update calendar connection with new tokens and write access
    const existing = await db.query.calendarConnections.findFirst({
      where: eq(calendarConnections.userId, session.user.id),
    });

    const scopes = tokens.scope?.split(' ') || [];
    const hasWriteAccess = scopes.some((s: string) => s.includes('calendar.events'));

    if (existing) {
      await db.update(calendarConnections)
        .set({
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : existing.refreshToken,
          tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          scopes,
          hasWriteAccess,
        })
        .where(eq(calendarConnections.userId, session.user.id));
    } else {
      await db.insert(calendarConnections).values({
        userId: session.user.id,
        provider: 'google',
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes,
        hasWriteAccess,
      });
    }

    console.log('Calendar write access granted for user:', session.user.id);
    return NextResponse.redirect(new URL('/planning?write_access=granted', req.url));
  } catch (error) {
    console.error('Failed to upgrade calendar scope:', error);
    return NextResponse.redirect(new URL('/planning?error=upgrade_failed', req.url));
  }
}
