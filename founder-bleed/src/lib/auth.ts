import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, account, user }) {
      if (account && user && account.access_token) {
        const userId = user.id ?? token.sub;
        if (!userId) {
          return token;
        }

        const { encrypt } = await import("@/lib/encryption");
        const accessToken = encrypt(account.access_token);
        const refreshToken = account.refresh_token ? encrypt(account.refresh_token) : null;

        token.accessToken = accessToken;
        token.refreshToken = refreshToken;
        token.expiresAt = account.expires_at ?? null;

        const scopes = account.scope?.split(" ") ?? [];
        const hasWriteAccess = scopes.includes(
          "https://www.googleapis.com/auth/calendar.events"
        );

        await db
          .insert(calendarConnections)
          .values({
            id: globalThis.crypto.randomUUID(),
            userId,
            provider: "google",
            accessToken,
            refreshToken,
            tokenExpiresAt: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
            scopes,
            hasWriteAccess,
          })
          .onConflictDoUpdate({
            target: [calendarConnections.userId, calendarConnections.provider],
            set: {
              accessToken,
              refreshToken,
              tokenExpiresAt: account.expires_at
                ? new Date(account.expires_at * 1000)
                : null,
              scopes,
              hasWriteAccess,
              revokedAt: null,
            },
          });
      }
      return token;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/error",
  },
});
