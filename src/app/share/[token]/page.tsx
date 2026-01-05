'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SharedReport {
  audit: {
    id: string;
    dateStart: string;
    dateEnd: string;
    computedMetrics: {
      totalHours: number;
      hoursByTier: Record<string, number>;
      reclaimableHoursWeekly: number;
      efficiencyScore: number;
    } | null;
    planningScore: number | null;
  };
  events: Array<{
    id: string;
    title: string;
    startAt: string;
    durationMinutes: number;
    finalTier: string | null;
    businessArea: string | null;
    isLeave: boolean;
  }>;
  roles: Array<{
    roleTitle: string;
    roleTier: string;
    vertical: string | null;
    businessArea: string;
    hoursPerWeek: string;
    jdText: string | null;
  }>;
}

const TIER_COLORS: Record<string, string> = {
  unique: 'bg-purple-100 text-purple-800',
  founder: 'bg-blue-100 text-blue-800',
  senior: 'bg-green-100 text-green-800',
  junior: 'bg-yellow-100 text-yellow-800',
  ea: 'bg-gray-100 text-gray-800',
};

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check if we have a stored verification token
  useEffect(() => {
    const stored = localStorage.getItem(`share_verification_${token}`);
    if (stored) {
      setVerificationToken(stored);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Fetch report when we have verification token
  useEffect(() => {
    if (!verificationToken) return;

    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/share/${token}?verification=${verificationToken}`);
        
        if (res.status === 403) {
          // Invalid token, clear it
          localStorage.removeItem(`share_verification_${token}`);
          setVerificationToken(null);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch report');
        }

        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [token, verificationToken]);

  // Submit email for verification
  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to verify email');
      }

      const data = await res.json();
      
      // Store verification token
      localStorage.setItem(`share_verification_${token}`, data.verificationToken);
      setVerificationToken(data.verificationToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Email capture modal
  if (!verificationToken || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">View Shared Report</h1>
            <p className="text-gray-600">
              Enter your email to access this Founder Bleed time audit report.
            </p>
          </div>

          <form onSubmit={handleSubmitEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !email.includes('@')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Verifying...' : 'View Report'}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Your email will only be used to grant access to this report.
          </p>
        </div>
      </div>
    );
  }

  // Report view
  const metrics = report.audit.computedMetrics;
  const TIERS = ['unique', 'founder', 'senior', 'junior', 'ea'];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500">Shared Time Audit Report</span>
          </div>
          <h1 className="text-2xl font-bold">Time Audit Results</h1>
          <p className="text-sm text-gray-500">
            {new Date(report.audit.dateStart).toLocaleDateString()} -{' '}
            {new Date(report.audit.dateEnd).toLocaleDateString()}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Hours</p>
            <p className="text-2xl font-bold">
              {metrics?.totalHours || 0}h
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Reclaimable</p>
            <p className="text-2xl font-bold text-blue-600">
              {metrics?.reclaimableHoursWeekly || 0} hrs/wk
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Efficiency Score</p>
            <p className="text-2xl font-bold text-purple-600">
              {metrics?.efficiencyScore || 0}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Planning Score</p>
            <p className="text-2xl font-bold text-orange-600">
              {report.audit.planningScore || 0}%
            </p>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">Time by Tier</h2>
          <div className="space-y-3">
            {TIERS.map((tier) => {
              const hours = metrics?.hoursByTier?.[tier] || 0;
              const total = metrics?.totalHours || 1;
              const percentage = Math.round((hours / total) * 100) || 0;
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${TIER_COLORS[tier]}`}>
                    {tier}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${tier === 'unique' ? 'bg-purple-500' : tier === 'founder' ? 'bg-blue-500' : tier === 'senior' ? 'bg-green-500' : tier === 'junior' ? 'bg-yellow-500' : 'bg-gray-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-20 text-right">
                    {hours}h ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Role Recommendations */}
        {report.roles.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
            <h2 className="text-lg font-semibold mb-4">Recommended Hires</h2>
            <div className="space-y-4">
              {report.roles.map((role, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{role.roleTitle}</h3>
                      <p className="text-sm text-gray-500">
                        {role.hoursPerWeek}hrs/week • {role.businessArea}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${TIER_COLORS[role.roleTier]}`}>
                      {role.roleTier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA - CRITICAL: Link to landing page, NOT Stripe */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Get Your Own Time Audit</h2>
          <p className="mb-6 text-white/80">
            Discover where your time goes and how much you could save.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Start Your Free Audit
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Powered by Founder Bleed</p>
        </div>
      </div>
    </div>
  );
}
