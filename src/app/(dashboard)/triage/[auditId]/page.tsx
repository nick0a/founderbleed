'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface AuditEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  suggestedTier: string | null;
  finalTier: string | null;
  reconciled: boolean;
  businessArea: string | null;
  vertical: string | null;
  isLeave: boolean;
  leaveConfidence: string | null;
  leaveDetectionMethod: string | null;
}

interface TeamComposition {
  founder: number;
  [key: string]: number;
}

const TIER_COLORS: Record<string, string> = {
  unique: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  founder: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  senior: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  junior: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ea: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

// Full 5 tiers (for teams)
const ALL_TIERS = ['unique', 'founder', 'senior', 'junior', 'ea'];
// 4 tiers for solo founder (no Founder tier)
const SOLO_TIERS = ['unique', 'senior', 'junior', 'ea'];

export default function TriagePage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [leaveEvents, setLeaveEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User preferences
  const [isSoloFounder, setIsSoloFounder] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filtering and sorting
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterReconciled, setFilterReconciled] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string>('startAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Get available tiers based on team composition
  const availableTiers = isSoloFounder ? SOLO_TIERS : ALL_TIERS;

  // Calculate progress
  const totalWorkEvents = events.length;
  const reconciledCount = events.filter((e) => e.reconciled).length;
  const progressPercent = totalWorkEvents > 0 ? Math.round((reconciledCount / totalWorkEvents) * 100) : 0;

  // Check for first-time modal
  useEffect(() => {
    const dismissed = localStorage.getItem('founderbleed_tier_modal_dismissed');
    if (!dismissed) {
      setShowModal(true);
    }
  }, []);

  // Fetch team composition to determine solo founder
  useEffect(() => {
    const fetchTeamComposition = async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (res.ok) {
          const data = await res.json();
          const team = data.teamComposition as TeamComposition | null;
          if (team) {
            const totalTeam = Object.values(team).reduce((a, b) => a + b, 0);
            setIsSoloFounder(totalTeam === 1 && team.founder === 1);
          }
        }
      } catch {
        // Default to showing all tiers
      }
    };
    fetchTeamComposition();
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit/${auditId}/events`);
      if (!res.ok) throw new Error('Failed to fetch events');

      const data = await res.json();
      const allEvents: AuditEvent[] = data.events || [];

      // Separate leave events from work events
      const work = allEvents.filter((e) => !e.isLeave);
      const leave = allEvents.filter((e) => e.isLeave);

      setEvents(work);
      setLeaveEvents(leave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Update event tier
  const handleTierChange = async (eventId: string, newTier: string) => {
    try {
      await fetch(`/api/audit/${auditId}/events`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, finalTier: newTier }),
      });

      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, finalTier: newTier } : e))
      );
    } catch (err) {
      console.error('Error updating tier:', err);
    }
  };

  // Reconcile event (green checkmark)
  const handleReconcile = async (eventId: string) => {
    try {
      await fetch(`/api/audit/${auditId}/events`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, reconciled: true }),
      });

      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, reconciled: true } : e))
      );
    } catch (err) {
      console.error('Error reconciling:', err);
    }
  };

  // Override leave event (mark as not leave)
  const handleOverrideLeave = async (eventId: string) => {
    try {
      await fetch(`/api/audit/${auditId}/events`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, isLeave: false }),
      });

      // Move from leave to work events
      const event = leaveEvents.find((e) => e.id === eventId);
      if (event) {
        setLeaveEvents((prev) => prev.filter((e) => e.id !== eventId));
        setEvents((prev) => [...prev, { ...event, isLeave: false }]);
      }
    } catch (err) {
      console.error('Error overriding leave:', err);
    }
  };

  // Dismiss modal
  const dismissModal = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('founderbleed_tier_modal_dismissed', 'true');
    }
    setShowModal(false);
  };

  // Complete review and go to results
  const handleCompleteReview = async () => {
    // Recalculate metrics before navigating
    await fetch(`/api/audit/${auditId}/recalculate`, { method: 'POST' });
    router.push(`/results/${auditId}`);
  };

  // Sort events
  const sortedEvents = [...events].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortColumn) {
      case 'title':
        aVal = a.title || '';
        bVal = b.title || '';
        break;
      case 'startAt':
        aVal = new Date(a.startAt).getTime();
        bVal = new Date(b.startAt).getTime();
        break;
      case 'durationMinutes':
        aVal = a.durationMinutes;
        bVal = b.durationMinutes;
        break;
      case 'suggestedTier':
        aVal = a.suggestedTier || '';
        bVal = b.suggestedTier || '';
        break;
      case 'finalTier':
        aVal = a.finalTier || '';
        bVal = b.finalTier || '';
        break;
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  // Filter events
  const filteredEvents = sortedEvents.filter((e) => {
    if (filterTier !== 'all' && e.finalTier !== filterTier) return false;
    if (filterReconciled === 'reconciled' && !e.reconciled) return false;
    if (filterReconciled === 'pending' && e.reconciled) return false;
    return true;
  });

  // Sort click handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* First-time Tier Explanation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4">How We Categorize Your Time</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We classify each calendar event by asking:
                <br />
                <strong>&quot;Who should do this work?&quot;</strong>
              </p>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">If the answer is...</th>
                      <th className="px-4 py-2 text-left text-sm">We classify it as...</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-sm">&quot;Only I can do this&quot;</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${TIER_COLORS.unique}`}>
                          Unique
                        </span>
                      </td>
                    </tr>
                    {!isSoloFounder && (
                      <tr>
                        <td className="px-4 py-2 text-sm">&quot;A co-founder could do it&quot;</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${TIER_COLORS.founder}`}>
                            Founder
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-2 text-sm">&quot;A senior specialist&quot;</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${TIER_COLORS.senior}`}>
                          Senior
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">&quot;A junior team member&quot;</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${TIER_COLORS.junior}`}>
                          Junior
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">&quot;An assistant could do it&quot;</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${TIER_COLORS.ea}`}>
                          EA
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => dismissModal(false)}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Got it, let&apos;s review
                </button>
                <button
                  onClick={() => dismissModal(true)}
                  className="py-2 px-4 text-gray-500 hover:text-gray-700 text-sm"
                >
                  Don&apos;t show again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header with Progress */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Review Classifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Review and adjust the suggested classifications for your calendar events.
          </p>

          {/* Progress Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {reconciledCount} of {totalWorkEvents} events reviewed
              </span>
              <span className="text-sm text-gray-500">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filter by Tier</label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-transparent text-sm"
            >
              <option value="all">All Tiers</option>
              {availableTiers.map((tier) => (
                <option key={tier} value={tier}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filter by Status</label>
            <select
              value={filterReconciled}
              onChange={(e) => setFilterReconciled(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-transparent text-sm"
            >
              <option value="all">All</option>
              <option value="reconciled">Reconciled</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Work Events Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Work Events ({filteredEvents.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('title')}
                  >
                    Title {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('startAt')}
                  >
                    Date {sortColumn === 'startAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('durationMinutes')}
                  >
                    Duration {sortColumn === 'durationMinutes' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('suggestedTier')}
                  >
                    Suggested {sortColumn === 'suggestedTier' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Your Tier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reconcile
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    className={event.reconciled ? 'bg-green-50 dark:bg-green-900/20' : ''}
                  >
                    <td className="px-4 py-3 text-sm">{event.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(event.startAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {event.durationMinutes >= 60
                        ? `${Math.round((event.durationMinutes / 60) * 10) / 10}h`
                        : `${event.durationMinutes}m`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${TIER_COLORS[event.suggestedTier || 'senior']}`}
                      >
                        {event.suggestedTier || 'senior'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={event.finalTier || event.suggestedTier || 'senior'}
                        onChange={(e) => handleTierChange(event.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer ${TIER_COLORS[event.finalTier || event.suggestedTier || 'senior']}`}
                      >
                        {availableTiers.map((tier) => (
                          <option key={tier} value={tier}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleReconcile(event.id)}
                        disabled={event.reconciled}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                          event.reconciled
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-green-100 hover:text-green-600'
                        }`}
                        title={event.reconciled ? 'Reconciled' : 'Click to confirm'}
                      >
                        ✓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEvents.length === 0 && (
            <div className="p-8 text-center text-gray-500">No events match the current filters.</div>
          )}
        </div>

        {/* Leave Events Section */}
        {leaveEvents.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8 overflow-hidden opacity-75">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-500">Leave Events ({leaveEvents.length})</h2>
              <p className="text-sm text-gray-400">
                These events were detected as time off and excluded from analysis.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Detection
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Override
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {leaveEvents.map((event) => (
                    <tr key={event.id} className="text-gray-500">
                      <td className="px-4 py-3 text-sm">{event.title}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(event.startAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            event.leaveConfidence === 'high'
                              ? 'bg-green-100 text-green-700'
                              : event.leaveConfidence === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {event.leaveConfidence || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{event.leaveDetectionMethod || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOverrideLeave(event.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Not leave
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Complete Review Button */}
        <div className="sticky bottom-4">
          <button
            onClick={handleCompleteReview}
            className="w-full py-4 rounded-lg font-semibold text-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition"
          >
            Complete Review → View Results
          </button>
        </div>
      </div>
    </div>
  );
}
