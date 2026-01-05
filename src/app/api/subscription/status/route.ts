import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActiveSubscription, SUBSCRIPTION_TIERS } from '@/lib/subscription';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getActiveSubscription(session.user.id);

    if (!subscription) {
      return NextResponse.json({
        tier: 'free',
        tierName: 'Free',
        status: 'none',
        features: SUBSCRIPTION_TIERS.free.features,
        llmBudgetCents: 0,
        llmSpentCents: 0,
        llmRemainingCents: 0,
        currentPeriodEnd: null,
      });
    }

    const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];
    const llmRemaining = Math.max(0, subscription.llmBudgetCents - subscription.llmSpentCents);

    return NextResponse.json({
      tier: subscription.tier,
      tierName: tierConfig.name,
      status: subscription.status,
      features: tierConfig.features,
      llmBudgetCents: subscription.llmBudgetCents,
      llmSpentCents: subscription.llmSpentCents,
      llmRemainingCents: llmRemaining,
      currentPeriodEnd: subscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
