'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { AuditMetrics } from '@/lib/metrics';
import type { RoleRecommendation } from '@/lib/role-clustering';

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
  planningScore: number | null;
}

interface AuditData {
  id: string;
  dateStart: string;
  dateEnd: string;
  computedMetrics: AuditMetrics | null;
  planningScore: number | null;
  planningAssessment: string | null;
  status: string;
  eventCount: number;
}

const TIER_COLORS: Record<string, string> = {
  unique: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  founder: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  senior: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  junior: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ea: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const TIERS = ['unique', 'founder', 'senior', 'junior', 'ea'];

export default function ResultsPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<AuditData | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [roles, setRoles] = useState<RoleRecommendation[]>([]);
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Load username from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('founderbleed_username');
    if (saved) setUsername(saved);
  }, []);

  // Save username to localStorage
  const handleUsernameChange = (newName: string) => {
    setUsername(newName);
    localStorage.setItem('founderbleed_username', newName);
  };

  // Fetch audit data
  const fetchAuditData = useCallback(async () => {
    try {
      const [auditRes, eventsRes, rolesRes] = await Promise.all([
        fetch(`/api/audit/${auditId}`),
        fetch(`/api/audit/${auditId}/events`),
        fetch(`/api/audit/${auditId}/recommendations`),
      ]);

      if (!auditRes.ok) throw new Error('Failed to fetch audit');
      
      const auditData = await auditRes.json();
      setAudit(auditData);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.recommendations || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Update event tier
  const handleTierChange = async (eventId: string, newTier: string) => {
    try {
      const res = await fetch(`/api/audit/${auditId}/events`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, finalTier: newTier }),
      });

      if (!res.ok) throw new Error('Failed to update tier');

      // Update local state
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, finalTier: newTier } : e))
      );

      // Recalculate metrics
      await fetch(`/api/audit/${auditId}/recalculate`, { method: 'POST' });
      
      // Refresh audit data
      const auditRes = await fetch(`/api/audit/${auditId}`);
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAudit(auditData);
      }
    } catch (err) {
      console.error('Error updating tier:', err);
    }
  };

  // Reconcile event
  const handleReconcile = async (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, reconciled: true } : e))
    );
  };

  // Copy JD to clipboard
  const copyJD = async (jdText: string) => {
    try {
      await navigator.clipboard.writeText(jdText);
      alert('Job description copied to clipboard!');
    } catch {
      console.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error || 'Audit not found'}</p>
        </div>
      </div>
    );
  }

  const metrics = audit.computedMetrics;
  const displayName = username || 'Founder';
  const hasArbitrage = metrics?.arbitrage !== null && metrics?.arbitrage !== undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-500">Audit for</span>
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="Your Name"
              className="font-semibold text-lg bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 focus:outline-none px-1"
            />
          </div>
          <p className="text-sm text-gray-500">
            {new Date(audit.dateStart).toLocaleDateString()} -{' '}
            {new Date(audit.dateEnd).toLocaleDateString()}
          </p>

          {/* Hero Metric */}
          <div className="mt-6 p-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl text-white">
            {hasArbitrage ? (
              <>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {displayName}, You&apos;re Losing ${Math.round(metrics!.arbitrage! * 52).toLocaleString()} Every Year...
                </h1>
                <p className="mt-2 text-white/80">
                  on work that could be delegated to others.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {displayName}, See Your Time Breakdown
                </h1>
                <p className="mt-2 text-white/80">
                  Set your compensation in settings to view cost savings.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Annual Arbitrage</p>
            <p className="text-2xl font-bold text-green-600">
              {hasArbitrage
                ? `$${Math.round(metrics!.arbitrage! * 52).toLocaleString()}`
                : 'Set compensation'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Reclaimable Hours</p>
            <p className="text-2xl font-bold text-blue-600">
              {metrics?.reclaimableHoursWeekly || 0} hrs/week
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Efficiency Score</p>
            <p className="text-2xl font-bold text-purple-600">
              {metrics?.efficiencyScore || 0}%
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Planning Score</p>
            <p className="text-2xl font-bold text-orange-600">
              {audit.planningScore || 0}%
            </p>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">Time by Tier</h2>
          <div className="space-y-3">
            {TIERS.map((tier) => {
              const hours = metrics?.hoursByTier?.[tier as keyof typeof metrics.hoursByTier] || 0;
              const total = metrics?.totalHours || 1;
              const percentage = Math.round((hours / total) * 100) || 0;
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${TIER_COLORS[tier]}`}>
                    {tier}
                  </span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${tier === 'unique' ? 'bg-purple-500' : tier === 'founder' ? 'bg-blue-500' : tier === 'senior' ? 'bg-green-500' : tier === 'junior' ? 'bg-yellow-500' : 'bg-gray-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-20 text-right">
                    {hours}h ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Events ({events.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {events.slice(0, 50).map((event) => (
                  <tr key={event.id} className={event.isLeave ? 'bg-gray-50 dark:bg-gray-800' : ''}>
                    <td className="px-4 py-3 text-sm">
                      {event.title}
                      {event.isLeave && (
                        <span className="ml-2 text-xs text-gray-500">(Leave)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(event.startAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {event.durationMinutes >= 60
                        ? `${Math.round(event.durationMinutes / 60 * 10) / 10}h`
                        : `${event.durationMinutes}m`}
                    </td>
                    <td className="px-4 py-3">
                      {!event.isLeave ? (
                        <select
                          value={event.finalTier || 'senior'}
                          onChange={(e) => handleTierChange(event.id, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded border-0 ${TIER_COLORS[event.finalTier || 'senior']}`}
                        >
                          {TIERS.map((tier) => (
                            <option key={tier} value={tier}>
                              {tier.charAt(0).toUpperCase() + tier.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!event.isLeave && (
                        <button
                          onClick={() => handleReconcile(event.id)}
                          className={`text-sm ${event.reconciled ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
                          title="Mark as reconciled"
                        >
                          {event.reconciled ? '✓' : '○'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {events.length > 50 && (
            <div className="p-4 text-center text-sm text-gray-500">
              Showing 50 of {events.length} events
            </div>
          )}
        </div>

        {/* Role Recommendations */}
        {roles.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Recommended Hires</h2>
              <p className="text-sm text-gray-500">
                Based on your calendar analysis, consider hiring for these roles.
              </p>
            </div>
            <div className="p-4 space-y-4">
              {roles.map((role, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setExpandedRole(expandedRole === role.roleTitle ? null : role.roleTitle)}
                  >
                    <div className="flex items-center gap-3">
                      {roles.length > 1 && (
                        <span className="text-gray-400 cursor-grab">⋮⋮</span>
                      )}
                      <div>
                        <h3 className="font-medium">{role.roleTitle}</h3>
                        <p className="text-sm text-gray-500">
                          {role.hoursPerWeek}hrs/week • ${role.costMonthly.toLocaleString()}/month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${TIER_COLORS[role.roleTier]}`}>
                        {role.roleTier}
                      </span>
                      <span className="text-gray-400">
                        {expandedRole === role.roleTitle ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {expandedRole === role.roleTitle && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => copyJD(role.jdText)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Copy JD
                        </button>
                      </div>
                      <div className="prose dark:prose-invert prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-4 rounded">
                          {role.jdText}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Planning Assessment */}
        {audit.planningAssessment && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Planning Assessment</h2>
            <div className="prose dark:prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm">
                {audit.planningAssessment}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
