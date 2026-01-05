'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Home,
  Loader2,
  ArrowRight,
  Clock,
  Calendar,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Check,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';

// Event categories - only 'work' counts towards calculations
const EVENT_CATEGORIES = [
  { value: 'work', label: 'Work', description: 'Counts towards audit' },
  { value: 'leisure', label: 'Leisure', description: 'Personal time' },
  { value: 'exercise', label: 'Exercise', description: 'Health and fitness' },
  { value: 'travel', label: 'Travel', description: 'Commute or trips' },
] as const;

type EventCategory = typeof EVENT_CATEGORIES[number]['value'];

// Delegation tiers - full list
const ALL_DELEGATION_TIERS = [
  { value: 'unique', label: 'Unique', color: 'bg-purple-500' },
  { value: 'founder', label: 'Founder', color: 'bg-blue-500' },
  { value: 'senior', label: 'Senior Hire', color: 'bg-green-500' },
  { value: 'junior', label: 'Junior Hire', color: 'bg-yellow-500' },
  { value: 'ea', label: 'EA', color: 'bg-orange-500' },
] as const;

// Solo founder tiers - no "Founder" option
const SOLO_FOUNDER_TIERS = [
  { value: 'unique', label: 'Unique', color: 'bg-purple-500' },
  { value: 'senior', label: 'Senior Hire', color: 'bg-green-500' },
  { value: 'junior', label: 'Junior Hire', color: 'bg-yellow-500' },
  { value: 'ea', label: 'EA', color: 'bg-orange-500' },
] as const;

type DelegationTier = 'unique' | 'founder' | 'senior' | 'junior' | 'ea';

// Vertical types
const VERTICAL_TYPES = [
  { value: 'universal', label: 'Universal' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'business', label: 'Business' },
] as const;

type VerticalType = typeof VERTICAL_TYPES[number]['value'];

interface AuditEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  delegationTier: DelegationTier;
  verticalType: VerticalType;
  eventCategory: EventCategory;
  aiReasoning?: string;
  isOverridden: boolean;
  isReconciled: boolean;
  isLeave: boolean;
  finalTier?: string;
  vertical?: string;
}

interface AuditData {
  id: string;
  dateStart: string;
  dateEnd: string;
  status: string;
  events: AuditEvent[];
  totalEvents: number;
  processedEvents: number;
}

const TIER_MODAL_KEY = 'founder-bleed-tier-modal-dismissed';

export default function TriageClient() {
  const router = useRouter();
  const params = useParams();
  const auditId = params.auditId as string;

  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filter, setFilter] = useState<{
    tier: DelegationTier | 'all';
    category: EventCategory | 'all';
  }>({ tier: 'all', category: 'all' });
  
  // Solo founder state
  const [isSoloFounder, setIsSoloFounder] = useState(false);
  
  // Tier explanation modal state
  const [showTierModal, setShowTierModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  // Get the appropriate delegation tiers based on solo founder status
  const DELEGATION_TIERS = isSoloFounder ? SOLO_FOUNDER_TIERS : ALL_DELEGATION_TIERS;

  // Check if tier explanation modal should be shown
  useEffect(() => {
    const dismissed = localStorage.getItem(TIER_MODAL_KEY);
    if (!dismissed) {
      setShowTierModal(true);
    }
  }, []);

  // Handle modal dismissal
  const handleDismissModal = () => {
    if (dontShowAgain) {
      localStorage.setItem(TIER_MODAL_KEY, 'true');
    }
    setShowTierModal(false);
  };

  // Load user settings to check if solo founder
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          // Check if solo founder (only 1 founder and no other team members)
          const teamComp = data.teamComposition;
          if (teamComp) {
            const totalTeam =
              (teamComp.founder || 1) +
              (teamComp.senior_engineering || 0) +
              (teamComp.junior_engineering || 0) +
              (teamComp.qa_engineer || 0) +
              (teamComp.senior_business || 0) +
              (teamComp.junior_business || 0) +
              (teamComp.ea || 0);
            setIsSoloFounder(totalTeam === 1 && (teamComp.founder || 1) === 1);
          }
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      }
    };

    loadUserSettings();
  }, []);

  // Load audit data
  useEffect(() => {
    const loadAudit = async () => {
      try {
        const response = await fetch(`/api/audit/${auditId}`);
        if (!response.ok) {
          throw new Error('Failed to load audit');
        }
        const data = await response.json();
        setAudit(data.audit || data);
        // Map API field names to our interface and initialize defaults
        const eventsWithCategory = (data.events || []).map((event: any) => ({
          ...event,
          // Map API field names - database uses startAt/endAt, UI uses startTime/endTime
          startTime: event.startAt || event.startTime,
          endTime: event.endAt || event.endTime,
          delegationTier: event.finalTier || event.delegationTier || 'founder',
          verticalType: event.vertical || event.verticalType || 'universal',
          eventCategory: event.eventCategory || 'work',
          durationMinutes: event.durationMinutes || 0,
          isOverridden: event.isOverridden || false,
          isReconciled: event.reconciled || event.isReconciled || false,
          isLeave: event.isLeave || false,
        }));
        setEvents(eventsWithCategory);
      } catch (err) {
        toast.error('Failed to load audit data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (auditId) {
      loadAudit();
    }
  }, [auditId]);

  // Update event delegation tier
  const updateEventTier = async (eventId: string, newTier: DelegationTier) => {
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? { ...event, delegationTier: newTier, isOverridden: true }
          : event
      )
    );

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalTier: newTier }), // API uses finalTier
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }
    } catch (err) {
      toast.error('Failed to save change');
      console.error(err);
    }
  };

  // Update event vertical type
  const updateEventVertical = async (eventId: string, newVertical: VerticalType) => {
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? { ...event, verticalType: newVertical, isOverridden: true }
          : event
      )
    );

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vertical: newVertical }), // API uses vertical
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }
    } catch (err) {
      toast.error('Failed to save change');
      console.error(err);
    }
  };

  // Update event category
  const updateEventCategory = async (eventId: string, newCategory: EventCategory) => {
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId
          ? { ...event, eventCategory: newCategory }
          : event
      )
    );

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCategory: newCategory }),
      });

      if (!response.ok) {
        throw new Error('Failed to update event category');
      }
    } catch (err) {
      toast.error('Failed to save category change');
      console.error(err);
    }
  };

  // Reconcile event (confirm classification)
  const reconcileEvent = async (eventId: string) => {
    // Find the event element for animation
    const eventElement = document.getElementById(`event-row-${eventId}`);
    if (eventElement) {
      eventElement.classList.add('animate-flash-green');
    }

    // Wait for animation then update state
    setTimeout(async () => {
      setEvents(prev => {
        const updated = prev.map(event =>
          event.id === eventId
            ? { ...event, isReconciled: true }
            : event
        );
        
        // Check if all non-leave events are reconciled
        const nonLeaveEvents = updated.filter(e => !e.isLeave);
        const allReconciled = nonLeaveEvents.length > 0 && nonLeaveEvents.every(e => e.isReconciled);
        if (allReconciled) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
        
        return updated;
      });

      try {
        const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reconciled: true }), // API uses reconciled
        });

        if (!response.ok) {
          throw new Error('Failed to reconcile event');
        }
      } catch (err) {
        toast.error('Failed to save reconciliation');
        console.error(err);
      }
    }, 300);
  };

  // Toggle leave event override
  const toggleLeaveOverride = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const newIsLeave = !event.isLeave;
    setEvents(prev =>
      prev.map(e =>
        e.id === eventId
          ? { ...e, isLeave: newIsLeave }
          : e
      )
    );

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLeave: newIsLeave }),
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }
      toast.success(newIsLeave ? 'Marked as leave' : 'Unmarked as leave');
    } catch (err) {
      toast.error('Failed to save change');
      console.error(err);
    }
  };

  // Delete event
  const deleteEvent = async (eventId: string) => {
    const eventToDelete = events.find(e => e.id === eventId);
    if (!eventToDelete) return;

    // Optimistically remove from UI
    setEvents(prev => prev.filter(event => event.id !== eventId));

    try {
      const response = await fetch(`/api/audit/${auditId}/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert on failure
        setEvents(prev => [...prev, eventToDelete]);
        throw new Error('Failed to delete event');
      }

      toast.success('Event deleted');
    } catch (err) {
      toast.error('Failed to delete event');
      console.error(err);
    }
  };

  // Separate leave events from work events
  const leaveEvents = events.filter(event => event.isLeave);
  const workableEvents = events.filter(event => !event.isLeave);

  // Filter workable events (excluding already reconciled)
  const filteredEvents = workableEvents.filter(event => {
    if (event.isReconciled) return false; // Hide reconciled events
    if (filter.tier !== 'all' && event.delegationTier !== filter.tier) return false;
    if (filter.category !== 'all' && event.eventCategory !== filter.category) return false;
    return true;
  });

  // Progress tracking
  const totalToReview = workableEvents.length;
  const reviewedCount = workableEvents.filter(e => e.isReconciled).length;
  const progressPercent = totalToReview > 0 ? (reviewedCount / totalToReview) * 100 : 0;

  // Calculate statistics (only count 'work' events that are not leave)
  const workEvents = workableEvents.filter(e => e.eventCategory === 'work');
  const stats = {
    totalEvents: events.length,
    workEvents: workEvents.length,
    totalMinutes: workEvents.reduce((sum, e) => sum + (e.durationMinutes || 0), 0),
    delegatableMinutes: workEvents
      .filter(e => e.delegationTier !== 'unique' && e.delegationTier !== 'founder')
      .reduce((sum, e) => sum + (e.durationMinutes || 0), 0),
    byTier: ALL_DELEGATION_TIERS.reduce((acc, tier) => {
      acc[tier.value as DelegationTier] = workEvents.filter(e => e.delegationTier === tier.value).length;
      return acc;
    }, {} as Record<DelegationTier, number>),
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Format date/time
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get tier badge color
  const getTierColor = (tier: DelegationTier) => {
    const tierInfo = ALL_DELEGATION_TIERS.find(t => t.value === tier);
    return tierInfo?.color || 'bg-gray-500';
  };

  // Continue to results
  const continueToResults = () => {
    router.push(`/results/${auditId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading audit data...</p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-muted-foreground">Audit not found</p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* First-Time Tier Explanation Modal */}
      <Dialog open={showTierModal} onOpenChange={setShowTierModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>How We Categorize Your Time</DialogTitle>
            <DialogDescription>
              We classify each calendar event by asking: &quot;Who should do this work?&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>If the answer is...</TableHead>
                    <TableHead>We classify it as...</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>&quot;Only I can do this&quot;</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        Unique
                      </div>
                    </TableCell>
                  </TableRow>
                  {!isSoloFounder && (
                    <TableRow>
                      <TableCell>&quot;A co-founder could do it&quot;</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Founder
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell>&quot;A senior hire could do it&quot;</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Senior Hire
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>&quot;A junior hire could do it&quot;</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        Junior Hire
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>&quot;An assistant could do it&quot;</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        EA
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked: boolean | 'indeterminate') => setDontShowAgain(checked === true)}
              />
              <label
                htmlFor="dont-show-again"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Don&apos;t show this again
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDismissModal}>
              Got it, let&apos;s review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-bounce flex flex-col items-center gap-4 bg-background/95 p-8 rounded-xl shadow-2xl border">
            <PartyPopper className="h-16 w-16 text-yellow-500" />
            <h2 className="text-2xl font-bold text-green-600">All Events Reviewed!</h2>
            <p className="text-muted-foreground">Great job! You can now continue to results.</p>
          </div>
        </div>
      )}

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
          <span className="font-medium">Triage Events</span>
        </div>
      </nav>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Review Event Classifications</h1>
        <p className="text-muted-foreground">
          Review and adjust AI classifications. Only &quot;Work&quot; events count towards your audit calculations.
        </p>
      </div>

      {/* Progress Tracking */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {reviewedCount} of {totalToReview} events reviewed
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercent)}% complete
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {reviewedCount === totalToReview && totalToReview > 0 && (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                All events have been reviewed!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.workEvents}</div>
            <p className="text-sm text-muted-foreground">Work Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatDuration(stats.totalMinutes)}</div>
            <p className="text-sm text-muted-foreground">Work Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{formatDuration(stats.delegatableMinutes)}</div>
            <p className="text-sm text-muted-foreground">Delegatable</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work Events by Delegation Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {DELEGATION_TIERS.map(tier => (
              <div key={tier.value} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                <span className="text-sm">{tier.label}:</span>
                <span className="font-medium">{stats.byTier[tier.value as DelegationTier] || 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Delegation Tier</label>
              <Select
                value={filter.tier}
                onValueChange={(value) => setFilter(prev => ({ ...prev, tier: value as DelegationTier | 'all' }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {DELEGATION_TIERS.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Category</label>
              <Select
                value={filter.category}
                onValueChange={(value) => setFilter(prev => ({ ...prev, category: value as EventCategory | 'all' }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EVENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Events to Review ({filteredEvents.length})</span>
            <Badge variant="outline">
              {filteredEvents.filter(e => e.isOverridden).length} overridden
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Event</TableHead>
                  <TableHead className="min-w-[120px]">Date/Time</TableHead>
                  <TableHead className="min-w-[80px]">Duration</TableHead>
                  <TableHead className="min-w-[120px]">Category</TableHead>
                  <TableHead className="min-w-[150px]">Delegation Tier</TableHead>
                  <TableHead className="min-w-[120px]">Vertical</TableHead>
                  <TableHead className="min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {workableEvents.filter(e => !e.isReconciled).length === 0 
                        ? 'All events have been reviewed!' 
                        : 'No events match the current filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map(event => (
                    <TableRow
                      key={event.id}
                      id={`event-row-${event.id}`}
                      className={`transition-all duration-300 ${event.eventCategory !== 'work' ? 'opacity-50 bg-muted/50' : ''}`}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`font-medium truncate max-w-[200px] ${event.eventCategory !== 'work' ? 'line-through text-muted-foreground' : ''}`} title={event.title}>
                            {event.title}
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {event.isOverridden && (
                              <Badge variant="outline" className="text-xs">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Modified
                              </Badge>
                            )}
                            {event.eventCategory !== 'work' && (
                              <Badge variant="secondary" className="text-xs">
                                Not counted
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(event.startTime)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatDuration(event.durationMinutes || 0)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={event.eventCategory}
                          onValueChange={(value) => updateEventCategory(event.id, value as EventCategory)}
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EVENT_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={event.delegationTier}
                          onValueChange={(value) => updateEventTier(event.id, value as DelegationTier)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DELEGATION_TIERS.map(tier => (
                              <SelectItem key={tier.value} value={tier.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${tier.color}`} />
                                  {tier.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={event.verticalType}
                          onValueChange={(value) => updateEventVertical(event.id, value as VerticalType)}
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VERTICAL_TYPES.map(vert => (
                              <SelectItem key={vert.value} value={vert.value}>
                                {vert.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-green-600 border-green-300 hover:text-green-700 hover:bg-green-50 hover:border-green-400"
                            onClick={() => reconcileEvent(event.id)}
                            title="Confirm classification"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            OK
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteEvent(event.id)}
                            title="Delete event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Leave Events Section */}
      {leaveEvents.length > 0 && (
        <Card className="opacity-70">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-muted-foreground">
              <span>Leave / Non-Work Events ({leaveEvents.length})</span>
              <Badge variant="secondary">
                Not counted in audit
              </Badge>
            </CardTitle>
            <CardDescription>
              These events were detected as leave/vacation time and are excluded from your audit calculations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto bg-muted/30">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Event</TableHead>
                    <TableHead className="min-w-[120px]">Date/Time</TableHead>
                    <TableHead className="min-w-[80px]">Duration</TableHead>
                    <TableHead className="min-w-[100px]">Override</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveEvents.map(event => (
                    <TableRow key={event.id} className="text-muted-foreground">
                      <TableCell>
                        <div className="font-medium truncate max-w-[200px]" title={event.title}>
                          {event.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(event.startTime)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-sm">{formatDuration(event.durationMinutes || 0)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLeaveOverride(event.id)}
                          className="text-xs"
                        >
                          Include in Audit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Save and Exit
        </Button>
        <Button size="lg" onClick={continueToResults}>
          Continue to Results
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* CSS for flash animation */}
      <style jsx global>{`
        @keyframes flash-green {
          0% { background-color: transparent; }
          50% { background-color: rgb(34 197 94 / 0.2); }
          100% { background-color: transparent; opacity: 0; transform: translateX(20px); }
        }
        .animate-flash-green {
          animation: flash-green 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}