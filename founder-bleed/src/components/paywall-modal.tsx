'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: 'subscription_required' | 'upgrade_required' | 'free_audit_used';
  feature?: string;
}

const TIERS = [
  {
    name: 'Starter',
    price: { monthly: 20, annual: 200 },
    features: [
      'Unlimited audits',
      'Planning Assistant',
      'Automated weekly audits',
      'Comparison views',
      '$3/mo LLM budget',
    ],
    tier: 'starter',
  },
  {
    name: 'Team',
    price: { monthly: 50, annual: 500 },
    features: [
      'Everything in Starter',
      'Priority email support (48hr)',
      'Team analytics',
      '$7.50/mo LLM budget',
    ],
    tier: 'team',
    popular: true,
  },
  {
    name: 'Pro',
    price: { monthly: 90, annual: 900 },
    features: [
      'Everything in Team',
      'Priority email support (8hr)',
      'Custom integrations',
    ],
    tier: 'pro',
  },
];

export function PaywallModal({ open, onOpenChange, reason, feature }: PaywallModalProps) {
  const [selectedTier, setSelectedTier] = useState<string>('team');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Check for checkout success/cancelled on mount
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success('Subscription activated! Syncing your account...');
      // Trigger a sync to ensure subscription is recorded
      fetch('/api/subscription/sync', { method: 'POST' })
        .then(() => {
          toast.success('Account synced successfully!');
          // Reload to refresh subscription state
          window.location.href = pathname;
        })
        .catch(() => {
          toast.error('Failed to sync subscription. Please refresh the page.');
        });
    } else if (checkout === 'cancelled') {
      toast.info('Checkout was cancelled');
    }
  }, [searchParams, pathname]);

  const getTitle = () => {
    switch (reason) {
      case 'free_audit_used':
        return 'Upgrade to Run More Audits';
      case 'subscription_required':
        return 'Subscribe to Access This Feature';
      case 'upgrade_required':
        return 'Upgrade Your Plan';
      default:
        return 'Upgrade to Unlock';
    }
  };

  const getDescription = () => {
    switch (reason) {
      case 'free_audit_used':
        return "You've used your free audit. Subscribe to run unlimited audits and unlock powerful features.";
      case 'subscription_required':
        return `${feature || 'This feature'} requires an active subscription. Choose a plan to get started.`;
      case 'upgrade_required':
        return `Upgrade your plan to access ${feature || 'this feature'}.`;
      default:
        return 'Unlock premium features with a subscription.';
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTier,
          billingPeriod,
          returnUrl: pathname, // Return to current page after checkout
        }),
      });

      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {/* Billing period toggle */}
        <div className="flex justify-center gap-2 mb-4">
          <Button
            variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBillingPeriod('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingPeriod === 'annual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBillingPeriod('annual')}
          >
            Annual (2 months free)
          </Button>
        </div>

        {/* Tier cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.tier}
              className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                selectedTier === tier.tier
                  ? 'border-primary ring-2 ring-primary'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedTier(tier.tier)}
            >
              {tier.popular && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <h3 className="font-semibold">{tier.name}</h3>
              <p className="text-2xl font-bold mt-2">
                ${billingPeriod === 'annual' ? tier.price.annual : tier.price.monthly}
                <span className="text-sm font-normal text-muted-foreground">
                  /{billingPeriod === 'annual' ? 'year' : 'month'}
                </span>
              </p>
              <ul className="mt-4 space-y-2">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleSubscribe} disabled={isLoading}>
            {isLoading ? 'Loading...' : `Subscribe to ${TIERS.find((t) => t.tier === selectedTier)?.name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
