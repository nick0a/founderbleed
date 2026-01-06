'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCheckoutSync } from '@/hooks/use-checkout-sync';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  Save,
  DollarSign,
  Users,
  Loader2,
  Calendar,
  Clock,
  RefreshCw,
  LogOut,
  User,
  Bell,
  Key,
  Download,
  Trash2,
  UserPlus,
  Shield,
  CreditCard,
  Link as LinkIcon,
  ExternalLink,
  Mail,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Types
interface CalendarSettings {
  calendarViewDays: number;
  plannableDays: number[];
}

interface NotificationPreferences {
  email_audit_ready: boolean;
  email_weekly_digest: boolean;
  in_app_audit_ready: boolean;
}

interface ScheduledAudit {
  id: string;
  frequency: string | null;
  dayOfWeek: number | null;
  hour: number | null;
  timezone: string | null;
  enabled: boolean | null;
  nextRunAt: string | null;
}

interface UserSettings {
  name: string | null;
  username: string | null;
  email: string | null;
  salaryAnnual: string | null;
  salaryInputMode: string;
  currency: string;
  teamComposition: Record<string, number>;
  companyValuation: string | null;
  equityPercentage: string | null;
  vestingPeriodYears: string | null;
  founderUniversalRate: string;
  founderEngineeringRate: string;
  founderBusinessRate: string;
  seniorUniversalRate: string;
  seniorEngineeringRate: string;
  seniorBusinessRate: string;
  juniorUniversalRate: string;
  juniorEngineeringRate: string;
  juniorBusinessRate: string;
  eaRate: string;
  calendarSettings: CalendarSettings;
  notificationPreferences: NotificationPreferences;
}

interface Subscription {
  tier: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  llmBudgetCents: number | null;
  llmSpentCents: number | null;
}

interface ByokKey {
  id: string;
  provider: string | null;
  priority: string | null;
  keyPreview: string;
  createdAt: string | null;
}

interface Contact {
  id: string;
  userId: string | null;
  contactUserId: string | null;
  contactEmail: string | null;
  status: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  contactUser?: {
    id: string;
    name: string | null;
    email: string | null;
    username: string | null;
  } | null;
}

interface CalendarConnection {
  id: string;
  provider: string | null;
  hasWriteAccess: boolean | null;
  connectedAt: string | null;
  scopes: string[] | null;
}

interface SharedReport {
  id: string;
  shareToken: string;
  createdAt: string | null;
  expiresAt: string | null;
  auditRunId: string;
  revokedAt: string | null;
}

// Constants
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VIEW_OPTIONS = [
  { value: 1, label: '1 Day' },
  { value: 3, label: '3 Days' },
  { value: 5, label: '5 Days' },
  { value: 6, label: '6 Days' },
  { value: 7, label: '7 Days' },
];

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'byok', label: 'API Keys', icon: Key },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'schedule', label: 'Automation', icon: RefreshCw },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Data & Privacy', icon: Shield },
  { id: 'contacts', label: 'Contacts', icon: UserPlus },
];

// Team Composition - Engineering on LEFT, Business on RIGHT
const TEAM_ROLES = [
  // Engineering (LEFT)
  { key: 'senior_engineering', label: 'Senior Engineer', column: 'left' },
  { key: 'junior_engineering', label: 'Junior Engineer', column: 'left' },
  { key: 'qa_engineer', label: 'QA Engineer', column: 'left' },
  // Business (RIGHT)
  { key: 'senior_business', label: 'Senior Business', column: 'right' },
  { key: 'junior_business', label: 'Junior Business', column: 'right' },
  { key: 'ea', label: 'Executive Assistant', column: 'right' },
];

export default function SettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'account';

  // Handle checkout success - sync subscription from Stripe
  const { syncComplete } = useCheckoutSync();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [settings, setSettings] = useState<UserSettings>({
    name: null,
    username: null,
    email: null,
    salaryAnnual: '',
    salaryInputMode: 'annual',
    currency: 'USD',
    teamComposition: {},
    companyValuation: null,
    equityPercentage: null,
    vestingPeriodYears: '4',
    founderUniversalRate: '200000',
    founderEngineeringRate: '180000',
    founderBusinessRate: '160000',
    seniorUniversalRate: '120000',
    seniorEngineeringRate: '100000',
    seniorBusinessRate: '80000',
    juniorUniversalRate: '50000',
    juniorEngineeringRate: '40000',
    juniorBusinessRate: '50000',
    eaRate: '25000',
    calendarSettings: {
      calendarViewDays: 7,
      plannableDays: [1, 2, 3, 4, 5],
    },
    notificationPreferences: {
      email_audit_ready: true,
      email_weekly_digest: true,
      in_app_audit_ready: true,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduledAudit, setScheduledAudit] = useState<ScheduledAudit | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [byokKeys, setByokKeys] = useState<ByokKey[]>([]);
  const [calendarConnection, setCalendarConnection] = useState<CalendarConnection | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // BYOK state
  const [newKeyProvider, setNewKeyProvider] = useState('openai');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyPriority, setNewKeyPriority] = useState('budget_first');
  const [addingKey, setAddingKey] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState<{
    sentPending: Contact[];
    receivedPending: Contact[];
    accepted: Contact[];
  }>({ sentPending: [], receivedPending: [], accepted: [] });
  const [privacySettings, setPrivacySettings] = useState({
    shareScores: true,
    anonymousMode: false,
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Shared reports state
  const [sharedReports, setSharedReports] = useState<SharedReport[]>([]);

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Calendar disconnect modal
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isSubscriber = subscription?.status === 'active';

  // Fetch all settings data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          settingsRes,
          scheduleRes,
          subRes,
          byokRes,
          calendarRes,
          contactsRes,
          privacyRes,
          reportsRes
        ] = await Promise.all([
          fetch('/api/user/settings'),
          fetch('/api/scheduled-audits'),
          fetch('/api/subscription/status'),
          fetch('/api/byok'),
          fetch('/api/calendar/list'),
          fetch('/api/contacts'),
          fetch('/api/contacts/privacy'),
          fetch('/api/share/create?list=true').catch(() => null),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const userData = data.user || data;
          setSettings({
            name: userData.name || null,
            username: userData.username || null,
            email: userData.email || null,
            salaryAnnual: userData.salaryAnnual || '',
            salaryInputMode: userData.salaryInputMode || 'annual',
            currency: userData.currency || 'USD',
            teamComposition: userData.teamComposition || {},
            companyValuation: userData.companyValuation || null,
            equityPercentage: userData.equityPercentage || null,
            vestingPeriodYears: userData.vestingPeriodYears || '4',
            founderUniversalRate: userData.founderUniversalRate || '200000',
            founderEngineeringRate: userData.founderEngineeringRate || '180000',
            founderBusinessRate: userData.founderBusinessRate || '160000',
            seniorUniversalRate: userData.seniorUniversalRate || '120000',
            seniorEngineeringRate: userData.seniorEngineeringRate || '100000',
            seniorBusinessRate: userData.seniorBusinessRate || '80000',
            juniorUniversalRate: userData.juniorUniversalRate || '50000',
            juniorEngineeringRate: userData.juniorEngineeringRate || '40000',
            juniorBusinessRate: userData.juniorBusinessRate || '50000',
            eaRate: userData.eaRate || '25000',
            calendarSettings: {
              calendarViewDays: data.calendarSettings?.calendarViewDays || 7,
              plannableDays: data.calendarSettings?.plannableDays || [1, 2, 3, 4, 5],
            },
            notificationPreferences: data.notificationPreferences || {
              email_audit_ready: true,
              email_weekly_digest: true,
              in_app_audit_ready: true,
            },
          });
        }

        if (scheduleRes.ok) {
          const data = await scheduleRes.json();
          setScheduledAudit(data.scheduledAudit || null);
        }

        if (subRes.ok) {
          const data = await subRes.json();
          setSubscription(data.subscription || null);
        }

        if (byokRes.ok) {
          const data = await byokRes.json();
          setByokKeys(data.keys || []);
        }

        if (calendarRes.ok) {
          const data = await calendarRes.json();
          setCalendarConnection(data.connection || null);
        }

        if (contactsRes.ok) {
          const data = await contactsRes.json();
          setContacts({
            sentPending: data.sentPending || [],
            receivedPending: data.receivedPending || [],
            accepted: data.accepted || [],
          });
        }

        if (privacyRes.ok) {
          const data = await privacyRes.json();
          setPrivacySettings({
            shareScores: data.shareScores ?? true,
            anonymousMode: data.anonymousMode ?? false,
          });
        }

        if (reportsRes?.ok) {
          const data = await reportsRes.json();
          setSharedReports(data.reports || []);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [syncComplete]); // Re-fetch when subscription sync completes

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save');
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleTeamCompositionChange = (roleKey: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      teamComposition: {
        ...prev.teamComposition,
        [roleKey]: Math.max(0, value),
      },
    }));
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: value,
      },
    }));
  };

  const saveScheduledAudit = async (frequency: string, enabled: boolean) => {
    setSavingSchedule(true);
    try {
      const response = await fetch('/api/scheduled-audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency,
          enabled,
          dayOfWeek: 6,
          hour: 3,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'Subscription required for automated audits') {
          toast.error('Subscription required for automated audits');
          return;
        }
        throw new Error('Failed to save');
      }

      const data = await response.json();
      setScheduledAudit(data.scheduledAudit);
      toast.success('Automated audit schedule saved');
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleScheduleEnabled = async () => {
    if (!scheduledAudit) return;
    await saveScheduledAudit(
      scheduledAudit.frequency || 'weekly',
      !scheduledAudit.enabled
    );
  };

  const handleCalendarViewChange = (value: string) => {
    setSettings(prev => ({
      ...prev,
      calendarSettings: {
        ...prev.calendarSettings,
        calendarViewDays: parseInt(value),
      },
    }));
  };

  const handlePlannableDayToggle = (dayIndex: number) => {
    setSettings(prev => {
      const currentDays = prev.calendarSettings.plannableDays;
      const newDays = currentDays.includes(dayIndex)
        ? currentDays.filter(d => d !== dayIndex)
        : [...currentDays, dayIndex].sort((a, b) => a - b);

      return {
        ...prev,
        calendarSettings: {
          ...prev.calendarSettings,
          plannableDays: newDays,
        },
      };
    });
  };

  // BYOK handlers
  const addByokKey = async () => {
    if (!newKeyValue.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setAddingKey(true);
    try {
      const response = await fetch('/api/byok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newKeyProvider,
          apiKey: newKeyValue,
          priority: newKeyPriority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add key');
      }

      toast.success('API key added successfully');
      setNewKeyValue('');

      // Refresh keys
      const keysRes = await fetch('/api/byok');
      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setByokKeys(keysData.keys || []);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add key');
    } finally {
      setAddingKey(false);
    }
  };

  const deleteByokKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/byok?id=${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('API key removed');
      setByokKeys(prev => prev.filter(k => k.id !== keyId));
    } catch {
      toast.error('Failed to remove API key');
    }
  };

  const updateKeyPriority = async (keyId: string, priority: string) => {
    try {
      const response = await fetch('/api/byok', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: keyId, priority }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setByokKeys(prev =>
        prev.map(k => (k.id === keyId ? { ...k, priority } : k))
      );
      toast.success('Priority updated');
    } catch {
      toast.error('Failed to update priority');
    }
  };

  // Contacts handlers
  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email');
      return;
    }

    setSendingInvite(true);
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      toast.success('Invitation sent');
      setInviteEmail('');

      // Refresh contacts
      const contactsRes = await fetch('/api/contacts');
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleContactAction = async (contactId: string, action: 'accept' | 'decline') => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, action }),
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success(action === 'accept' ? 'Contact request accepted' : 'Contact request declined');

      // Refresh contacts
      const contactsRes = await fetch('/api/contacts');
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData);
      }
    } catch {
      toast.error('Failed to update contact request');
    }
  };

  const removeContact = async (contactId: string) => {
    try {
      const response = await fetch(`/api/contacts?id=${contactId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove');

      toast.success('Contact removed');

      // Refresh contacts
      const contactsRes = await fetch('/api/contacts');
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData);
      }
    } catch {
      toast.error('Failed to remove contact');
    }
  };

  const updatePrivacySettings = async (key: string, value: boolean) => {
    try {
      const newSettings = { ...privacySettings, [key]: value };
      setPrivacySettings(newSettings);

      const response = await fetch('/api/contacts/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success('Privacy settings updated');
    } catch {
      toast.error('Failed to update privacy settings');
      // Revert
      setPrivacySettings(prev => ({ ...prev, [key]: !value }));
    }
  };

  // Export handlers
  const exportData = async (format: 'json' | 'markdown') => {
    try {
      const response = await fetch(`/api/export?format=${format}`);

      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `founder-bleed-export-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    }
  };

  // Account deletion
  const deleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted');
      signOut({ callbackUrl: '/' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  // Calendar disconnect
  const disconnectCalendar = async () => {
    setDisconnecting(true);
    try {
      // We'll need to create this endpoint
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to disconnect');

      toast.success('Calendar disconnected');
      setCalendarConnection(null);
      setShowDisconnectModal(false);
    } catch {
      toast.error('Failed to disconnect calendar');
    } finally {
      setDisconnecting(false);
    }
  };

  // Open Stripe portal
  const openStripePortal = async () => {
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to open portal');

      const data = await response.json();
      window.location.href = data.url;
    } catch {
      toast.error('Failed to open subscription portal');
    }
  };

  // Revoke shared report
  const revokeSharedReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/share/${reportId}/revoke`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to revoke');

      toast.success('Share link revoked');
      setSharedReports(prev =>
        prev.map(r => (r.id === reportId ? { ...r, revokedAt: new Date().toISOString() } : r))
      );
    } catch {
      toast.error('Failed to revoke share link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Settings</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, preferences, and integrations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Account Section */}
        {activeTab === 'account' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email (read-only)</Label>
                  <Input value={settings.email || ''} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={settings.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Username (for personalized reports)</Label>
                  <Input
                    value={settings.username || ''}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder="Choose a username"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be used in personalized reports and the leaderboard
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Composition Section */}
        {activeTab === 'team' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Composition
              </CardTitle>
              <CardDescription>
                Define your current team structure for accurate delegation recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                {/* Engineering Column - LEFT */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400">
                    Engineering
                  </h4>
                  {TEAM_ROLES.filter(r => r.column === 'left').map(role => (
                    <div key={role.key} className="flex items-center justify-between">
                      <Label className="text-sm">{role.label}</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleTeamCompositionChange(
                              role.key,
                              (settings.teamComposition[role.key] || 0) - 1
                            )
                          }
                          disabled={(settings.teamComposition[role.key] || 0) <= 0}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">
                          {settings.teamComposition[role.key] || 0}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleTeamCompositionChange(
                              role.key,
                              (settings.teamComposition[role.key] || 0) + 1
                            )
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Business Column - RIGHT */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-green-600 dark:text-green-400">
                    Business
                  </h4>
                  {TEAM_ROLES.filter(r => r.column === 'right').map(role => (
                    <div key={role.key} className="flex items-center justify-between">
                      <Label className="text-sm">{role.label}</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleTeamCompositionChange(
                              role.key,
                              (settings.teamComposition[role.key] || 0) - 1
                            )
                          }
                          disabled={(settings.teamComposition[role.key] || 0) <= 0}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">
                          {settings.teamComposition[role.key] || 0}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleTeamCompositionChange(
                              role.key,
                              (settings.teamComposition[role.key] || 0) + 1
                            )
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Number of Founders</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleTeamCompositionChange(
                          'founder',
                          (settings.teamComposition['founder'] || 1) - 1
                        )
                      }
                      disabled={(settings.teamComposition['founder'] || 1) <= 1}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">
                      {settings.teamComposition['founder'] || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleTeamCompositionChange(
                          'founder',
                          (settings.teamComposition['founder'] || 1) + 1
                        )
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo founders (1) will see 4 delegation tiers. Teams with 2+ founders will see 5 tiers.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compensation Section */}
        {activeTab === 'compensation' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Your Compensation
                </CardTitle>
                <CardDescription>
                  Your salary is used to calculate the cost of time spent on delegatable work
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salary</Label>
                    <div className="flex gap-2">
                      <Select
                        value={settings.currency}
                        onValueChange={(v) => handleChange('currency', v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="AUD">AUD</SelectItem>
                          <SelectItem value="SGD">SGD</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="150000"
                        value={settings.salaryAnnual || ''}
                        onChange={(e) => handleChange('salaryAnnual', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Input Mode</Label>
                    <Select
                      value={settings.salaryInputMode}
                      onValueChange={(v) => handleChange('salaryInputMode', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Company Valuation</Label>
                    <Input
                      type="number"
                      placeholder="10000000"
                      value={settings.companyValuation || ''}
                      onChange={(e) => handleChange('companyValuation', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Equity Percentage</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={settings.equityPercentage || ''}
                      onChange={(e) => handleChange('equityPercentage', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vesting Period (years)</Label>
                    <Input
                      type="number"
                      placeholder="4"
                      value={settings.vestingPeriodYears || ''}
                      onChange={(e) => handleChange('vestingPeriodYears', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delegation Rates</CardTitle>
                <CardDescription>
                  Annual salary benchmarks for different roles. Used to estimate hiring costs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Senior Roles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Universal</Label>
                      <Input
                        type="number"
                        value={settings.seniorUniversalRate}
                        onChange={(e) => handleChange('seniorUniversalRate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Engineering</Label>
                      <Input
                        type="number"
                        value={settings.seniorEngineeringRate}
                        onChange={(e) => handleChange('seniorEngineeringRate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Business</Label>
                      <Input
                        type="number"
                        value={settings.seniorBusinessRate}
                        onChange={(e) => handleChange('seniorBusinessRate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Junior Roles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Universal</Label>
                      <Input
                        type="number"
                        value={settings.juniorUniversalRate}
                        onChange={(e) => handleChange('juniorUniversalRate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Engineering</Label>
                      <Input
                        type="number"
                        value={settings.juniorEngineeringRate}
                        onChange={(e) => handleChange('juniorEngineeringRate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Business</Label>
                      <Input
                        type="number"
                        value={settings.juniorBusinessRate}
                        onChange={(e) => handleChange('juniorBusinessRate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Support Roles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Executive Assistant</Label>
                      <Input
                        type="number"
                        value={settings.eaRate}
                        onChange={(e) => handleChange('eaRate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Subscription Section */}
        {activeTab === 'subscription' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-2xl font-bold">
                    {subscription?.tier ? subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1) : 'Free'}
                  </p>
                  {subscription?.status && (
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                      {subscription.status}
                    </Badge>
                  )}
                </div>
                {subscription?.currentPeriodEnd && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Next billing date</p>
                    <p className="font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {subscription?.llmBudgetCents && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>LLM Budget Usage</span>
                    <span>
                      {Math.round(((subscription.llmSpentCents || 0) / subscription.llmBudgetCents) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.min(
                          ((subscription.llmSpentCents || 0) / subscription.llmBudgetCents) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {isSubscriber ? (
                  <Button onClick={openStripePortal}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>
                ) : (
                  <Link href="/#pricing">
                    <Button>Upgrade to Pro</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* BYOK Section */}
        {activeTab === 'byok' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys (BYOK)
              </CardTitle>
              <CardDescription>
                Add your own API keys to use with the Planning Assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Keys */}
              {byokKeys.length > 0 && (
                <div className="space-y-3">
                  <Label>Your API Keys</Label>
                  {byokKeys.map(key => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {key.provider?.toUpperCase()}
                        </Badge>
                        <code className="text-sm text-muted-foreground">
                          {key.keyPreview}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={key.priority || 'budget_first'}
                          onValueChange={(v) => updateKeyPriority(key.id, v)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="byok_first">BYOK First</SelectItem>
                            <SelectItem value="budget_first">Budget First</SelectItem>
                            <SelectItem value="byok_premium_only">Premium Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteByokKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Key */}
              <div className="space-y-3 border-t pt-4">
                <Label>Add New API Key</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select value={newKeyProvider} onValueChange={setNewKeyProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google AI</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    className="md:col-span-2"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Select value={newKeyPriority} onValueChange={setNewKeyPriority}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="byok_first">BYOK First</SelectItem>
                      <SelectItem value="budget_first">Budget First</SelectItem>
                      <SelectItem value="byok_premium_only">Premium Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addByokKey} disabled={addingKey}>
                    {addingKey ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Key className="h-4 w-4 mr-2" />
                    )}
                    Add Key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Keys are encrypted and stored securely. They will be validated before saving.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Section */}
        {activeTab === 'calendar' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar Connection
              </CardTitle>
              <CardDescription>
                Manage your Google Calendar connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {calendarConnection ? (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">Google Calendar</p>
                        <p className="text-sm text-muted-foreground">
                          Connected on{' '}
                          {calendarConnection.connectedAt
                            ? new Date(calendarConnection.connectedAt).toLocaleDateString()
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={calendarConnection.hasWriteAccess ? 'default' : 'secondary'}>
                        {calendarConnection.hasWriteAccess ? 'Read/Write' : 'Read Only'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {!calendarConnection.hasWriteAccess && (
                      <Link href="/api/calendar/upgrade-scope">
                        <Button variant="outline">
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Upgrade to Write Access
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => setShowDisconnectModal(true)}
                    >
                      Disconnect Calendar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No calendar connected</p>
                  <Link href="/signin">
                    <Button>Connect Google Calendar</Button>
                  </Link>
                </div>
              )}

              {/* Calendar View Settings */}
              <div className="border-t pt-6 space-y-4">
                <h4 className="font-medium">Calendar View Settings</h4>
                <div className="space-y-2">
                  <Label>Calendar View Days</Label>
                  <Select
                    value={settings.calendarSettings.calendarViewDays.toString()}
                    onValueChange={handleCalendarViewChange}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Days Available for Planning</Label>
                  <div className="flex flex-wrap gap-4">
                    {DAY_NAMES.map((day, index) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${index}`}
                          checked={settings.calendarSettings.plannableDays.includes(index)}
                          onCheckedChange={() => handlePlannableDayToggle(index)}
                        />
                        <Label htmlFor={`day-${index}`} className="text-sm cursor-pointer">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Automation/Schedule Section */}
        {activeTab === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Automated Audits
              </CardTitle>
              <CardDescription>
                Schedule automatic calendar audits to track your progress over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isSubscriber ? (
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Automated audits require a subscription
                  </p>
                  <Link href="/#pricing">
                    <Button variant="outline" size="sm">
                      Upgrade to unlock
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Automated Audits</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Automatically analyze your calendar on a schedule
                      </p>
                    </div>
                    <Switch
                      checked={scheduledAudit?.enabled ?? false}
                      onCheckedChange={toggleScheduleEnabled}
                      disabled={savingSchedule}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={scheduledAudit?.frequency || 'weekly'}
                      onValueChange={(v) => saveScheduledAudit(v, scheduledAudit?.enabled ?? true)}
                      disabled={!scheduledAudit?.enabled || savingSchedule}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {scheduledAudit?.frequency === 'weekly' && 'Runs every Saturday at 3am'}
                      {scheduledAudit?.frequency === 'monthly' && 'Runs on the 1st of each month at 3am'}
                      {scheduledAudit?.frequency === 'annual' && 'Runs on January 1st at 3am'}
                    </p>
                  </div>

                  {scheduledAudit?.nextRunAt && scheduledAudit.enabled && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>
                        Next audit:{' '}
                        {new Date(scheduledAudit.nextRunAt).toLocaleDateString()} at{' '}
                        {new Date(scheduledAudit.nextRunAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notifications Section */}
        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Email Notifications</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Audit Ready</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when an audit is complete
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationPreferences.email_audit_ready}
                    onCheckedChange={(v) => handleNotificationChange('email_audit_ready', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekly Digest</Label>
                    <p className="text-xs text-muted-foreground">
                      Weekly summary of your delegation metrics
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationPreferences.email_weekly_digest}
                    onCheckedChange={(v) => handleNotificationChange('email_weekly_digest', v)}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-sm text-muted-foreground">In-App Notifications</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Audit Ready</Label>
                    <p className="text-xs text-muted-foreground">
                      Show notification when an audit is complete
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationPreferences.in_app_audit_ready}
                    onCheckedChange={(v) => handleNotificationChange('in_app_audit_ready', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data & Privacy Section */}
        {activeTab === 'privacy' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Your Data
                </CardTitle>
                <CardDescription>
                  Download all your data from Founder Bleed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => exportData('json')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button variant="outline" onClick={() => exportData('markdown')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Markdown
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  JSON includes all raw data. Markdown provides a human-readable summary.
                </p>
              </CardContent>
            </Card>

            {/* Shared Reports Management */}
            {sharedReports.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Shared Reports</CardTitle>
                  <CardDescription>
                    Manage your shared report links
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sharedReports.map(report => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <code className="text-sm">
                            /share/{report.shareToken.slice(0, 8)}...
                          </code>
                          <p className="text-xs text-muted-foreground">
                            Created: {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown'}
                            {report.revokedAt && ' (Revoked)'}
                          </p>
                        </div>
                        {!report.revokedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeSharedReport(report.id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Delete Account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This action cannot be undone. All your audits, settings, and data will be
                  permanently deleted.
                </p>
                <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
                  Delete My Account
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Contacts Section */}
        {activeTab === 'contacts' && (
          <>
            {/* Invite Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite Contact
                </CardTitle>
                <CardDescription>
                  Invite other founders to compare scores on the leaderboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="founder@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={sendInvite} disabled={sendingInvite}>
                    {sendingInvite ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pending Invitations */}
            {(contacts.receivedPending.length > 0 || contacts.sentPending.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Invitations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contacts.receivedPending.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-muted-foreground">Received</Label>
                      {contacts.receivedPending.map(contact => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">
                              {contact.contactUser?.name || contact.contactUser?.email || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Invited {contact.invitedAt ? new Date(contact.invitedAt).toLocaleDateString() : 'recently'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleContactAction(contact.id, 'accept')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleContactAction(contact.id, 'decline')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {contacts.sentPending.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-muted-foreground">Sent</Label>
                      {contacts.sentPending.map(contact => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">
                              {contact.contactUser?.name ||
                                contact.contactUser?.email ||
                                contact.contactEmail ||
                                'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Pending...
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeContact(contact.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Connected Contacts */}
            {contacts.accepted.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Connected Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {contacts.accepted.map(contact => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">
                            {contact.contactUser?.name ||
                              contact.contactUser?.email ||
                              'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Connected{' '}
                            {contact.acceptedAt
                              ? new Date(contact.acceptedAt).toLocaleDateString()
                              : 'recently'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeContact(contact.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control what your contacts can see
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Share Scores</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow contacts to see your efficiency and planning scores
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.shareScores}
                    onCheckedChange={(v) => updatePrivacySettings('shareScores', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Anonymous Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Appear as &quot;Anonymous Founder&quot; on the leaderboard
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.anonymousMode}
                    onCheckedChange={(v) => updatePrivacySettings('anonymousMode', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Save Button (shown for relevant tabs) */}
      {['account', 'team', 'compensation', 'calendar', 'notifications'].includes(activeTab) && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      )}

      {/* Delete Account Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and all
              associated data including:
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>All audit history and events</li>
            <li>Subscription (will be cancelled)</li>
            <li>Calendar connections</li>
            <li>API keys</li>
            <li>Contact connections</li>
            <li>Shared reports</li>
          </ul>
          <div className="space-y-2">
            <Label>Type DELETE to confirm</Label>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Calendar Modal */}
      <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Calendar</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your Google Calendar? You will need to
              reconnect to run new audits or use the Planning Assistant.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDisconnectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={disconnectCalendar}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
