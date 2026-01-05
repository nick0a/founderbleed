'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

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
}

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
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UserSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
          Configure your compensation and delegation rates
        </p>
      </div>

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