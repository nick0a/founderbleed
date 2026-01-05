// Dashboard Page - Subscriber home with metrics and actions
// Subscriber-only (free users redirect to results)

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogoWithText } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Clock,
  BarChart3,
  Play,
  Sparkles,
  FileText,
  Bell,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowRight,
  Settings,
} from 'lucide-react';

interface DashboardData {
  subscription: {
    tier: string;
    status: string;
  } | null;
  latestAudit: {
    id: string;
    efficiencyScore: number;
    planningScore: number;
    completedAt: string;
  } | null;
  previousAudit: {
    efficiencyScore: number;
    planningScore: number;
  } | null;
  recentAudits: Array<{
    id: string;
    dateStart: string;
    dateEnd: string;
    efficiencyScore: number;
    status: string;
  }>;
  metrics: {
    hoursReclaimed: number;
    dollarsSaved: number;
    delegableHours: number;
    eaHours: number;
  };
  notifications: {
    unreadCount: number;
  };
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  impact: string;
  href: string;
  icon: React.ReactNode;
  priority: number;
}

const tierColors: Record<string, string> = {
  unique: 'bg-violet-500',
  founder: 'bg-purple-500',
  senior: 'bg-blue-500',
  junior: 'bg-green-500',
  ea: 'bg-teal-500',
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load subscription status
      const subRes = await fetch('/api/subscription/status');
      const subscription = subRes.ok ? await subRes.json() : null;

      // If free user, redirect to results or processing
      if (!subscription || subscription.tier === 'free') {
        // Try to get latest audit
        const auditsRes = await fetch('/api/audit/create', { method: 'GET' });
        if (auditsRes.ok) {
          const audits = await auditsRes.json();
          if (audits.audits && audits.audits.length > 0) {
            router.push(`/results/${audits.audits[0].id}`);
          } else {
            router.push('/processing');
          }
        } else {
          router.push('/processing');
        }
        return;
      }

      // Load audits
      const auditsRes = await fetch('/api/audit/create');
      const auditsData = auditsRes.ok ? await auditsRes.json() : { audits: [] };
      const audits = auditsData.audits || [];

      const latestAudit = audits[0] || null;
      const previousAudit = audits[1] || null;

      // Load notifications
      const notifRes = await fetch('/api/notifications');
      const notifData = notifRes.ok ? await notifRes.json() : { unreadCount: 0 };

      // Calculate metrics from latest audit
      const metrics = {
        hoursReclaimed: 0,
        dollarsSaved: 0,
        delegableHours: 0,
        eaHours: 0,
      };

      if (latestAudit?.computedMetrics) {
        const m = latestAudit.computedMetrics;
        metrics.delegableHours = Number(m.delegableHours || 0);
        metrics.eaHours = Number(m.eaHours || 0);
        metrics.hoursReclaimed = metrics.delegableHours * 4; // monthly
        metrics.dollarsSaved = Math.round(metrics.hoursReclaimed * 100); // approx hourly rate
      }

      setData({
        subscription,
        latestAudit: latestAudit
          ? {
              id: latestAudit.id,
              efficiencyScore: Math.round(
                Number(latestAudit.computedMetrics?.efficiencyScore || 0)
              ),
              planningScore: latestAudit.planningScore || 0,
              completedAt: latestAudit.completedAt,
            }
          : null,
        previousAudit: previousAudit
          ? {
              efficiencyScore: Math.round(
                Number(previousAudit.computedMetrics?.efficiencyScore || 0)
              ),
              planningScore: previousAudit.planningScore || 0,
            }
          : null,
        recentAudits: audits.slice(0, 5).map((a: Record<string, unknown>) => ({
          id: a.id,
          dateStart: a.dateStart,
          dateEnd: a.dateEnd,
          efficiencyScore: Math.round(
            Number((a.computedMetrics as Record<string, unknown>)?.efficiencyScore || 0)
          ),
          status: a.status,
        })),
        metrics,
        notifications: { unreadCount: notifData.unreadCount },
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActions = (): ActionItem[] => {
    if (!data || !data.latestAudit) return [];

    const actions: ActionItem[] = [];

    // EA hours recommendation
    if (data.metrics.eaHours > 5) {
      actions.push({
        id: 'hire-ea',
        title: 'Hire an Executive Assistant',
        description: `You're spending ${data.metrics.eaHours.toFixed(1)}h/week on EA-level tasks`,
        impact: `Save ${data.metrics.eaHours.toFixed(0)}+ hrs/week`,
        href: `/results/${data.latestAudit.id}#recommendations`,
        icon: <Clock className="h-5 w-5" />,
        priority: 1,
      });
    }

    // Planning score recommendation
    if (data.latestAudit.planningScore < 50) {
      actions.push({
        id: 'improve-planning',
        title: 'Improve Calendar Planning',
        description: 'Your planning score indicates room for better time allocation',
        impact: `Current score: ${data.latestAudit.planningScore}%`,
        href: '/planning',
        icon: <Calendar className="h-5 w-5" />,
        priority: 2,
      });
    }

    // Efficiency trending down
    if (
      data.previousAudit &&
      data.latestAudit.efficiencyScore < data.previousAudit.efficiencyScore
    ) {
      const diff =
        data.previousAudit.efficiencyScore - data.latestAudit.efficiencyScore;
      actions.push({
        id: 'review-allocation',
        title: 'Review Time Allocation',
        description: 'Your efficiency has decreased since the last audit',
        impact: `Down ${diff}% from last period`,
        href: `/results/${data.latestAudit.id}`,
        icon: <AlertCircle className="h-5 w-5" />,
        priority: 1,
      });
    }

    // Delegable hours high
    if (data.metrics.delegableHours > 10) {
      actions.push({
        id: 'delegate-more',
        title: 'Delegate More Tasks',
        description: `${data.metrics.delegableHours.toFixed(1)}h/week could be handled by others`,
        impact: `Save ${data.metrics.delegableHours.toFixed(0)}+ hrs/week`,
        href: `/results/${data.latestAudit.id}#recommendations`,
        icon: <BarChart3 className="h-5 w-5" />,
        priority: 2,
      });
    }

    // Sort by priority and return top 3
    return actions.sort((a, b) => a.priority - b.priority).slice(0, 3);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Failed to load dashboard</p>
          <Button onClick={loadDashboardData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const efficiencyChange = data.previousAudit
    ? data.latestAudit!.efficiencyScore - data.previousAudit.efficiencyScore
    : null;

  const actions = getActions();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/">
            <LogoWithText />
          </Link>
          <div className="flex items-center gap-4">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
              >
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                {data.notifications.unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {data.notifications.unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No new notifications
                  </div>
                </div>
              )}
            </div>

            <Link href="/settings">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </Link>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Stat */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Efficiency Score
              </p>
              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-bold text-gray-900 dark:text-white">
                  {data.latestAudit?.efficiencyScore || 0}%
                </span>
                {efficiencyChange !== null && (
                  <div
                    className={`flex items-center gap-1 ${
                      efficiencyChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {efficiencyChange >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    <span className="font-medium">
                      {efficiencyChange > 0 ? '+' : ''}
                      {efficiencyChange}%
                    </span>
                  </div>
                )}
              </div>
              {data.latestAudit && (
                <p className="text-sm text-gray-500 mt-2">
                  Last updated:{' '}
                  {new Date(data.latestAudit.completedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <Link href="/processing">
              <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
                <Play className="h-4 w-4 mr-2" />
                Run New Audit
              </Button>
            </Link>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Planning Score</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.latestAudit?.planningScore || 0}%
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Hours Reclaimed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.metrics.hoursReclaimed} hrs/mo
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Value Saved</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${data.metrics.dollarsSaved.toLocaleString()}/mo
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Delegable</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.metrics.delegableHours.toFixed(1)} hrs/wk
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Top Actions */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Recommended Actions
            </h2>
            {actions.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No specific actions recommended. Great job!
              </p>
            ) : (
              <div className="space-y-4">
                {actions.map((action) => (
                  <Link key={action.id} href={action.href}>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-500">{action.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {action.impact}
                        </span>
                        <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link href="/processing">
                <Button variant="outline" className="w-full justify-start">
                  <Play className="h-4 w-4 mr-2" />
                  Run New Audit
                </Button>
              </Link>
              <Link href="/planning">
                <Button variant="outline" className="w-full justify-start">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Planning Assistant
                </Button>
              </Link>
              {data.latestAudit && (
                <Link href={`/results/${data.latestAudit.id}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    View Latest Report
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Recent Audits */}
        {data.recentAudits.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Recent Audits
              </h2>
            </div>
            <div className="space-y-3">
              {data.recentAudits.map((audit) => (
                <Link key={audit.id} href={`/results/${audit.id}`}>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(audit.dateStart).toLocaleDateString()} -{' '}
                          {new Date(audit.dateEnd).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {audit.status === 'completed' ? 'Completed' : audit.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {audit.efficiencyScore}%
                        </p>
                        <p className="text-xs text-gray-500">Efficiency</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* This Week Preview */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              This Week Preview
            </h2>
            <Link href="/planning">
              <Button variant="ghost" size="sm">
                Open Planning
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
              const date = new Date();
              date.setDate(date.getDate() - date.getDay() + i);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={day}
                  className={`text-center p-3 rounded-lg ${
                    isToday
                      ? 'bg-purple-100 dark:bg-purple-900/30'
                      : 'bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">{day}</p>
                  <p
                    className={`font-semibold ${
                      isToday
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {date.getDate()}
                  </p>
                  {/* Placeholder for events */}
                  <div className="mt-2 space-y-1">
                    {i === 1 && (
                      <div className={`h-1 rounded ${tierColors.unique}`} />
                    )}
                    {i === 2 && (
                      <div className={`h-1 rounded ${tierColors.senior}`} />
                    )}
                    {i === 3 && (
                      <>
                        <div className={`h-1 rounded ${tierColors.founder}`} />
                        <div className={`h-1 rounded ${tierColors.ea}`} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Tier Legend */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {Object.entries(tierColors).map(([tier, color]) => (
              <div key={tier} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${color}`} />
                <span className="text-xs text-gray-500 capitalize">{tier}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
