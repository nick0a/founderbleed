import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { calendarConnections, users, accounts, sessions, verificationTokens } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, account, user }) {
      if (account) {
        const accessToken = encrypt(account.access_token!);
        const refreshToken = account.refresh_token ? encrypt(account.refresh_token) : undefined;
        
        const userId = user?.id || token.sub;
        
        if (userId) {
             const existingConnection = await db.query.calendarConnections.findFirst({
                 where: and(
                     eq(calendarConnections.userId, userId),
                     eq(calendarConnections.provider, 'google')
                 )
             });

             const scopes = account.scope?.split(' ') || [];
             const hasWriteAccess = scopes.includes('https://www.googleapis.com/auth/calendar') || 
                                    scopes.includes('https://www.googleapis.com/auth/calendar.events');

             if (existingConnection) {
                 await db.update(calendarConnections).set({
                     accessToken,
                     ...(refreshToken ? { refreshToken } : {}),
                     tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
                     scopes: scopes,
                     hasWriteAccess,
                     connectedAt: new Date()
                 }).where(eq(calendarConnections.id, existingConnection.id));
             } else {
                 await db.insert(calendarConnections).values({
                     userId,
                     provider: 'google',
                     accessToken,
                     refreshToken,
                     tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
                     scopes: scopes,
                     hasWriteAccess,
                     connectedAt: new Date()
                 });
             }
        }
      }
      return token;
    },
  },
  session: { strategy: 'jwt' },
});
