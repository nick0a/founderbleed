import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { calendarConnections, users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { LLM_BUDGETS, SubscriptionTier } from '@/lib/subscription';

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
    async signIn({ user, account }) {
      // Handle scope upgrade - update existing calendar connection with new tokens
      console.log('=== signIn callback ===');
      console.log('user.id:', user?.id);
      console.log('account.provider:', account?.provider);
      console.log('account.scope:', account?.scope);
      console.log('has access_token:', !!account?.access_token);

      if (account?.provider === 'google' && account.access_token) {
        const hasWriteScope = account.scope?.includes('calendar.events') || false;
        console.log('hasWriteScope:', hasWriteScope);

        // Always try to update tokens when we have them
        try {
          // We need to get user ID from the database since user.id might not be populated yet
          const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user.email!)
          });

          const userId = user.id || dbUser?.id;
          console.log('Resolved userId:', userId);

          if (userId) {
            const existing = await db.query.calendarConnections.findFirst({
              where: eq(calendarConnections.userId, userId)
            });
            console.log('Existing connection found:', !!existing, 'hasWriteAccess:', existing?.hasWriteAccess);

            if (existing) {
              await db.update(calendarConnections)
                .set({
                  accessToken: encrypt(account.access_token),
                  refreshToken: account.refresh_token ? encrypt(account.refresh_token) : existing.refreshToken,
                  tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
                  scopes: account.scope?.split(' ') || [],
                  hasWriteAccess: hasWriteScope || existing.hasWriteAccess,
                })
                .where(eq(calendarConnections.userId, userId));
              console.log('Calendar connection updated. hasWriteAccess:', hasWriteScope);
            } else {
              // Create calendar connection if it doesn't exist (e.g., user was reset or connection was deleted)
              await db.insert(calendarConnections).values({
                userId,
                provider: 'google',
                accessToken: encrypt(account.access_token),
                refreshToken: account.refresh_token ? encrypt(account.refresh_token) : null,
                tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
                scopes: account.scope?.split(' ') || [],
                hasWriteAccess: hasWriteScope,
              });
              console.log('Calendar connection created in signIn callback for user:', userId);
            }
          }
        } catch (error) {
          console.error('Failed to update calendar connection:', error);
        }
      }
      return true;
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

          // Auto-sync subscription from Stripe if user has existing subscription
          // This handles the case where user was deleted from DB but Stripe subscription exists
          if (user.email) {
            try {
              console.log('[Auth linkAccount] Checking for existing Stripe subscription for:', user.email);
              const customers = await stripe.customers.list({
                email: user.email,
                limit: 1,
              });

              if (customers.data.length > 0) {
                const customerId = customers.data[0].id;
                const stripeSubscriptions = await stripe.subscriptions.list({
                  customer: customerId,
                  status: 'active',
                  limit: 1,
                });

                if (stripeSubscriptions.data.length > 0) {
                  const stripeSub = stripeSubscriptions.data[0];
                  const tier = (stripeSub.metadata?.tier as SubscriptionTier) || 'starter';

                  // Access period dates - handle different Stripe API versions
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const subAny = stripeSub as any;
                  let periodStart: Date;
                  let periodEnd: Date;

                  if (typeof subAny.current_period_start === 'number') {
                    periodStart = new Date(subAny.current_period_start * 1000);
                    periodEnd = new Date(subAny.current_period_end * 1000);
                  } else if (subAny.current_period_start instanceof Date) {
                    periodStart = subAny.current_period_start;
                    periodEnd = subAny.current_period_end;
                  } else {
                    periodStart = new Date();
                    periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  }

                  // Check if subscription record already exists
                  const existingSub = await db.query.subscriptions.findFirst({
                    where: eq(subscriptions.userId, user.id)
                  });

                  if (!existingSub) {
                    await db.insert(subscriptions).values({
                      userId: user.id,
                      stripeCustomerId: customerId,
                      stripeSubscriptionId: stripeSub.id,
                      tier,
                      status: 'active',
                      currentPeriodStart: periodStart,
                      currentPeriodEnd: periodEnd,
                      llmBudgetCents: LLM_BUDGETS[tier],
                      llmSpentCents: 0,
                    });
                    console.log('[Auth linkAccount] Subscription synced from Stripe for user:', user.id, 'tier:', tier);
                  }
                }
              }
            } catch (subError) {
              console.error('[Auth linkAccount] Failed to sync subscription:', subError);
              // Don't fail signin if subscription sync fails
            }
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