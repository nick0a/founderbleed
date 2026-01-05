// Settings Page - Comprehensive user settings management
// Includes account, team composition, compensation, subscription, BYOK, calendar, notifications, data

'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogoWithText } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import {
  User,
  Users,
  DollarSign,
  CreditCard,
  Key,
  Calendar,
  Bell,
  Database,
  Trash2,
  Download,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface UserSettings {
  name: string;
  username: string;
  email: string;
  salaryAnnual: string;
  salaryInputMode: 'annual' | 'hourly';
  currency: string;
  companyValuation: string;
  equityPercentage: string;
  vestingPeriodYears: string;
  seniorEngineeringRate: string;
  seniorBusinessRate: string;
  juniorEngineeringRate: string;
  juniorBusinessRate: string;
  eaRate: string;
  teamComposition: {
    founder: number;
    senior_engineering: number;
    senior_business: number;
    junior_engineering: number;
    junior_business: number;
    qa_engineer: number;
    ea: number;
  };
  notificationPreferences: {
    email_audit_ready: boolean;
    email_weekly_digest: boolean;
    in_app_audit_ready: boolean;
  };
}

interface Subscription {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  llmBudgetCents: number;
  llmSpentCents: number;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('account');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [prefsRes, subRes] = await Promise.all([
        fetch('/api/user/preferences'),
        fetch('/api/subscription/status'),
      ]);

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setSettings({
          name: data.name || '',
          username: data.username || '',
          email: data.email || '',
          salaryAnnual: data.salaryAnnual || '',
          salaryInputMode: data.salaryInputMode || 'annual',
          currency: data.currency || 'USD',
          companyValuation: data.companyValuation || '',
          equityPercentage: data.equityPercentage || '',
          vestingPeriodYears: data.vestingPeriodYears || '4',
          seniorEngineeringRate: data.seniorEngineeringRate || '100000',
          seniorBusinessRate: data.seniorBusinessRate || '100000',
          juniorEngineeringRate: data.juniorEngineeringRate || '50000',
          juniorBusinessRate: data.juniorBusinessRate || '50000',
          eaRate: data.eaRate || '30000',
          teamComposition: data.teamComposition || {
            founder: 1,
            senior_engineering: 0,
            senior_business: 0,
            junior_engineering: 0,
            junior_business: 0,
            qa_engineer: 0,
            ea: 0,
          },
          notificationPreferences: data.notificationPreferences || {
            email_audit_ready: true,
            email_weekly_digest: true,
            in_app_audit_ready: true,
          },
        });
      }

      if (subRes.ok) {
        setSubscription(await subRes.json());
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'json' | 'markdown') => {
    try {
      const res = await fetch(`/api/user/export?format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `founder-bleed-export.${format === 'json' ? 'json' : 'md'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;

    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      if (res.ok) {
        await signOut({ callbackUrl: '/' });
      } else {
        alert('Failed to delete account');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete account');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!settings) return null;

  const sections = [
    { id: 'account', title: 'Account', icon: User },
    { id: 'team', title: 'Team Composition', icon: Users },
    { id: 'compensation', title: 'Compensation & Rates', icon: DollarSign },
    { id: 'subscription', title: 'Subscription', icon: CreditCard },
    { id: 'byok', title: 'API Keys (BYOK)', icon: Key },
    { id: 'calendar', title: 'Calendar Connection', icon: Calendar },
    { id: 'notifications', title: 'Notifications', icon: Bell },
    { id: 'data', title: 'Data & Privacy', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/">
            <LogoWithText />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saveStatus === 'success' ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveStatus === 'success' ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <section.icon className="h-5 w-5 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {section.title}
                  </span>
                </div>
                {expandedSection === section.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {expandedSection === section.id && (
                <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                  {/* Account Section */}
                  {section.id === 'account' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={settings.email}
                          disabled
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={settings.name}
                          onChange={(e) =>
                            setSettings({ ...settings, name: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Username (for personalized reports)
                        </label>
                        <input
                          type="text"
                          value={settings.username}
                          onChange={(e) =>
                            setSettings({ ...settings, username: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Your display name"
                        />
                      </div>
                    </div>
                  )}

                  {/* Team Composition */}
                  {section.id === 'team' && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Engineering
                        </h4>
                        <div className="space-y-3">
                          {[
                            { key: 'senior_engineering', label: 'Senior Engineers' },
                            { key: 'junior_engineering', label: 'Junior Engineers' },
                            { key: 'qa_engineer', label: 'QA Engineers' },
                          ].map((role) => (
                            <div key={role.key} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {role.label}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={settings.teamComposition[role.key as keyof typeof settings.teamComposition] || 0}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    teamComposition: {
                                      ...settings.teamComposition,
                                      [role.key]: parseInt(e.target.value) || 0,
                                    },
                                  })
                                }
                                className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Business
                        </h4>
                        <div className="space-y-3">
                          {[
                            { key: 'founder', label: 'Founders' },
                            { key: 'senior_business', label: 'Senior Business' },
                            { key: 'junior_business', label: 'Junior Business' },
                            { key: 'ea', label: 'Executive Assistants' },
                          ].map((role) => (
                            <div key={role.key} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {role.label}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={settings.teamComposition[role.key as keyof typeof settings.teamComposition] || 0}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    teamComposition: {
                                      ...settings.teamComposition,
                                      [role.key]: parseInt(e.target.value) || 0,
                                    },
                                  })
                                }
                                className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compensation */}
                  {section.id === 'compensation' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Salary
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={settings.salaryAnnual}
                              onChange={(e) =>
                                setSettings({ ...settings, salaryAnnual: e.target.value })
                              }
                              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="150000"
                            />
                            <select
                              value={settings.salaryInputMode}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  salaryInputMode: e.target.value as 'annual' | 'hourly',
                                })
                              }
                              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="annual">Annual</option>
                              <option value="hourly">Hourly</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Currency
                          </label>
                          <select
                            value={settings.currency}
                            onChange={(e) =>
                              setSettings({ ...settings, currency: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="SGD">SGD ($)</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Tier Rates (Annual)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { key: 'seniorEngineeringRate', label: 'Senior Engineering' },
                            { key: 'seniorBusinessRate', label: 'Senior Business' },
                            { key: 'juniorEngineeringRate', label: 'Junior Engineering' },
                            { key: 'juniorBusinessRate', label: 'Junior Business' },
                            { key: 'eaRate', label: 'EA' },
                          ].map((rate) => (
                            <div key={rate.key}>
                              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                {rate.label}
                              </label>
                              <input
                                type="number"
                                value={settings[rate.key as keyof UserSettings] as string}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    [rate.key]: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subscription */}
                  {section.id === 'subscription' && subscription && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {subscription.tier} Plan
                          </p>
                          <p className="text-sm text-gray-500">
                            Status: {subscription.status}
                          </p>
                        </div>
                        <a href="/api/subscription/portal">
                          <Button variant="outline" size="sm">
                            Manage
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </a>
                      </div>

                      {subscription.tier !== 'free' && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500 mb-2">LLM Budget</p>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(100, (subscription.llmSpentCents / subscription.llmBudgetCents) * 100)}%`,
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              ${(subscription.llmSpentCents / 100).toFixed(2)} / $
                              {(subscription.llmBudgetCents / 100).toFixed(2)} used
                            </p>
                          </div>
                          {subscription.currentPeriodEnd && (
                            <p className="text-sm text-gray-500">
                              Next billing:{' '}
                              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* BYOK */}
                  {section.id === 'byok' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        Add your own API keys to use with the Planning Assistant.
                      </p>
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          BYOK configuration coming soon. Your subscription includes LLM
                          budget.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Calendar */}
                  {section.id === 'calendar' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Google Calendar
                          </p>
                          <p className="text-sm text-gray-500">
                            Connected as {session?.user?.email}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="text-red-600">
                          Disconnect
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Access: Read-only (calendar.readonly)
                      </p>
                    </div>
                  )}

                  {/* Notifications */}
                  {section.id === 'notifications' && (
                    <div className="space-y-4">
                      {[
                        { key: 'email_audit_ready', label: 'Email when audit ready' },
                        { key: 'email_weekly_digest', label: 'Weekly digest email' },
                        { key: 'in_app_audit_ready', label: 'In-app notification when audit ready' },
                      ].map((pref) => (
                        <div
                          key={pref.key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {pref.label}
                          </span>
                          <button
                            onClick={() =>
                              setSettings({
                                ...settings,
                                notificationPreferences: {
                                  ...settings.notificationPreferences,
                                  [pref.key]:
                                    !settings.notificationPreferences[
                                      pref.key as keyof typeof settings.notificationPreferences
                                    ],
                                },
                              })
                            }
                            className={`w-12 h-6 rounded-full transition-colors ${
                              settings.notificationPreferences[
                                pref.key as keyof typeof settings.notificationPreferences
                              ]
                                ? 'bg-purple-600'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                settings.notificationPreferences[
                                  pref.key as keyof typeof settings.notificationPreferences
                                ]
                                  ? 'translate-x-6'
                                  : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Data & Privacy */}
                  {section.id === 'data' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Export Your Data
                        </h4>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => handleExport('json')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export JSON
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleExport('markdown')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export Markdown
                          </Button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h4 className="font-medium text-red-600 mb-3">Danger Zone</h4>
                        <Button
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Account
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This action cannot be undone. All your data will be permanently
              deleted, including:
            </p>
            <ul className="text-sm text-gray-500 space-y-1 mb-4">
              <li>• All audit runs and events</li>
              <li>• Calendar connections</li>
              <li>• Subscription (will be cancelled)</li>
              <li>• Contacts and shared reports</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              placeholder="DELETE"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={deleteConfirmation !== 'DELETE'}
                onClick={handleDeleteAccount}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
