'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Home,
  Loader2,
  ArrowRight,
  Clock,
  Calendar,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
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

// Delegation tiers
const DELEGATION_TIERS = [
  { value: 'unique', label: 'Unique (Founder Only)', color: 'bg-purple-500' },
  { value: 'founder', label: 'Founder', color: 'bg-blue-500' },
  { value: 'senior', label: 'Senior Hire', color: 'bg-green-500' },
  { value: 'junior', label: 'Junior Hire', color: 'bg-yellow-500' },
  { value: 'ea', label: 'Executive Assistant', color: 'bg-orange-500' },
] as const;

type DelegationTier = typeof DELEGATION_TIERS[number]['value'];

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
  duration: number; // in minutes
  delegationTier: DelegationTier;
  verticalType: VerticalType;
  eventCategory: EventCategory;
  aiReasoning?: string;
  isOverridden: boolean;
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

export default function TriagePage() {
  const router = useRouter();
  const params = useParams();
  const auditId = params.auditId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filter, setFilter] = useState<{
    tier: DelegationTier | 'all';
    category: EventCategory | 'all';
  }>({ tier: 'all', category: 'all' });

  // Load audit data
  useEffect(() => {
    const loadAudit = async () => {
      try {
        const response = await fetch(`/api/audit/${auditId}`);
        if (!response.ok) {
          throw new Error('Failed to load audit');
        }
        const data = await response.json();
        setAudit(data);
        // Initialize events with default category if not set
        const eventsWithCategory = (data.events || []).map((event: AuditEvent) => ({
          ...event,
          eventCategory: event.eventCategory || 'work',
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
        body: JSON.stringify({ delegationTier: newTier }),
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
        body: JSON.stringify({ verticalType: newVertical }),
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

  // Filter events
  const filteredEvents = events.filter(event => {
    if (filter.tier !== 'all' && event.delegationTier !== filter.tier) return false;
    if (filter.category !== 'all' && event.eventCategory !== filter.category) return false;
    return true;
  });

  // Calculate statistics (only count 'work' events)
  const workEvents = events.filter(e => e.eventCategory === 'work');
  const stats = {
    totalEvents: events.length,
    workEvents: workEvents.length,
    totalMinutes: workEvents.reduce((sum, e) => sum + e.duration, 0),
    delegatableMinutes: workEvents
      .filter(e => e.delegationTier !== 'unique' && e.delegationTier !== 'founder')
      .reduce((sum, e) => sum + e.duration, 0),
    byTier: DELEGATION_TIERS.reduce((acc, tier) => {
      acc[tier.value] = workEvents.filter(e => e.delegationTier === tier.value).length;
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
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get tier badge color
  const getTierColor = (tier: DelegationTier) => {
    const tierInfo = DELEGATION_TIERS.find(t => t.value === tier);
    return tierInfo?.color || 'bg-gray-500';
  };

  // Get category badge variant
  const getCategoryVariant = (category: EventCategory): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (category) {
      case 'work': return 'default';
      case 'leisure': return 'secondary';
      case 'exercise': return 'outline';
      case 'travel': return 'outline';
      default: return 'secondary';
    }
  };

  // Continue to results
  const continueToResults = async () => {
    setSaving(true);
    try {
      // Mark audit as triaged
      await fetch(`/api/audit/${auditId}/complete-triage`, {
        method: 'POST',
      });
      router.push(`/results/${auditId}`);
    } catch (err) {
      toast.error('Failed to save progress');
      console.error(err);
    } finally {
      setSaving(false);
    }
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
                <span className="font-medium">{stats.byTier[tier.value] || 0}</span>
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
            <span>Events ({filteredEvents.length})</span>
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
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No events match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map(event => (
                    <TableRow key={event.id} className={event.eventCategory !== 'work' ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium truncate max-w-[200px]" title={event.title}>
                            {event.title}
                          </div>
                          {event.isOverridden && (
                            <Badge variant="outline" className="text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Modified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(event.startTime)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatDuration(event.duration)}</span>
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
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getTierColor(event.delegationTier)}`} />
                              <SelectValue />
                            </div>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteEvent(event.id)}
                          title="Delete event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Save and Exit
        </Button>
        <Button size="lg" onClick={continueToResults} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              Continue to Results
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}