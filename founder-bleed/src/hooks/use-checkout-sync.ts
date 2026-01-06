'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Hook to detect checkout=success query param and trigger subscription sync.
 * Use this on any page that the user might be redirected to after Stripe checkout.
 * Returns { isSyncing, syncComplete } to allow UI to respond accordingly.
 */
export function useCheckoutSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const checkout = searchParams.get('checkout');

    if (checkout === 'success' && !isSyncing && !syncComplete) {
      setIsSyncing(true);
      toast.success('Subscription activated! Syncing your account...');

      fetch('/api/subscription/sync', { method: 'POST' })
        .then(async (res) => {
          const data = await res.json();
          if (data.synced) {
            toast.success('Subscription synced successfully!');
          } else {
            // Even if not synced (e.g., already synced via webhook), still good
            toast.success('Account ready!');
          }
          setSyncComplete(true);

          // Remove the checkout param from URL to prevent re-syncing
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.delete('checkout');
          const newUrl = newSearchParams.toString()
            ? `${pathname}?${newSearchParams.toString()}`
            : pathname;
          router.replace(newUrl);
        })
        .catch((error) => {
          console.error('Sync failed:', error);
          toast.error('Failed to sync subscription. Please refresh the page.');
          setIsSyncing(false);
        });
    } else if (checkout === 'cancelled') {
      toast.info('Checkout was cancelled');
      // Remove the checkout param
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('checkout');
      const newUrl = newSearchParams.toString()
        ? `${pathname}?${newSearchParams.toString()}`
        : pathname;
      router.replace(newUrl);
    }
  }, [searchParams, pathname, router, isSyncing, syncComplete]);

  return { isSyncing, syncComplete };
}
