'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Clock } from 'lucide-react';

interface EventSuggestion {
  type: string;
  title: string;
  start: string;
  end: string;
  tier: string;
}

interface EventSuggestionCardProps {
  suggestion: EventSuggestion;
  isAdded: boolean;
  isDismissed?: boolean;
  onAdd: () => void;
  onDismiss: () => void;
}

// Tier badge colors
const TIER_BADGE_VARIANTS: Record<string, string> = {
  unique: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  founder: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  senior: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  junior: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ea: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export function EventSuggestionCard({
  suggestion,
  isAdded,
  isDismissed,
  onAdd,
  onDismiss,
}: EventSuggestionCardProps) {
  const startDate = new Date(suggestion.start);
  const endDate = new Date(suggestion.end);

  // Calculate duration
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationHours = Math.round(durationMs / (1000 * 60 * 60) * 10) / 10;

  // Format date/time
  const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
  const startTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const tierClass = TIER_BADGE_VARIANTS[suggestion.tier] || TIER_BADGE_VARIANTS.senior;

  // Don't render anything if dismissed
  if (isDismissed) {
    return null;
  }

  if (isAdded) {
    return (
      <Card className="mt-4 p-4 border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Check className="h-5 w-5" />
          <span className="font-medium">Added to Calendar</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{suggestion.title}</p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 p-4 border-2 border-primary/20 bg-background">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{suggestion.title}</h4>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{dayName}</span>
            <span>{startTime} - {endTime}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={tierClass}>
              <span className="capitalize">{suggestion.tier}</span>
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{durationHours}h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button size="sm" onClick={onAdd} className="flex-1">
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
