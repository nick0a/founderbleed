'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Home,
  Save,
  DollarSign,
  Users,
  Loader2,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface CalendarSettings {
  calendarViewDays: number;
  plannableDays: number[];
}

interface UserSettings {
  salaryAnnual: string | null;
  salaryInputMode: string;
  currency: string;
  // Founder tier rates
  founderUniversalRate: string;
  founderEngineeringRate: string;
  founderBusinessRate: string;
  // Senior tier rates
  seniorUniversalRate: string;
  seniorEngineeringRate: string;
  seniorBusinessRate: string;
  // Junior tier rates
  juniorUniversalRate: string;
  juniorEngineeringRate: string;
  juniorBusinessRate: string;
  // Support tier rates
  eaRate: string;
  // Calendar settings
  calendarSettings: CalendarSettings;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VIEW_OPTIONS = [
  { value: 1, label: '1 Day' },
  { value: 3, label: '3 Days' },
  { value: 5, label: '5 Days' },
  { value: 6, label: '6 Days' },
  { value: 7, label: '7 Days' },
];

export default function SettingsClient() {
  const [settings, setSettings] = useState<UserSettings>({
    salaryAnnual: '',
    salaryInputMode: 'annual',
    currency: 'USD',
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
      plannableDays: [1, 2, 3, 4, 5], // Mon-Fri
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings({
            salaryAnnual: data.salaryAnnual || '',
            salaryInputMode: data.salaryInputMode || 'annual',
            currency: data.currency || 'USD',
            founderUniversalRate: data.founderUniversalRate || '200000',
            founderEngineeringRate: data.founderEngineeringRate || '180000',
            founderBusinessRate: data.founderBusinessRate || '160000',
            seniorUniversalRate: data.seniorUniversalRate || '120000',
            seniorEngineeringRate: data.seniorEngineeringRate || '100000',
            seniorBusinessRate: data.seniorBusinessRate || '80000',
            juniorUniversalRate: data.juniorUniversalRate || '50000',
            juniorEngineeringRate: data.juniorEngineeringRate || '40000',
            juniorBusinessRate: data.juniorBusinessRate || '50000',
            eaRate: data.eaRate || '25000',
            calendarSettings: {
              calendarViewDays: data.calendarSettings?.calendarViewDays || 7,
              plannableDays: data.calendarSettings?.plannableDays || [1, 2, 3, 4, 5],
            },
          });
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

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

  const handleChange = (field: keyof Omit<UserSettings, 'calendarSettings'>, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between border-b pb-4 -mt-4 mb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Settings</span>
        </div>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your compensation, delegation rates, and calendar preferences
        </p>
      </div>

      {/* Calendar Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Settings
          </CardTitle>
          <CardDescription>
            Configure your calendar view and which days can be planned
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calendar View Days */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Calendar View</Label>
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
            <p className="text-xs text-muted-foreground">
              Number of days to display in the calendar view
            </p>
          </div>

          {/* Plannable Days */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Days Available for Planning</Label>
            <p className="text-xs text-muted-foreground">
              Select which days the AI can suggest events for
            </p>
            <div className="flex flex-wrap gap-4">
              {DAY_NAMES.map((day, index) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${index}`}
                    checked={settings.calendarSettings.plannableDays.includes(index)}
                    onCheckedChange={() => handlePlannableDayToggle(index)}
                  />
                  <Label
                    htmlFor={`day-${index}`}
                    className="text-sm cursor-pointer"
                  >
                    {day}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Compensation */}
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
              <label className="text-sm font-medium">Annual Salary</label>
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
              <p className="text-xs text-muted-foreground">
                Enter your total annual compensation including equity
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delegation Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Delegation Rates
          </CardTitle>
          <CardDescription>
            Annual salary benchmarks for different roles. Used to estimate hiring costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Founder/Co-Founder Roles</h4>
            <p className="text-xs text-muted-foreground">Tasks delegatable to other founders or C-level executives</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Universal</label>
                <Input
                  type="number"
                  value={settings.founderUniversalRate}
                  onChange={(e) => handleChange('founderUniversalRate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Engineering</label>
                <Input
                  type="number"
                  value={settings.founderEngineeringRate}
                  onChange={(e) => handleChange('founderEngineeringRate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business</label>
                <Input
                  type="number"
                  value={settings.founderBusinessRate}
                  onChange={(e) => handleChange('founderBusinessRate', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Senior Roles</h4>
            <p className="text-xs text-muted-foreground">Experienced professionals who can work independently</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Universal</label>
                <Input
                  type="number"
                  value={settings.seniorUniversalRate}
                  onChange={(e) => handleChange('seniorUniversalRate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Engineering</label>
                <Input
                  type="number"
                  value={settings.seniorEngineeringRate}
                  onChange={(e) => handleChange('seniorEngineeringRate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business</label>
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
            <p className="text-xs text-muted-foreground">Entry-level professionals who need some supervision</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Universal</label>
                <Input
                  type="number"
                  value={settings.juniorUniversalRate}
                  onChange={(e) => handleChange('juniorUniversalRate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Engineering</label>
                <Input
                  type="number"
                  value={settings.juniorEngineeringRate}
                  onChange={(e) => handleChange('juniorEngineeringRate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business</label>
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
            <p className="text-xs text-muted-foreground">Administrative and operational support</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Executive Assistant</label>
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
