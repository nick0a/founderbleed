'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Home,
  Calendar,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function NewAuditClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dateStart, setDateStart] = useState(() => {
    // Default to 30 days ago
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });

  const createAudit = async () => {
    if (!dateStart || !dateEnd) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (new Date(dateStart) > new Date(dateEnd)) {
      toast.error('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/audit/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateStart,
          dateEnd,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create audit');
      }

      const data = await response.json();
      toast.success('Audit created successfully!');
      router.push(`/triage/${data.auditId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create audit');
    } finally {
      setLoading(false);
    }
  };

  // Quick date range presets
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateStart(start.toISOString().split('T')[0]);
    setDateEnd(end.toISOString().split('T')[0]);
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between border-b pb-4 -mt-4 mb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">New Audit</span>
        </div>
      </nav>

      {/* Header */}
      <div className="text-center space-y-2">
        <Calendar className="h-12 w-12 mx-auto text-primary" />
        <h1 className="text-3xl font-bold">Create New Audit</h1>
        <p className="text-muted-foreground">
          Select a date range to analyze your calendar events
        </p>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date Range</CardTitle>
          <CardDescription>
            Choose the period you want to audit. We recommend at least 2 weeks for meaningful insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Select</label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreset(7)}>
                Last 7 days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset(14)}>
                Last 2 weeks
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset(30)}>
                Last 30 days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset(90)}>
                Last 3 months
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                max={dateEnd}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                min={dateStart}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Duration Display */}
          {dateStart && dateEnd && (
            <p className="text-sm text-muted-foreground text-center">
              Analyzing {Math.ceil((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / (1000 * 60 * 60 * 24)) + 1} days of calendar data
            </p>
          )}
        </CardContent>
      </Card>

      {/* What to Expect */}
      <Card>
        <CardHeader>
          <CardTitle>What to Expect</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">&bull;</span>
              We&apos;ll fetch your calendar events for the selected period
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">&bull;</span>
              Each event will be classified by who could handle it (you, senior hire, junior hire, or EA)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">&bull;</span>
              You&apos;ll see how much time and money you could reclaim through delegation
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">&bull;</span>
              Review and adjust classifications, then get hiring recommendations
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Create Button */}
      <div className="flex justify-center">
        <Button size="lg" onClick={createAudit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Audit...
            </>
          ) : (
            <>
              Create Audit
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
