'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Check, Loader2, Shield } from 'lucide-react';

interface ScopeUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScopeUpgradeModal({ open, onOpenChange }: ScopeUpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleGrantAccess = async () => {
    setLoading(true);
    try {
      // First check if already has write access
      const response = await fetch('/api/calendar/upgrade-scope', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasWriteAccess) {
          // Already has write access, just close modal
          onOpenChange(false);
          return;
        }
      }

      // Use NextAuth signIn with upgraded scopes - this uses the already-registered callback
      await signIn('google', {
        callbackUrl: '/planning?write_access=granted',
      }, {
        // Pass additional authorization params for the write scope
        scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
        access_type: 'offline',
        prompt: 'consent',
      });
    } catch (error) {
      console.error('Scope upgrade error:', error);
      setLoading(false);
    }
    // Note: no setLoading(false) on success because we're redirecting
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>Add Events to Your Calendar</DialogTitle>
          </div>
          <DialogDescription>
            To add events directly to your calendar, we need permission to create events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            This allows the Planning Assistant to:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Create new events based on your plan</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Add focus blocks and protected time</span>
            </li>
          </ul>

          <div className="flex items-start gap-2 mt-4 p-3 bg-muted rounded-lg">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground">
              We will never modify or delete your existing events.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGrantAccess} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              'Grant Access'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
