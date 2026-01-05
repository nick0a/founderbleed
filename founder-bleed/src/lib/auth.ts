import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { calendarConnections, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async linkAccount({ user, account }) {
      // Store encrypted calendar tokens after account is linked (user exists in DB)
      if (account.provider === 'google' && account.access_token && user.id) {
        try {
          // Check if connection already exists
          const existing = await db.query.calendarConnections.findFirst({
            where: eq(calendarConnections.userId, user.id)
          });
          
          if (!existing) {
            await db.insert(calendarConnections).values({
              userId: user.id,
              provider: 'google',
              accessToken: encrypt(account.access_token),
              refreshToken: account.refresh_token ? encrypt(account.refresh_token) : null,
              tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
              scopes: account.scope?.split(' ') || [],
              hasWriteAccess: account.scope?.includes('calendar.events') || false,
            });
            console.log('Calendar connection stored for user:', user.id);
          }
        } catch (error) {
          console.error('Failed to store calendar tokens:', error);
        }
      }
    },
  },
  pages: {
    signIn: '/signin',
    error: '/error',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

// Extend the session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}