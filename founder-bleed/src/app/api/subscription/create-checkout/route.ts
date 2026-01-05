import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Use default API version associated with key or library default
});

const STRIPE_MONTHLY_PRICES: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
  pro: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
  team: process.env.STRIPE_PRICE_ID_TEAM_MONTHLY,
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tier } = await request.json();

  const priceId = STRIPE_MONTHLY_PRICES[tier as string];

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email as string,
      mode: 'subscription',
      line_items: [{ price: priceId as string, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL!}/?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL!}/?cancelled=true`,
      metadata: { userId: session.user.id as string }
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return NextResponse.json({ error: 'Stripe error' }, { status: 500 });
  }
}
