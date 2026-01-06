'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCheckoutSync } from '@/hooks/use-checkout-sync';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Settings,
  Home,
  Sparkles,
  DollarSign,
  Target,
  Bell,
  BarChart3,
  AlertTriangle,
  Users,
  RefreshCw,
  ChevronRight,
  Trophy,
  Eye,
  LogOut,
  User
} from 'lucide-react';

interface AuditMetrics {
  totalHours: number;
  efficiencyScore: number;
  reclaimableHoursPerWeek: number;
  hoursByTier: {
    unique: number;
    founder: number;
    senior: number;
    junior: number;
    ea: number;
  };
  founderCostTotal: number | null;
  delegatedCostTotal: number | null;
  arbitrage: number | null;
}

interface AuditRun {
  id: string;
  dateStart: string;
  dateEnd: string;
  status: string;
  planningScore: number | null;
  createdAt: string;
  computedMetrics: AuditMetrics | null;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  tier?: string;
}

interface Action {
  id: string;
  title: string;
  description: string;
  impact: string;
  link: string;
  priority: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface Subscription {
  id: string;
  tier: string | null;
  status: string | null;
}

interface TopScores {
  uniqueHours: number;
  efficiency: number;
  planning: number;
}

export default function DashboardClient() {
  const [audits, setAudits] = useState<AuditRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<string>('week');
  const [showTopScores, setShowTopScores] = useState(false);
  const [topScores, setTopScores] = useState<TopScores | null>(null);
  const [username, setUsername] = useState<string>('');

  // Handle checkout success - sync subscription from Stripe
  const { syncComplete } = useCheckoutSync();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [auditsRes, subRes, notifRes, userRes] = await Promise.all([
          fetch('/api/audits'),
          fetch('/api/subscription/status'),
          fetch('/api/notifications'),
          fetch('/api/user/settings')
        ]);

        if (auditsRes.ok) {
          const data = await auditsRes.json();
          setAudits(data.audits || []);

          // Calculate top scores from all audits
          if (data.audits?.length > 0) {
            const scores = calculateTopScores(data.audits);
            setTopScores(scores);
          }
        }

        if (subRes.ok) {
          const data = await subRes.json();
          setSubscription(data.subscription);
        }

        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }

        if (userRes.ok) {
          const data = await userRes.json();
          setUsername(data.user?.username || data.user?.name || '');
        }

        // Fetch this week's events
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const eventsRes = await fetch(
          `/api/calendar/events?calendarIds=primary&dateStart=${startOfWeek.toISOString()}&dateEnd=${endOfWeek.toISOString()}`
        );
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setWeekEvents(data.events || []);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [syncComplete]); // Re-fetch when subscription sync completes

  const calculateTopScores = (audits: AuditRun[]): TopScores => {
    let maxUnique = 0;
    let maxEfficiency = 0;
    let maxPlanning = 0;

    for (const audit of audits) {
      if (audit.computedMetrics?.hoursByTier?.unique) {
        maxUnique = Math.max(maxUnique, audit.computedMetrics.hoursByTier.unique);
      }
      if (audit.computedMetrics?.efficiencyScore) {
        maxEfficiency = Math.max(maxEfficiency, audit.computedMetrics.efficiencyScore);
      }
      if (audit.planningScore !== null) {
        maxPlanning = Math.max(maxPlanning, audit.planningScore);
      }
    }

    return {
      uniqueHours: maxUnique,
      efficiency: maxEfficiency,
      planning: maxPlanning
    };
  };

  const calculateTrend = (current: number, previous: number): { direction: 'up' | 'down' | 'neutral'; change: number } => {
    if (previous === 0) return { direction: 'neutral', change: 0 };
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      change: Math.abs(Math.round(change))
    };
  };

  const getComparisonAudit = (): AuditRun | null => {
    if (audits.length < 2) return null;
    return audits[1]; // Previous audit
  };

  const generateActions = (): Action[] => {
    const actions: Action[] = [];
    const latestAudit = audits[0];

    if (!latestAudit?.computedMetrics) return actions;

    const metrics = latestAudit.computedMetrics;
    const eaHoursPerWeek = (metrics.hoursByTier.ea / 4); // Assume monthly
    const delegableHours = metrics.hoursByTier.senior + metrics.hoursByTier.junior + metrics.hoursByTier.ea;
    const delegablePerWeek = delegableHours / 4;

    // EA hours > 5/week
    if (eaHoursPerWeek > 5) {
      actions.push({
        id: 'hire-ea',
        title: 'Hire an EA',
        description: 'You have significant EA-level tasks that could be delegated',
        impact: `Save ${eaHoursPerWeek.toFixed(1)} hrs/week`,
        link: '/results/' + latestAudit.id,
        priority: 1
      });
    }

    // Planning Score < 50
    if (latestAudit.planningScore !== null && latestAudit.planningScore < 50) {
      actions.push({
        id: 'improve-planning',
        title: 'Improve calendar planning',
        description: 'Better calendar hygiene will improve your productivity',
        impact: `Score is ${latestAudit.planningScore}%`,
        link: '/planning',
        priority: 2
      });
    }

    // No audit in 30 days
    const lastAuditDate = new Date(latestAudit.createdAt);
    const daysSinceAudit = Math.floor((Date.now() - lastAuditDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceAudit > 30) {
      actions.push({
        id: 'fresh-audit',
        title: 'Run fresh audit',
        description: "It's been a while since your last analysis",
        impact: `Last was ${daysSinceAudit} days ago`,
        link: '/audit/new',
        priority: 3
      });
    }

    // Efficiency trending down
    const previousAudit = getComparisonAudit();
    if (previousAudit?.computedMetrics) {
      const trend = calculateTrend(
        metrics.efficiencyScore,
        previousAudit.computedMetrics.efficiencyScore
      );
      if (trend.direction === 'down' && trend.change > 5) {
        actions.push({
          id: 'review-allocation',
          title: 'Review time allocation',
          description: 'Your efficiency has declined since last audit',
          impact: `Down ${trend.change}% from last month`,
          link: '/results/' + latestAudit.id,
          priority: 4
        });
      }
    }

    // Delegable hours > 10/week
    if (delegablePerWeek > 10) {
      const recommendedRole = metrics.hoursByTier.senior > metrics.hoursByTier.junior ? 'Senior' : 'Junior';
      actions.push({
        id: 'hire-role',
        title: `Hire ${recommendedRole} help`,
        description: 'You have significant delegable work',
        impact: `Save ${delegablePerWeek.toFixed(1)} hours/week`,
        link: '/results/' + latestAudit.id,
        priority: 5
      });
    }

    // Sort by priority and take top 3
    return actions.sort((a, b) => a.priority - b.priority).slice(0, 3);
  };

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || isNaN(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatHoursMinutes = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const getTierColor = (tier?: string): string => {
    const colors: Record<string, string> = {
      unique: 'bg-purple-500',
      founder: 'bg-blue-500',
      senior: 'bg-green-500',
      junior: 'bg-yellow-500',
      ea: 'bg-orange-500'
    };
    return colors[tier || ''] || 'bg-gray-400';
  };

  // Get comparison data for the selected period
  const getComparisonData = () => {
    if (audits.length < 2) return null;

    const current = audits[0];
    const previous = audits[1];

    if (!current?.computedMetrics || !previous?.computedMetrics) return null;

    return {
      current: {
        efficiency: current.computedMetrics.efficiencyScore,
        planning: current.planningScore || 0,
        hoursByTier: current.computedMetrics.hoursByTier,
        arbitrage: current.computedMetrics.arbitrage
      },
      previous: {
        efficiency: previous.computedMetrics.efficiencyScore,
        planning: previous.planningScore || 0,
        hoursByTier: previous.computedMetrics.hoursByTier,
        arbitrage: previous.computedMetrics.arbitrage
      }
    };
  };

  const isSubscriber = subscription?.status === 'active';
  const latestAudit = audits[0];
  const actions = generateActions();
  const comparison = getComparisonData();

  // Calculate trend for efficiency
  const efficiencyTrend = comparison
    ? calculateTrend(comparison.current.efficiency, comparison.previous.efficiency)
    : null;

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between border-b pb-4 -mt-4 mb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Notifications Bell */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50">
                <div className="p-3 border-b font-medium flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary">{unreadCount} new</Badge>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 border-b hover:bg-muted/50 cursor-pointer ${
                          !notif.readAt ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                        }`}
                        onClick={() => {
                          markNotificationRead(notif.id);
                          if (notif.link) window.location.href = notif.link;
                        }}
                      >
                        <div className="font-medium text-sm">{notif.title}</div>
                        {notif.body && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {notif.body}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link href="/planning">
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Planning
            </Button>
          </Link>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                {username || 'Account'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {username ? `Welcome back, ${username}` : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your time efficiency and take action
          </p>
        </div>
        <Button onClick={() => setShowTopScores(true)} variant="outline">
          <Trophy className="h-4 w-4 mr-2" />
          Top Scores
        </Button>
      </div>

      {/* Subscribe Banner for Free Users */}
      {!isSubscriber && (
        <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Unlock Automated Audits & AI Planning</h3>
                <p className="text-white/80 mt-1">
                  Get automatic weekly audits, advanced comparisons, and AI-powered planning
                </p>
              </div>
              <Link href="/settings?tab=subscription">
                <Button variant="secondary">
                  Subscribe Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {audits.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No audits yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first calendar audit to get started
            </p>
            <Link href="/audit/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 1. Hero Stat Card - Efficiency Score with Trend */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2 flex items-center justify-center gap-2">
                  <Target className="h-4 w-4" />
                  Efficiency Score
                </p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-6xl font-bold">
                    {latestAudit?.computedMetrics?.efficiencyScore ?? 0}%
                  </span>
                  {efficiencyTrend && efficiencyTrend.direction !== 'neutral' && (
                    <div className={`flex items-center gap-1 ${
                      efficiencyTrend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {efficiencyTrend.direction === 'up' ? (
                        <TrendingUp className="h-6 w-6" />
                      ) : (
                        <TrendingDown className="h-6 w-6" />
                      )}
                      <span className="text-xl font-semibold">
                        {efficiencyTrend.change}%
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  % of time on high-value (Unique + Founder) work
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Secondary Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Planning Score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestAudit?.planningScore ?? 0}%
                </div>
                <p className="text-xs text-muted-foreground">Calendar hygiene</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Hours Reclaimed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestAudit?.computedMetrics?.reclaimableHoursPerWeek?.toFixed(1) ?? 0} hrs/month
                </div>
                <p className="text-xs text-muted-foreground">Potential delegation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  $ Saved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency((latestAudit?.computedMetrics?.arbitrage ?? 0) / 12)}/month
                </div>
                <p className="text-xs text-muted-foreground">By delegating effectively</p>
              </CardContent>
            </Card>
          </div>

          {/* 3. Top 3 Actions Panel */}
          {actions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Recommended Actions
                </CardTitle>
                <CardDescription>
                  Top priorities based on your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actions.map((action) => (
                    <Link key={action.id} href={action.link}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex-1">
                          <div className="font-medium">{action.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {action.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{action.impact}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. This Week Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    This Week Preview
                  </CardTitle>
                  <CardDescription>
                    Your calendar events color-coded by tier
                  </CardDescription>
                </div>
                <Link href="/planning">
                  <Button variant="outline" size="sm">
                    Open Planning
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                  const dayEvents = weekEvents.filter(e => {
                    const eventDate = new Date(e.start.dateTime || e.start.date || '');
                    return eventDate.getDay() === i;
                  });

                  return (
                    <div key={day} className="text-center">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        {day}
                      </div>
                      <div className="min-h-[60px] space-y-1">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={idx}
                            className={`h-2 rounded ${getTierColor(event.tier)}`}
                            title={event.summary}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded bg-purple-500" />
                  <span>Unique</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded bg-blue-500" />
                  <span>Founder</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded bg-green-500" />
                  <span>Senior</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded bg-yellow-500" />
                  <span>Junior</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-4 rounded bg-orange-500" />
                  <span>EA</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Quick Actions Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/audit/new">
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                    <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">Run New Audit</div>
                    <div className="text-sm text-muted-foreground">Analyze your calendar</div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/planning">
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium">Open Planning Assistant</div>
                    <div className="text-sm text-muted-foreground">AI-powered scheduling</div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href={latestAudit ? `/results/${latestAudit.id}` : '#'}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                    <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">View Recommendations</div>
                    <div className="text-sm text-muted-foreground">See hiring suggestions</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* 6. Recent Audits List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Audits</CardTitle>
              <CardDescription>
                Click to view details or compare audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {audits.slice(0, 5).map((audit) => (
                  <div
                    key={audit.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">
                          {new Date(audit.dateStart).toLocaleDateString()} - {new Date(audit.dateEnd).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(audit.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={audit.status === 'completed' ? 'default' : 'secondary'}>
                        {audit.status}
                      </Badge>
                      {audit.computedMetrics && (
                        <span className="text-sm font-medium">
                          {audit.computedMetrics.efficiencyScore}% efficiency
                        </span>
                      )}
                      <Link href={`/results/${audit.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 7. Comparison View */}
          {comparison && isSubscriber && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Period Comparison
                    </CardTitle>
                    <CardDescription>
                      Track your progress over time
                    </CardDescription>
                  </div>
                  <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">This week vs last</SelectItem>
                      <SelectItem value="month">This month vs last</SelectItem>
                      <SelectItem value="quarter">This quarter vs last</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Efficiency Delta */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Efficiency</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {comparison.previous.efficiency}% → {comparison.current.efficiency}%
                      </span>
                      <span className={`text-sm ${
                        comparison.current.efficiency > comparison.previous.efficiency
                          ? 'text-green-600'
                          : comparison.current.efficiency < comparison.previous.efficiency
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      }`}>
                        ({comparison.current.efficiency >= comparison.previous.efficiency ? '+' : ''}
                        {comparison.current.efficiency - comparison.previous.efficiency}%)
                      </span>
                    </div>
                  </div>

                  {/* Planning Delta */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Planning</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {comparison.previous.planning}% → {comparison.current.planning}%
                      </span>
                      <span className={`text-sm ${
                        comparison.current.planning > comparison.previous.planning
                          ? 'text-green-600'
                          : comparison.current.planning < comparison.previous.planning
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      }`}>
                        ({comparison.current.planning >= comparison.previous.planning ? '+' : ''}
                        {comparison.current.planning - comparison.previous.planning}%)
                      </span>
                    </div>
                  </div>

                  {/* Hours Change */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Unique Hours</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {comparison.previous.hoursByTier.unique.toFixed(1)} → {comparison.current.hoursByTier.unique.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Arbitrage Delta */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Arbitrage</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {formatCurrency(comparison.previous.arbitrage)} → {formatCurrency(comparison.current.arbitrage)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Top Scores Modal */}
      {showTopScores && topScores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTopScores(false)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                All-Time Top Scores
              </CardTitle>
              <CardDescription>
                Your best performance across all audits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <div className="text-sm text-muted-foreground">Time on Unique Tasks</div>
                <div className="text-2xl font-bold">{formatHoursMinutes(topScores.uniqueHours)}</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div className="text-sm text-muted-foreground">Efficiency Score</div>
                <div className="text-2xl font-bold">{topScores.efficiency}%</div>
              </div>
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="text-sm text-muted-foreground">Planning Score</div>
                <div className="text-2xl font-bold">{topScores.planning}%</div>
              </div>
              <Button className="w-full" onClick={() => setShowTopScores(false)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
