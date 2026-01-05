'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Team composition types
interface TeamComposition {
  founder: number;
  senior_engineering: number;
  senior_business: number;
  junior_engineering: number;
  junior_business: number;
  qa_engineer: number;
  ea: number;
}

// Default tier rates (annual)
const DEFAULT_RATES = {
  senior_engineering: 100000,
  senior_business: 100000,
  junior_engineering: 50000,
  junior_business: 50000,
  ea: 30000,
};

// Currencies
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'HKD', 'JPY', 'INR'];

// Annual/Hourly conversion (2080 hours/year)
const HOURS_PER_YEAR = 2080;

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auditId = searchParams.get('auditId');

  // Processing state
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'complete'>('processing');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Step 1: Team Composition
  const [team, setTeam] = useState<TeamComposition>({
    founder: 1,
    senior_engineering: 0,
    senior_business: 0,
    junior_engineering: 0,
    junior_business: 0,
    qa_engineer: 0,
    ea: 0,
  });
  const [isSoloFounder, setIsSoloFounder] = useState(false);

  // Step 2-3: Compensation
  const [salaryMode, setSalaryMode] = useState<'annual' | 'hourly'>('annual');
  const [salaryValue, setSalaryValue] = useState<number | null>(null);
  const [currency, setCurrency] = useState('USD');

  // Q&A Form State - qaComplete derived from salaryValue
  const qaComplete = salaryValue !== null && salaryValue > 0;

  // Step 4-6: Equity (optional)
  const [companyValuation, setCompanyValuation] = useState<number | null>(null);
  const [equityPercentage, setEquityPercentage] = useState<number | null>(null);
  const [vestingPeriod, setVestingPeriod] = useState<number>(4);

  // Step 7-11: Tier Rates (optional)
  const [tierRates, setTierRates] = useState(DEFAULT_RATES);

  // Calculate total team size
  const totalTeamSize = Object.values(team).reduce((a, b) => a + b, 0);

  // Calculate hourly/annual conversion
  const hourlyRate = salaryValue
    ? salaryMode === 'annual'
      ? salaryValue / HOURS_PER_YEAR
      : salaryValue
    : null;

  const annualSalary = salaryValue
    ? salaryMode === 'hourly'
      ? salaryValue * HOURS_PER_YEAR
      : salaryValue
    : null;

  // Simulate processing progress
  useEffect(() => {
    if (processingStatus === 'processing') {
      const interval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 100) {
            setProcessingStatus('complete');
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [processingStatus]);

  // Handle solo founder toggle
  const handleSoloFounderToggle = () => {
    if (!isSoloFounder) {
      setTeam({
        founder: 1,
        senior_engineering: 0,
        senior_business: 0,
        junior_engineering: 0,
        junior_business: 0,
        qa_engineer: 0,
        ea: 0,
      });
    }
    setIsSoloFounder(!isSoloFounder);
  };

  // Update team count
  const updateTeamCount = (key: keyof TeamComposition, delta: number) => {
    setTeam((prev) => ({
      ...prev,
      [key]: Math.max(key === 'founder' ? 1 : 0, prev[key] + delta),
    }));
    setIsSoloFounder(false);
  };

  // Save Q&A and navigate to triage
  const handleContinue = useCallback(async () => {
    if (!auditId) return;

    try {
      // Save user preferences
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamComposition: team,
          salaryAnnual: annualSalary,
          salaryInputMode: salaryMode,
          currency,
          companyValuation,
          equityPercentage,
          vestingPeriodYears: vestingPeriod,
          tierRates,
        }),
      });

      // Navigate to triage
      router.push(`/triage/${auditId}`);
    } catch (err) {
      console.error('Error saving preferences:', err);
      // Navigate anyway
      router.push(`/triage/${auditId}`);
    }
  }, [
    auditId,
    team,
    annualSalary,
    salaryMode,
    currency,
    companyValuation,
    equityPercentage,
    vestingPeriod,
    tierRates,
    router,
  ]);


  // Quick preset handlers
  const annualPresets = [300000, 500000, 800000];
  const hourlyPresets = [150, 250, 400];

  const renderTeamComposition = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Who&apos;s on your team?</h3>

      {/* Founder Row */}
      <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="font-medium">Founder (including you)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateTeamCount('founder', -1)}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center"
              disabled={team.founder <= 1}
            >
              −
            </button>
            <span className="w-8 text-center font-mono">{team.founder}</span>
            <button
              onClick={() => updateTeamCount('founder', 1)}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Engineering LEFT, Business RIGHT */}
      <div className="grid grid-cols-2 gap-6">
        {/* Engineering Column - LEFT */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Engineering
          </h4>
          <div className="space-y-3">
            {[
              { key: 'senior_engineering', label: 'Senior Engineering' },
              { key: 'junior_engineering', label: 'Junior Engineering' },
              { key: 'qa_engineer', label: 'QA Engineer' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateTeamCount(key as keyof TeamComposition, -1)}
                    className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-sm"
                    disabled={team[key as keyof TeamComposition] <= 0 || isSoloFounder}
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-mono text-sm">
                    {team[key as keyof TeamComposition]}
                  </span>
                  <button
                    onClick={() => updateTeamCount(key as keyof TeamComposition, 1)}
                    className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-sm"
                    disabled={isSoloFounder}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Business Column - RIGHT */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Business
          </h4>
          <div className="space-y-3">
            {[
              { key: 'senior_business', label: 'Senior Business' },
              { key: 'junior_business', label: 'Junior Business' },
              { key: 'ea', label: 'Executive Assistant' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateTeamCount(key as keyof TeamComposition, -1)}
                    className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-sm"
                    disabled={team[key as keyof TeamComposition] <= 0 || isSoloFounder}
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-mono text-sm">
                    {team[key as keyof TeamComposition]}
                  </span>
                  <button
                    onClick={() => updateTeamCount(key as keyof TeamComposition, 1)}
                    className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-sm"
                    disabled={isSoloFounder}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Total and Solo Founder */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Total team size:</span>
          <span className="font-mono font-medium">{totalTeamSize}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isSoloFounder}
            onChange={handleSoloFounderToggle}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Just me - I&apos;m a solo founder
          </span>
        </label>
      </div>
    </div>
  );

  const renderCompensation = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Your Compensation</h3>

      {/* Annual/Hourly Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSalaryMode('annual')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            salaryMode === 'annual'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          Annual Salary
        </button>
        <button
          onClick={() => setSalaryMode('hourly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            salaryMode === 'hourly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          Hourly Rate
        </button>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">$</span>
        <input
          type="number"
          value={salaryValue || ''}
          onChange={(e) => setSalaryValue(e.target.value ? Number(e.target.value) : null)}
          placeholder={salaryMode === 'annual' ? '300,000' : '150'}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-gray-500">{salaryMode === 'annual' ? '/yr' : '/hr'}</span>
      </div>

      {/* Conversion Display */}
      {salaryValue && (
        <p className="text-sm text-gray-500 mb-4">
          = ${salaryMode === 'annual' ? hourlyRate?.toFixed(2) : annualSalary?.toLocaleString()}
          {salaryMode === 'annual' ? '/hr' : '/yr'}
        </p>
      )}

      {/* Quick Presets */}
      <div className="flex gap-2">
        <span className="text-sm text-gray-500">Quick select:</span>
        {(salaryMode === 'annual' ? annualPresets : hourlyPresets).map((preset) => (
          <button
            key={preset}
            onClick={() => setSalaryValue(preset)}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            ${salaryMode === 'annual' ? `${preset / 1000}K` : preset}
          </button>
        ))}
      </div>
    </div>
  );

  const renderCurrency = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">What currency?</h3>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );

  const renderEquity = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Equity Details (Optional)</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Company Valuation</label>
          <div className="flex items-center gap-2">
            <span>$</span>
            <input
              type="number"
              value={companyValuation || ''}
              onChange={(e) =>
                setCompanyValuation(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="10,000,000"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent"
            />
          </div>
        </div>

        {companyValuation && (
          <div>
            <label className="block text-sm text-gray-500 mb-1">Equity Percentage</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={equityPercentage || ''}
                onChange={(e) =>
                  setEquityPercentage(e.target.value ? Number(e.target.value) : null)
                }
                placeholder="10"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent"
                max={100}
              />
              <span>%</span>
            </div>
          </div>
        )}

        {companyValuation && equityPercentage && (
          <div>
            <label className="block text-sm text-gray-500 mb-1">Vesting Period (years)</label>
            <input
              type="number"
              value={vestingPeriod}
              onChange={(e) => setVestingPeriod(Number(e.target.value) || 4)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent"
              min={1}
              max={10}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderTierRates = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Tier Rates (Optional)</h3>
      <p className="text-sm text-gray-500 mb-4">
        We use these to calculate the cost of delegating work. Defaults are shown.
      </p>

      <div className="space-y-3">
        {[
          { key: 'senior_engineering', label: 'Senior Engineering (annual)' },
          { key: 'senior_business', label: 'Senior Business (annual)' },
          { key: 'junior_engineering', label: 'Junior Engineering (annual)' },
          { key: 'junior_business', label: 'Junior Business (annual)' },
          { key: 'ea', label: 'Executive Assistant (annual)' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm">{label}</span>
            <div className="flex items-center gap-1">
              <span>$</span>
              <input
                type="number"
                value={tierRates[key as keyof typeof tierRates]}
                onChange={(e) =>
                  setTierRates((prev) => ({
                    ...prev,
                    [key]: Number(e.target.value) || 0,
                  }))
                }
                className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-transparent text-right font-mono"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Processing Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            {processingStatus === 'processing' ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            ) : (
              <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                ✓
              </div>
            )}
            <h2 className="text-lg font-semibold">
              {processingStatus === 'processing'
                ? 'Analyzing your calendar...'
                : 'Analysis complete!'}
            </h2>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(processingProgress, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {processingStatus === 'processing'
              ? 'Classifying events, detecting leave, calculating metrics...'
              : 'Ready to review your results'}
          </p>
        </div>

        {/* Q&A Sections */}
        <div className="space-y-6">
          {/* Step 1: Team Composition */}
          {renderTeamComposition()}

          {/* Step 2-3: Compensation */}
          {renderCompensation()}

          {/* Step 3: Currency */}
          {renderCurrency()}

          {/* Step 4-6: Equity (Collapsible) */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
              + Add equity details (optional)
            </summary>
            {renderEquity()}
          </details>

          {/* Step 7-11: Tier Rates (Collapsible) */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
              + Customize tier rates (optional)
            </summary>
            {renderTierRates()}
          </details>
        </div>

        {/* Continue Button */}
        <div className="mt-8">
          <button
            onClick={handleContinue}
            disabled={processingStatus !== 'complete' || !qaComplete}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition ${
              processingStatus === 'complete' && qaComplete
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {processingStatus !== 'complete'
              ? 'Processing...'
              : !qaComplete
                ? 'Enter your compensation to continue'
                : 'Review Classifications →'}
          </button>
          <p className="text-center text-sm text-gray-500 mt-2">
            {qaComplete && processingStatus === 'complete'
              ? "You'll be able to adjust event classifications next"
              : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function ProcessingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Main export with Suspense boundary
export default function ProcessingPage() {
  return (
    <Suspense fallback={<ProcessingLoading />}>
      <ProcessingContent />
    </Suspense>
  );
}
