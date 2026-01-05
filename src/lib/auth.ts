import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import {
  calendarConnections,
  users,
  accounts,
  sessions,
  verificationTokens,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn() {
      // Allow sign-in to proceed - calendar connection stored in signIn event
      return true;
    },
  },
  events: {
    async signIn({ user, account }) {
      // Store calendar connection with encrypted tokens (runs after user is created)
      if (account && user.id && account.access_token) {
        try {
          const encryptedAccessToken = encrypt(account.access_token);
          const encryptedRefreshToken = account.refresh_token
            ? encrypt(account.refresh_token)
            : null;

          // Check if connection already exists
          const existing = await db
            .select()
            .from(calendarConnections)
            .where(eq(calendarConnections.userId, user.id))
            .limit(1);

          if (existing.length > 0) {
            // Update existing connection
            await db
              .update(calendarConnections)
              .set({
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
                scopes: account.scope?.split(' ') || [],
                revokedAt: null,
              })
              .where(eq(calendarConnections.userId, user.id));
          } else {
            // Create new connection
            await db.insert(calendarConnections).values({
              userId: user.id,
              provider: 'google',
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt: account.expires_at
                ? new Date(account.expires_at * 1000)
                : null,
              scopes: account.scope?.split(' ') || [],
              hasWriteAccess: false,
            });
          }
        } catch (error) {
          console.error('Error storing calendar connection:', error);
          // Don't block sign-in if this fails
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

// Extend the built-in session types
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
