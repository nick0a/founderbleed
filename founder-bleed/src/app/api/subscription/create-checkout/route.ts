import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe, getPriceId } from '@/lib/stripe';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tier, billingPeriod = 'monthly', returnUrl } = await request.json();

    if (!['starter', 'team', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (!['monthly', 'annual'].includes(billingPeriod)) {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
    }

    const priceId = getPriceId(tier, billingPeriod);

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for this tier/period' },
        { status: 500 }
      );
    }

    // Check if user already has a subscription with Stripe customer ID
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id),
    });

    // Prevent double subscription to the same tier
    if (existingSubscription && existingSubscription.status === 'active') {
      // If trying to subscribe to the same tier, reject
      if (existingSubscription.tier === tier) {
        return NextResponse.json(
          { error: 'You are already subscribed to this tier. Please manage your subscription from the Settings page.' },
          { status: 400 }
        );
      }
      // If upgrading/downgrading, redirect to customer portal instead
      if (existingSubscription.stripeCustomerId) {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: existingSubscription.stripeCustomerId,
          return_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3003'}/settings`,
        });
        return NextResponse.json({
          checkoutUrl: portalSession.url,
          isPortal: true,
          message: 'You already have an active subscription. Redirecting to manage your plan.'
        });
      }
    }

    // Use the returnUrl if provided, otherwise fall back to dashboard
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3003';
    const successUrl = returnUrl
      ? `${baseUrl}${returnUrl}${returnUrl.includes('?') ? '&' : '?'}checkout=success`
      : `${baseUrl}/dashboard?checkout=success`;
    const cancelUrl = returnUrl
      ? `${baseUrl}${returnUrl}${returnUrl.includes('?') ? '&' : '?'}checkout=cancelled`
      : `${baseUrl}/dashboard?checkout=cancelled`;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: existingSubscription?.stripeCustomerId
        ? undefined
        : session.user.email ?? undefined,
      customer: existingSubscription?.stripeCustomerId ?? undefined,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: session.user.id,
        tier,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          tier,
        },
      },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
