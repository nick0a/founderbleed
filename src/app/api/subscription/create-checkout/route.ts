import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

// Stripe price IDs (configure these in your Stripe dashboard)
const STRIPE_PRICES = {
  starter_monthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY || 'price_starter_monthly',
  starter_annual: process.env.STRIPE_PRICE_ID_STARTER_ANNUAL || 'price_starter_annual',
  pro_monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || 'price_pro_monthly',
  pro_annual: process.env.STRIPE_PRICE_ID_PRO_ANNUAL || 'price_pro_annual',
  enterprise_monthly: process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
  enterprise_annual: process.env.STRIPE_PRICE_ID_ENTERPRISE_ANNUAL || 'price_enterprise_annual',
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier, billingPeriod } = body;

    // Validate tier
    const validTiers = ['starter', 'pro', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be one of: starter, pro, enterprise' },
        { status: 400 }
      );
    }

    // Validate billing period
    const validPeriods = ['monthly', 'annual'];
    if (!validPeriods.includes(billingPeriod)) {
      return NextResponse.json(
        { error: 'Invalid billing period. Must be: monthly or annual' },
        { status: 400 }
      );
    }

    // Get the appropriate price ID
    const priceKey = `${tier}_${billingPeriod}` as keyof typeof STRIPE_PRICES;
    const priceId = STRIPE_PRICES[priceKey];

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price configuration not found' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/results?cancelled=true`,
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
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
