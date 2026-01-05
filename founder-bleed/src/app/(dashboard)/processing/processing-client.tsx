'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Home,
  Calendar,
  Loader2,
  ArrowRight,
  Users,
  DollarSign,
  Plus,
  Minus,
  Check,
  Building2,
  Code,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

// Supported currencies
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
];

// Default tier rates (annual)
const DEFAULT_RATES = {
  seniorEngineeringRate: 100000,
  seniorBusinessRate: 80000,
  juniorEngineeringRate: 40000,
  juniorBusinessRate: 50000,
  eaRate: 25000,
};

interface TeamComposition {
  founder: number;
  senior_engineering: number;
  senior_business: number;
  junior_engineering: number;
  junior_business: number;
  qa_engineer: number;
  ea: number;
}

interface UserSettings {
  salaryAnnual: string | null;
  salaryInputMode: string;
  currency: string;
  teamComposition: TeamComposition | null;
  companyValuation: string | null;
  equityPercentage: string | null;
  vestingPeriodYears: string | null;
  seniorEngineeringRate: string;
  seniorBusinessRate: string;
  juniorEngineeringRate: string;
  juniorBusinessRate: string;
  eaRate: string;
}

function ProcessingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingAuditId = searchParams.get('auditId');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processingAudit, setProcessingAudit] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(existingAuditId);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed'>('idle');

  // Date range state
  const [dateStart, setDateStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Team composition state
  const [teamComposition, setTeamComposition] = useState<TeamComposition>({
    founder: 1,
    senior_engineering: 0,
    senior_business: 0,
    junior_engineering: 0,
    junior_business: 0,
    qa_engineer: 0,
    ea: 0,
  });
  const [isSoloFounder, setIsSoloFounder] = useState(true);

  // Compensation state
  const [compensationMode, setCompensationMode] = useState<'annual' | 'hourly'>('annual');
  const [compensation, setCompensation] = useState<string>('');
  const [currency, setCurrency] = useState('USD');

  // Equity state
  const [companyValuation, setCompanyValuation] = useState<string>('');
  const [equityPercentage, setEquityPercentage] = useState<string>('');
  const [vestingPeriodYears, setVestingPeriodYears] = useState<string>('4');

  // Tier rates state
  const [showAdvancedRates, setShowAdvancedRates] = useState(false);
  const [tierRates, setTierRates] = useState({
    seniorEngineeringRate: DEFAULT_RATES.seniorEngineeringRate.toString(),
    seniorBusinessRate: DEFAULT_RATES.seniorBusinessRate.toString(),
    juniorEngineeringRate: DEFAULT_RATES.juniorEngineeringRate.toString(),
    juniorBusinessRate: DEFAULT_RATES.juniorBusinessRate.toString(),
    eaRate: DEFAULT_RATES.eaRate.toString(),
  });

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.salaryAnnual) {
            setCompensation(data.salaryAnnual);
            setCompensationMode(data.salaryInputMode === 'hourly' ? 'hourly' : 'annual');
          }
          if (data.currency) setCurrency(data.currency);
          if (data.teamComposition) {
            // Merge with defaults to prevent NaN/undefined values
            const mergedTeamComp = {
              founder: data.teamComposition.founder ?? 1,
              senior_engineering: data.teamComposition.senior_engineering ?? 0,
              senior_business: data.teamComposition.senior_business ?? 0,
              junior_engineering: data.teamComposition.junior_engineering ?? 0,
              junior_business: data.teamComposition.junior_business ?? 0,
              qa_engineer: data.teamComposition.qa_engineer ?? 0,
              ea: data.teamComposition.ea ?? 0,
            };
            setTeamComposition(mergedTeamComp);
            checkSoloFounder(mergedTeamComp);
          }
          if (data.companyValuation) setCompanyValuation(data.companyValuation);
          if (data.equityPercentage) setEquityPercentage(data.equityPercentage);
          if (data.vestingPeriodYears) setVestingPeriodYears(data.vestingPeriodYears);
          if (data.seniorEngineeringRate) setTierRates(prev => ({ ...prev, seniorEngineeringRate: data.seniorEngineeringRate }));
          if (data.seniorBusinessRate) setTierRates(prev => ({ ...prev, seniorBusinessRate: data.seniorBusinessRate }));
          if (data.juniorEngineeringRate) setTierRates(prev => ({ ...prev, juniorEngineeringRate: data.juniorEngineeringRate }));
          if (data.juniorBusinessRate) setTierRates(prev => ({ ...prev, juniorBusinessRate: data.juniorBusinessRate }));
          if (data.eaRate) setTierRates(prev => ({ ...prev, eaRate: data.eaRate }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
  }, []);

  // Check if user is a solo founder
  const checkSoloFounder = (comp: TeamComposition) => {
    const totalNonFounder = Object.entries(comp)
      .filter(([key]) => key !== 'founder')
      .reduce((sum, [, val]) => sum + val, 0);
    setIsSoloFounder(comp.founder === 1 && totalNonFounder === 0);
  };

  // Update team member count
  const updateTeamMember = (role: keyof TeamComposition, delta: number) => {
    setTeamComposition(prev => {
      const newVal = Math.max(role === 'founder' ? 1 : 0, prev[role] + delta);
      const updated = { ...prev, [role]: newVal };
      checkSoloFounder(updated);
      return updated;
    });
  };

  // Toggle solo founder mode
  const toggleSoloFounder = () => {
    if (!isSoloFounder) {
      // Switching TO solo founder mode
      setTeamComposition({
        founder: 1,
        senior_engineering: 0,
        senior_business: 0,
        junior_engineering: 0,
        junior_business: 0,
        qa_engineer: 0,
        ea: 0,
      });
      setIsSoloFounder(true);
    } else {
      setIsSoloFounder(false);
    }
  };

  // Get total team size
  const getTotalTeamSize = () => {
    return Object.values(teamComposition).reduce((sum, val) => sum + val, 0);
  };

  // Convert between annual and hourly
  const getHourlyRate = (annual: number) => annual / 2080;
  const getAnnualRate = (hourly: number) => hourly * 2080;

  // Get display values for compensation
  const getCompensationDisplay = () => {
    const value = parseFloat(compensation) || 0;
    if (compensationMode === 'annual') {
      return {
        primary: value,
        secondary: getHourlyRate(value),
        primaryLabel: '/year',
        secondaryLabel: '/hour',
      };
    }
    return {
      primary: value,
      secondary: getAnnualRate(value),
      primaryLabel: '/hour',
      secondaryLabel: '/year',
    };
  };

  // Quick preset buttons
  const compensationPresets = compensationMode === 'annual'
    ? [300000, 500000, 800000]
    : [150, 250, 400];

  // Create audit
  const createAudit = async () => {
    if (!dateStart || !dateEnd) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (new Date(dateStart) > new Date(dateEnd)) {
      toast.error('Start date must be before end date');
      return;
    }

    setProcessingAudit(true);
    setProcessingStatus('processing');

    try {
      // First save user settings
      await saveSettings();

      // Then create audit
      const response = await fetch('/api/audit/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateStart,
          dateEnd,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create audit');
      }

      const data = await response.json();
      setAuditId(data.auditId);
      setProcessingStatus('completed');
      toast.success('Audit completed!');
    } catch (err) {
      setProcessingStatus('idle');
      toast.error(err instanceof Error ? err.message : 'Failed to create audit');
    } finally {
      setProcessingAudit(false);
    }
  };

  // Save settings to server
  const saveSettings = async () => {
    const annualSalary = compensationMode === 'annual'
      ? compensation
      : (parseFloat(compensation) * 2080).toString();

    const response = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salaryAnnual: annualSalary,
        salaryInputMode: compensationMode,
        currency,
        teamComposition,
        companyValuation: companyValuation || null,
        equityPercentage: equityPercentage || null,
        vestingPeriodYears: vestingPeriodYears || '4',
        ...tierRates,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }
  };

  // Continue to triage
  const continueToTriage = () => {
    if (auditId) {
      router.push(`/triage/${auditId}`);
    }
  };

  // Date range presets
  // Subtract (days - 1) so that "Last 7 days" actually gives 7 days inclusive
  const setDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setDateStart(start.toISOString().split('T')[0]);
    setDateEnd(end.toISOString().split('T')[0]);
  };

  // Next step validation
  const canProceedToStep = (targetStep: number) => {
    if (targetStep === 2) {
      return dateStart && dateEnd && new Date(dateStart) <= new Date(dateEnd);
    }
    if (targetStep === 3) {
      return compensation && parseFloat(compensation) > 0;
    }
    return true;
  };

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

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
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Processing</span>
        </div>
      </nav>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : step > s
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s ? <Check className="h-5 w-5" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 ${step > s ? 'bg-green-500' : 'bg-muted'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Date Range & Team Composition */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Date Range Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Date Range
              </CardTitle>
              <CardDescription>
                Choose the period you want to audit. We recommend at least 2 weeks for meaningful insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Presets */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Select</label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDatePreset(7)}>
                    Past Week
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDatePreset(30)}>
                    Past Month
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDatePreset(365)}>
                    Past Year
                  </Button>
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    max={dateEnd}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    min={dateStart}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Composition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Who&apos;s on your team?
              </CardTitle>
              <CardDescription>
                This helps us determine which tasks can be delegated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Founders Row */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-medium">Founders (including you)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateTeamMember('founder', -1)}
                    disabled={teamComposition.founder <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{teamComposition.founder}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateTeamMember('founder', 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Engineering LEFT / Business RIGHT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Engineering Column (LEFT) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Code className="h-4 w-4" />
                    <span className="text-sm font-medium uppercase">Engineering</span>
                  </div>

                  {/* Senior Engineering */}
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Senior Engineering</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('senior_engineering', -1)}
                          disabled={teamComposition.senior_engineering <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{teamComposition.senior_engineering}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('senior_engineering', 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {teamComposition.senior_engineering > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Rate:</span>
                        <span className="text-xs">{currencySymbol}</span>
                        <Input
                          type="number"
                          value={tierRates.seniorEngineeringRate}
                          onChange={(e) => setTierRates(prev => ({ ...prev, seniorEngineeringRate: e.target.value }))}
                          className="h-7 text-xs w-24"
                        />
                        <span className="text-xs text-muted-foreground">/year</span>
                      </div>
                    )}
                  </div>

                  {/* Junior Engineering */}
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Junior Engineering</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('junior_engineering', -1)}
                          disabled={teamComposition.junior_engineering <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{teamComposition.junior_engineering}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('junior_engineering', 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {teamComposition.junior_engineering > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Rate:</span>
                        <span className="text-xs">{currencySymbol}</span>
                        <Input
                          type="number"
                          value={tierRates.juniorEngineeringRate}
                          onChange={(e) => setTierRates(prev => ({ ...prev, juniorEngineeringRate: e.target.value }))}
                          className="h-7 text-xs w-24"
                        />
                        <span className="text-xs text-muted-foreground">/year</span>
                      </div>
                    )}
                  </div>

                  {/* QA Engineer */}
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">QA Engineer</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('qa_engineer', -1)}
                          disabled={teamComposition.qa_engineer <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{teamComposition.qa_engineer}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('qa_engineer', 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {teamComposition.qa_engineer > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Rate:</span>
                        <span className="text-xs">{currencySymbol}</span>
                        <Input
                          type="number"
                          value={tierRates.juniorEngineeringRate}
                          onChange={(e) => setTierRates(prev => ({ ...prev, juniorEngineeringRate: e.target.value }))}
                          className="h-7 text-xs w-24"
                        />
                        <span className="text-xs text-muted-foreground">/year</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business Column (RIGHT) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-sm font-medium uppercase">Business</span>
                  </div>

                  {/* Senior Business */}
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Senior Business</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('senior_business', -1)}
                          disabled={teamComposition.senior_business <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{teamComposition.senior_business}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('senior_business', 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {teamComposition.senior_business > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Rate:</span>
                        <span className="text-xs">{currencySymbol}</span>
                        <Input
                          type="number"
                          value={tierRates.seniorBusinessRate}
                          onChange={(e) => setTierRates(prev => ({ ...prev, seniorBusinessRate: e.target.value }))}
                          className="h-7 text-xs w-24"
                        />
                        <span className="text-xs text-muted-foreground">/year</span>
                      </div>
                    )}
                  </div>

                  {/* Junior Business */}
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Junior Business</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('junior_business', -1)}
                          disabled={teamComposition.junior_business <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{teamComposition.junior_business}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('junior_business', 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {teamComposition.junior_business > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Rate:</span>
                        <span className="text-xs">{currencySymbol}</span>
                        <Input
                          type="number"
                          value={tierRates.juniorBusinessRate}
                          onChange={(e) => setTierRates(prev => ({ ...prev, juniorBusinessRate: e.target.value }))}
                          className="h-7 text-xs w-24"
                        />
                        <span className="text-xs text-muted-foreground">/year</span>
                      </div>
                    )}
                  </div>

                  {/* Executive Assistant */}
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Executive Assistant</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('ea', -1)}
                          disabled={teamComposition.ea <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{teamComposition.ea}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateTeamMember('ea', 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {teamComposition.ea > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Rate:</span>
                        <span className="text-xs">{currencySymbol}</span>
                        <Input
                          type="number"
                          value={tierRates.eaRate}
                          onChange={(e) => setTierRates(prev => ({ ...prev, eaRate: e.target.value }))}
                          className="h-7 text-xs w-24"
                        />
                        <span className="text-xs text-muted-foreground">/year</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Total team size: {getTotalTeamSize()}</span>
                  {isSoloFounder && (
                    <Badge variant="secondary">Solo Founder</Badge>
                  )}
                </div>
                {isSoloFounder ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSoloFounder}
                  >
                    I have a team
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSoloFounder}
                    className="text-muted-foreground"
                  >
                    Reset to solo founder
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!canProceedToStep(2)}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Compensation */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Your Compensation
              </CardTitle>
              <CardDescription>
                This helps us calculate the cost of time spent on delegatable work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Currency Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Annual/Hourly Toggle */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={compensationMode === 'annual' ? 'default' : 'outline'}
                    onClick={() => {
                      if (compensationMode === 'hourly' && compensation) {
                        setCompensation(Math.round(parseFloat(compensation) * 2080).toString());
                      }
                      setCompensationMode('annual');
                    }}
                  >
                    Annual Salary
                  </Button>
                  <Button
                    variant={compensationMode === 'hourly' ? 'default' : 'outline'}
                    onClick={() => {
                      if (compensationMode === 'annual' && compensation) {
                        setCompensation(Math.round(parseFloat(compensation) / 2080).toString());
                      }
                      setCompensationMode('hourly');
                    }}
                  >
                    Hourly Rate
                  </Button>
                </div>

                {/* Compensation Input */}
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-lg font-medium">{currencySymbol}</span>
                    <Input
                      type="number"
                      placeholder={compensationMode === 'annual' ? '300000' : '150'}
                      value={compensation}
                      onChange={(e) => setCompensation(e.target.value)}
                      className="text-lg"
                    />
                    <span className="text-muted-foreground">
                      {compensationMode === 'annual' ? '/year' : '/hour'}
                    </span>
                  </div>

                  {/* Live Conversion */}
                  {compensation && parseFloat(compensation) > 0 && (
                    <p className="text-sm text-muted-foreground">
                      = {currencySymbol}
                      {compensationMode === 'annual'
                        ? (parseFloat(compensation) / 2080).toFixed(2)
                        : (parseFloat(compensation) * 2080).toLocaleString()}
                      {compensationMode === 'annual' ? '/hour' : '/year'}
                    </p>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Quick select:</label>
                  <div className="flex gap-2">
                    {compensationPresets.map((preset) => (
                      <Button
                        key={preset}
                        variant="outline"
                        size="sm"
                        onClick={() => setCompensation(preset.toString())}
                      >
                        {currencySymbol}
                        {compensationMode === 'annual'
                          ? `${(preset / 1000).toFixed(0)}K`
                          : preset}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Equity (Optional) */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Equity Compensation (Optional)</label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Company Valuation</label>
                    <div className="flex gap-1 items-center">
                      <span className="text-sm">{currencySymbol}</span>
                      <Input
                        type="number"
                        placeholder="10000000"
                        value={companyValuation}
                        onChange={(e) => setCompanyValuation(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Your Equity %</label>
                    <div className="flex gap-1 items-center">
                      <Input
                        type="number"
                        placeholder="10"
                        value={equityPercentage}
                        onChange={(e) => setEquityPercentage(e.target.value)}
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Vesting Period</label>
                    <div className="flex gap-1 items-center">
                      <Input
                        type="number"
                        placeholder="4"
                        value={vestingPeriodYears}
                        onChange={(e) => setVestingPeriodYears(e.target.value)}
                      />
                      <span className="text-sm">years</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced: Tier Rates */}
              <div className="space-y-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  className="text-sm text-muted-foreground p-0 h-auto"
                  onClick={() => setShowAdvancedRates(!showAdvancedRates)}
                >
                  {showAdvancedRates ? '▼' : '▶'} Advanced: Custom Tier Rates
                </Button>

                {showAdvancedRates && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Senior Engineering (Annual)</label>
                      <Input
                        type="number"
                        value={tierRates.seniorEngineeringRate}
                        onChange={(e) => setTierRates(prev => ({ ...prev, seniorEngineeringRate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Senior Business (Annual)</label>
                      <Input
                        type="number"
                        value={tierRates.seniorBusinessRate}
                        onChange={(e) => setTierRates(prev => ({ ...prev, seniorBusinessRate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Junior Engineering (Annual)</label>
                      <Input
                        type="number"
                        value={tierRates.juniorEngineeringRate}
                        onChange={(e) => setTierRates(prev => ({ ...prev, juniorEngineeringRate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Junior Business (Annual)</label>
                      <Input
                        type="number"
                        value={tierRates.juniorBusinessRate}
                        onChange={(e) => setTierRates(prev => ({ ...prev, juniorBusinessRate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Executive Assistant (Annual)</label>
                      <Input
                        type="number"
                        value={tierRates.eaRate}
                        onChange={(e) => setTierRates(prev => ({ ...prev, eaRate: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!canProceedToStep(3)}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Ready to Analyze Your Calendar</CardTitle>
              <CardDescription>
                We&apos;ll fetch your events and classify each one to show you how to reclaim your time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Date Range</span>
                    <p className="font-medium">{dateStart} to {dateEnd}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.ceil((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Team Size</span>
                    <p className="font-medium">{getTotalTeamSize()} {getTotalTeamSize() === 1 ? 'person' : 'people'}</p>
                    {isSoloFounder && (
                      <p className="text-xs text-muted-foreground">Solo founder</p>
                    )}
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Compensation</span>
                    <p className="font-medium">
                      {currencySymbol}
                      {compensationMode === 'annual'
                        ? parseInt(compensation).toLocaleString()
                        : compensation}
                      {compensationMode === 'annual' ? '/year' : '/hour'}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Currency</span>
                    <p className="font-medium">{currency}</p>
                  </div>
                </div>
              </div>

              {/* Processing Status */}
              {processingStatus === 'processing' && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Analyzing your calendar...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment</p>
                </div>
              )}

              {processingStatus === 'completed' && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-lg font-medium">Audit Complete!</p>
                  <p className="text-sm text-muted-foreground">Ready to review your event classifications</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                {processingStatus === 'idle' && (
                  <Button size="lg" onClick={createAudit} disabled={processingAudit}>
                    {processingAudit ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Start Calendar Audit
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}

                {processingStatus === 'completed' && (
                  <Button size="lg" onClick={continueToTriage}>
                    Review Classifications
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {processingStatus === 'idle' && (
            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProcessingClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    }>
      <ProcessingPageContent />
    </Suspense>
  );
}