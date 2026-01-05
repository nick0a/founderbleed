'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MultiEmailInput } from '@/components/multi-email-input';
import { SocialShareLinks } from '@/components/social-share-links';
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Calendar,
  GripVertical,
  Pencil,
  Undo2,
  Filter,
  Settings,
  Home,
  X,
  Plane,
  Briefcase,
  Dumbbell,
  Coffee
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  finalTier: string;
  businessArea: string;
  vertical: string;
  reconciled: boolean;
  eventCategory?: string | null; // work, leisure, exercise, travel
}

interface RoleRecommendation {
  id: string;
  roleTitle: string;
  roleTier: string;
  vertical: string | null;
  businessArea: string;
  hoursPerWeek: number;
  costWeekly: number;
  costMonthly: number;
  costAnnual: number;
  jdText: string;
  tasksList: { task: string; hoursPerWeek: number }[];
}

interface AuditData {
  audit: {
    id: string;
    dateStart: string;
    dateEnd: string;
    planningScore: number;
    computedMetrics: {
      totalHours: number;
      uniqueHours: number;
      founderHours: number;
      seniorHours: number;
      juniorHours: number;
      eaHours: number;
      delegableHours: number;
      efficiencyScore: number;
      arbitrageAnnual: number | null;
      reclaimableHoursPerWeek: number;
    } | null;
  };
  events: AuditEvent[];
  roleRecommendations: RoleRecommendation[];
  user: {
    name: string | null;
    username: string | null;
    salaryAnnual: string | null;
  };
}

const TIER_COLORS: Record<string, string> = {
  unique: 'bg-purple-500',
  founder: 'bg-blue-500',
  senior: 'bg-green-500',
  junior: 'bg-yellow-500',
  ea: 'bg-orange-500',
};

const TIER_LABELS: Record<string, string> = {
  unique: 'Unique to You',
  founder: 'Founder Only',
  senior: 'Senior Delegate',
  junior: 'Junior Delegate',
  ea: 'EA/Admin',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  work: <Briefcase className="h-4 w-4" />,
  leisure: <Coffee className="h-4 w-4" />,
  exercise: <Dumbbell className="h-4 w-4" />,
  travel: <Plane className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  work: 'Work',
  leisure: 'Leisure',
  exercise: 'Exercise',
  travel: 'Travel',
};

export default function ResultsPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'startAt',
    direction: 'desc',
  });
  const [showReconciled, setShowReconciled] = useState(false);
  const [showNonWork, setShowNonWork] = useState(true);
  const [recentlyReconciled, setRecentlyReconciled] = useState<Set<string>>(new Set());
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, string>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load username from localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem(`founderbleed_username_${auditId}`);
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, [auditId]);

  // Fetch audit data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/audit/${auditId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit data');
      }
      const result = await response.json();
      setData(result);
      
      // Set initial username
      if (!username) {
        const initialUsername = result.user?.username || result.user?.name || 'Founder';
        setUsername(initialUsername);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [auditId, username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save username to localStorage
  const saveUsername = () => {
    localStorage.setItem(`founderbleed_username_${auditId}`, username);
    setIsEditingUsername(false);
    toast.success('Username saved');
  };

  // Update event tier - optimistic update without full page reload
  const updateEventTier = async (eventId: string, newTier: string) => {
    // Optimistic update - update local state immediately
    if (data) {
      setData({
        ...data,
        events: data.events.map(e => 
          e.id === eventId ? { ...e, finalTier: newTier } : e
        )
      });
    }
    
    // Track pending update
    setPendingUpdates(prev => new Map(prev).set(eventId, newTier));

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalTier: newTier }),
      });

      if (!response.ok) throw new Error('Failed to update tier');

      // Debounce recalculation - wait 2 seconds after last change
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(async () => {
        await fetch(`/api/audit/${auditId}/recalculate`, { method: 'POST' });
        // Silently refresh metrics in background
        const refreshResponse = await fetch(`/api/audit/${auditId}`);
        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          setData(prev => prev ? { ...prev, audit: result.audit } : null);
        }
        setPendingUpdates(new Map());
      }, 2000);

      toast.success('Tier updated');
    } catch (err) {
      // Revert on error
      await fetchData();
      toast.error('Failed to update tier');
    }
  };

  // Reconcile event - optimistic update with animation
  const reconcileEvent = async (eventId: string) => {
    // Optimistic update - mark as recently reconciled for animation
    setRecentlyReconciled(prev => new Set(prev).add(eventId));
    
    // Update local state immediately
    if (data) {
      setData({
        ...data,
        events: data.events.map(e => 
          e.id === eventId ? { ...e, reconciled: true } : e
        )
      });
    }

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconciled: true }),
      });

      if (!response.ok) throw new Error('Failed to reconcile');

      // Remove from animation set after delay
      setTimeout(() => {
        setRecentlyReconciled(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      }, 1500);

      toast.success('Event reconciled', {
        action: {
          label: 'Undo',
          onClick: () => undoReconcile(eventId),
        },
      });
    } catch (err) {
      // Revert on error
      setRecentlyReconciled(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      await fetchData();
      toast.error('Failed to reconcile event');
    }
  };

  // Undo reconcile
  const undoReconcile = async (eventId: string) => {
    // Optimistic update
    if (data) {
      setData({
        ...data,
        events: data.events.map(e => 
          e.id === eventId ? { ...e, reconciled: false } : e
        )
      });
    }

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconciled: false }),
      });

      if (!response.ok) throw new Error('Failed to undo');
      toast.success('Reconcile undone');
    } catch (err) {
      await fetchData();
      toast.error('Failed to undo reconcile');
    }
  };

  // Update event category - optimistic update
  const updateEventCategory = async (eventId: string, newCategory: string) => {
    // Optimistic update - update local state immediately
    if (data) {
      setData({
        ...data,
        events: data.events.map(e => 
          e.id === eventId ? { ...e, eventCategory: newCategory } : e
        )
      });
    }

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCategory: newCategory }),
      });

      if (!response.ok) throw new Error('Failed to update category');

      // Debounce recalculation
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(async () => {
        await fetch(`/api/audit/${auditId}/recalculate`, { method: 'POST' });
        const refreshResponse = await fetch(`/api/audit/${auditId}`);
        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          setData(prev => prev ? { ...prev, audit: result.audit } : null);
        }
      }, 2000);

      toast.success(`Category changed to ${CATEGORY_LABELS[newCategory]}`);
    } catch (err) {
      await fetchData();
      toast.error('Failed to update category');
    }
  };

  // Exclude event from analysis
  const excludeEvent = async (eventId: string) => {
    // Optimistic update
    if (data) {
      setData({
        ...data,
        events: data.events.filter(e => e.id !== eventId)
      });
    }

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to exclude');
      toast.success('Event excluded from analysis');
    } catch (err) {
      await fetchData();
      toast.error('Failed to exclude event');
    }
  };

  // Send report via email
  const sendReport = async (emails: string[]) => {
    const response = await fetch('/api/share/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditId, emails }),
    });

    if (!response.ok) {
      throw new Error('Failed to send report');
    }
  };

  // Copy job description
  const copyJobDescription = (jdText: string) => {
    navigator.clipboard.writeText(jdText);
    toast.success('Job description copied to clipboard');
  };

  // Toggle role expansion
  const toggleRoleExpansion = (roleId: string) => {
    setExpandedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  // Sort and filter events
  const sortedEvents = data?.events
    ? [...data.events]
        .filter(e => showReconciled || !e.reconciled)
        .filter(e => showNonWork || e.eventCategory === 'work' || !e.eventCategory)
        .sort((a, b) => {
          const aVal = a[sortConfig.key as keyof AuditEvent] ?? '';
          const bVal = b[sortConfig.key as keyof AuditEvent] ?? '';
          if (sortConfig.direction === 'asc') {
            return aVal < bVal ? -1 : 1;
          }
          return aVal > bVal ? -1 : 1;
        })
    : [];

  const reconciledCount = data?.events?.filter(e => e.reconciled).length || 0;
  const nonWorkCount = data?.events?.filter(e => e.eventCategory && e.eventCategory !== 'work').length || 0;
  const totalEvents = data?.events?.length || 0;

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading results...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive">
          {error || 'Failed to load audit data'}
        </div>
      </div>
    );
  }

  const { audit, events, roleRecommendations } = data;
  const metrics = audit.computedMetrics;
  const hasSalary = data.user?.salaryAnnual && parseFloat(data.user.salaryAnnual) > 0;
  const heroMetric = hasSalary && metrics?.arbitrageAnnual && metrics.arbitrageAnnual > 0
    ? `$${Math.round(metrics.arbitrageAnnual).toLocaleString()}`
    : null;
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/results/${auditId}`
    : '';

  // Calculate tier breakdown for chart
  const tierBreakdown = metrics ? [
    { tier: 'unique', hours: metrics.uniqueHours, label: 'Unique to You' },
    { tier: 'founder', hours: metrics.founderHours, label: 'Founder Only' },
    { tier: 'senior', hours: metrics.seniorHours, label: 'Senior' },
    { tier: 'junior', hours: metrics.juniorHours, label: 'Junior' },
    { tier: 'ea', hours: metrics.eaHours, label: 'EA/Admin' },
  ].filter(t => t.hours > 0) : [];

  const totalChartHours = tierBreakdown.reduce((sum, t) => sum + t.hours, 0);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
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
          <span className="font-medium">Results</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {isEditingUsername ? (
            <div className="flex items-center gap-2">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-48"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveUsername()}
              />
              <Button size="sm" onClick={saveUsername}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingUsername(false)}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingUsername(true)}
              className="flex items-center gap-2 text-2xl font-bold hover:text-primary transition-colors"
            >
              Audit for {username}
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="text-muted-foreground">
          {new Date(audit.dateStart).toLocaleDateString()} - {new Date(audit.dateEnd).toLocaleDateString()}
        </p>

        {/* Hero Metric */}
        <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20 rounded-lg p-6">
          {heroMetric ? (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-destructive">
                {username}, You&apos;re Losing {heroMetric} Every Year...
              </h1>
              <p className="text-muted-foreground mt-2">
                on work that should be delegated to your team
              </p>
            </>
          ) : hasSalary ? (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {username}, You Have {metrics?.reclaimableHoursPerWeek?.toFixed(1) || '0'} Hours/Week to Reclaim
              </h1>
              <p className="text-muted-foreground mt-2">
                {metrics?.delegableHours?.toFixed(1) || '0'} hours of delegable work identified
              </p>
            </>
          ) : (
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-muted-foreground">
                Set compensation to view costs
              </h1>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Set Compensation
                </Button>
              </Link>
              <p className="text-muted-foreground mt-2">
                on work that should be delegated to your team
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Annual Arbitrage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {heroMetric || 'Set compensation'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Reclaimable Hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.reclaimableHoursPerWeek?.toFixed(1) || '0'} hrs/week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Efficiency Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.efficiencyScore?.toFixed(0) || '0'}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Planning Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audit.planningScore || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown Chart */}
      {tierBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>How You Spend Your Time</CardTitle>
            <CardDescription>
              Tasks you can uniquely do vs those you can delegate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Horizontal bar chart */}
              <div className="h-8 rounded-full overflow-hidden flex bg-muted">
                {tierBreakdown.map((tier) => (
                  <div
                    key={tier.tier}
                    className={`${TIER_COLORS[tier.tier]} transition-all`}
                    style={{ width: `${(tier.hours / totalChartHours) * 100}%` }}
                    title={`${tier.label}: ${tier.hours.toFixed(1)} hrs`}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4">
                {tierBreakdown.map((tier) => (
                  <div key={tier.tier} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${TIER_COLORS[tier.tier]}`} />
                    <span className="text-sm">
                      {tier.label}: {tier.hours.toFixed(1)} hrs ({((tier.hours / totalChartHours) * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event Breakdown</CardTitle>
              <CardDescription>
                Review and adjust classifications for each event
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showNonWork ? 'outline' : 'default'}
                size="sm"
                onClick={() => setShowNonWork(!showNonWork)}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                {showNonWork ? 'Show All' : 'Work Only'}
                {nonWorkCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {nonWorkCount} non-work
                  </Badge>
                )}
              </Button>
              <Button
                variant={showReconciled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowReconciled(!showReconciled)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showReconciled ? 'Showing All' : 'Hide Reconciled'}
                {reconciledCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {reconciledCount}/{totalEvents}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('title')}
                  >
                    Title
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('startAt')}
                  >
                    Date
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('durationMinutes')}
                  >
                    Duration
                  </TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEvents.slice(0, 50).map((event) => (
                  <TableRow 
                    key={event.id} 
                    className={`transition-all duration-500 ${
                      recentlyReconciled.has(event.id) 
                        ? 'bg-green-200 dark:bg-green-800 animate-pulse' 
                        : event.reconciled 
                          ? 'bg-green-50 dark:bg-green-950/20 opacity-60' 
                          : ''
                    }`}
                  >
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {event.title}
                    </TableCell>
                    <TableCell>
                      {new Date(event.startAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {Math.round(event.durationMinutes / 60 * 10) / 10} hrs
                    </TableCell>
                    <TableCell>
                      <Select
                        value={event.finalTier || 'founder'}
                        onValueChange={(value) => updateEventTier(event.id, value)}
                        disabled={event.reconciled || (!!event.eventCategory && event.eventCategory !== 'work')}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unique">Unique</SelectItem>
                          <SelectItem value="founder">Founder</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="ea">EA</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={event.eventCategory || 'work'}
                        onValueChange={(value) => updateEventCategory(event.id, value)}
                        disabled={event.reconciled}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="work">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" /> Work
                            </div>
                          </SelectItem>
                          <SelectItem value="leisure">
                            <div className="flex items-center gap-2">
                              <Coffee className="h-4 w-4" /> Leisure
                            </div>
                          </SelectItem>
                          <SelectItem value="exercise">
                            <div className="flex items-center gap-2">
                              <Dumbbell className="h-4 w-4" /> Exercise
                            </div>
                          </SelectItem>
                          <SelectItem value="travel">
                            <div className="flex items-center gap-2">
                              <Plane className="h-4 w-4" /> Travel
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {event.reconciled ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => undoReconcile(event.id)}
                            title="Undo reconcile"
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="hover:bg-green-100 hover:border-green-500"
                            onClick={() => reconcileEvent(event.id)}
                            title="Mark as reconciled"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => excludeEvent(event.id)}
                          title="Exclude from analysis"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {events.length > 50 && (
            <p className="text-sm text-muted-foreground mt-4">
              Showing 50 of {events.length} events
            </p>
          )}
        </CardContent>
      </Card>

      {/* Role Recommendations */}
      {roleRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Hires</CardTitle>
            <CardDescription>
              Based on your calendar analysis, here are the roles you should consider hiring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleRecommendations.map((role, index) => (
              <Collapsible
                key={role.id}
                open={expandedRoles.has(role.id)}
                onOpenChange={() => toggleRoleExpansion(role.id)}
              >
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {roleRecommendations.length > 1 && (
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-grab" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{role.roleTitle}</h4>
                          <Badge variant="secondary">{role.roleTier}</Badge>
                          {role.vertical && (
                            <Badge variant="outline">{role.vertical}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {role.hoursPerWeek} hrs/week • ${role.costMonthly.toLocaleString()}/month • ${role.costAnnual.toLocaleString()}/year
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyJobDescription(role.jdText || '')}
                      >
                        <Copy className="h-4 w-4" />
                        Copy JD
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button size="sm" variant="ghost">
                          {expandedRoles.has(role.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent className="mt-4">
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      <div>
                        <h5 className="font-medium mb-2">Tasks You&apos;ll Delegate</h5>
                        <ul className="space-y-1">
                          {role.tasksList?.map((task, i) => (
                            <li key={i} className="text-sm flex justify-between">
                              <span>{task.task}</span>
                              <span className="text-muted-foreground">{task.hoursPerWeek} hrs/week</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {role.jdText && (
                        <div>
                          <h5 className="font-medium mb-2">Full Job Description</h5>
                          <pre className="text-sm whitespace-pre-wrap font-sans">
                            {role.jdText}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Share Results */}
      <Card>
        <CardHeader>
          <CardTitle>Share Your Results</CardTitle>
          <CardDescription>
            Send this report to colleagues or share on social media
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Send to colleagues:</label>
            <MultiEmailInput onSend={sendReport} />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Or share via:</label>
            <SocialShareLinks 
              shareUrl={shareUrl} 
              heroMetric={heroMetric || 'significant savings'} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Subscribe CTA (placeholder for future monetization) */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Want more insights?</h3>
          <p className="text-muted-foreground mb-4">
            Upgrade to Pro for weekly automated audits, team analytics, and more.
          </p>
          <Button>Upgrade to Pro</Button>
        </CardContent>
      </Card>
    </div>
  );
}