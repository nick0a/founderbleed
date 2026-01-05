"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type TeamComposition = {
  founder: number;
  seniorEngineering: number;
  juniorEngineering: number;
  qaEngineering: number;
  seniorBusiness: number;
  juniorBusiness: number;
  ea: number;
};

type ProcessingClientProps = {
  initialTeam: TeamComposition;
  initialSalaryAnnual: number | null;
  initialSalaryMode: "annual" | "hourly";
  initialCurrency: string;
  initialCompanyValuation: number | null;
  initialEquityPercentage: number | null;
  initialVestingPeriodYears: number | null;
  initialRates: {
    seniorEngineeringRate: number;
    seniorBusinessRate: number;
    juniorEngineeringRate: number;
    juniorBusinessRate: number;
    eaRate: number;
  };
};

const DEFAULT_TEAM: TeamComposition = {
  founder: 1,
  seniorEngineering: 0,
  juniorEngineering: 0,
  qaEngineering: 0,
  seniorBusiness: 0,
  juniorBusiness: 0,
  ea: 0,
};

const ANNUAL_PRESETS = [200000, 300000, 500000, 800000];
const HOURLY_PRESETS = [150, 250, 400];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

function formatCurrency(value: number | null, currency: string, maxDigits = 0) {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: maxDigits,
  }).format(value);
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTeam(input: Partial<TeamComposition>): TeamComposition {
  return {
    founder: Math.max(1, Number(input.founder || 1)),
    seniorEngineering: Number(input.seniorEngineering || 0),
    juniorEngineering: Number(input.juniorEngineering || 0),
    qaEngineering: Number(input.qaEngineering || 0),
    seniorBusiness: Number(input.seniorBusiness || 0),
    juniorBusiness: Number(input.juniorBusiness || 0),
    ea: Number(input.ea || 0),
  };
}

export default function ProcessingClient({
  initialTeam,
  initialSalaryAnnual,
  initialSalaryMode,
  initialCurrency,
  initialCompanyValuation,
  initialEquityPercentage,
  initialVestingPeriodYears,
  initialRates,
}: ProcessingClientProps) {
  const router = useRouter();
  const [team, setTeam] = useState<TeamComposition>(() =>
    normalizeTeam({ ...DEFAULT_TEAM, ...initialTeam })
  );
  const [salaryMode, setSalaryMode] = useState<"annual" | "hourly">(
    initialSalaryMode
  );

  const [salaryValue, setSalaryValue] = useState(() => {
    if (!initialSalaryAnnual || !Number.isFinite(initialSalaryAnnual)) return "";
    const value =
      initialSalaryMode === "hourly"
        ? (initialSalaryAnnual / 2080).toFixed(2)
        : Math.round(initialSalaryAnnual).toString();
    return value;
  });
  const [annualBase, setAnnualBase] = useState<number | null>(
    initialSalaryAnnual && Number.isFinite(initialSalaryAnnual)
      ? initialSalaryAnnual
      : null
  );

  const [currency, setCurrency] = useState(initialCurrency || "USD");
  const [companyValuation, setCompanyValuation] = useState(
    initialCompanyValuation ? String(initialCompanyValuation) : ""
  );
  const [equityPercentage, setEquityPercentage] = useState(
    initialEquityPercentage ? String(initialEquityPercentage) : ""
  );
  const [vestingPeriod, setVestingPeriod] = useState(
    initialVestingPeriodYears ? String(initialVestingPeriodYears) : "4"
  );

  const [seniorEngineeringRate, setSeniorEngineeringRate] = useState(
    String(initialRates.seniorEngineeringRate)
  );
  const [seniorBusinessRate, setSeniorBusinessRate] = useState(
    String(initialRates.seniorBusinessRate)
  );
  const [juniorEngineeringRate, setJuniorEngineeringRate] = useState(
    String(initialRates.juniorEngineeringRate)
  );
  const [juniorBusinessRate, setJuniorBusinessRate] = useState(
    String(initialRates.juniorBusinessRate)
  );
  const [eaRate, setEaRate] = useState(String(initialRates.eaRate));

  const [processingStatus, setProcessingStatus] = useState<
    "idle" | "running" | "complete" | "error"
  >("idle");
  const [auditId, setAuditId] = useState<string | null>(null);

  const totalTeamSize = Object.values(team).reduce(
    (sum, value) => sum + value,
    0
  );

  const isSoloFounder =
    team.founder === 1 &&
    Object.entries(team).every(([key, value]) => key === "founder" || value === 0);

  const salaryValueNumber = parseNumber(salaryValue);
  const annualSalary = annualBase;
  const hourlyRate =
    annualBase === null ? null : Math.round((annualBase / 2080) * 100) / 100;

  const valuationNumber = parseNumber(companyValuation);
  const equityNumber = parseNumber(equityPercentage);
  const vestingNumber = parseNumber(vestingPeriod);

  const hasCompensation = salaryValueNumber !== null && salaryValueNumber > 0;
  const hasCurrency = currency.trim().length > 0;
  const equityRequired = valuationNumber !== null;
  const vestingRequired = valuationNumber !== null && equityNumber !== null;

  const qaComplete =
    team.founder > 0 &&
    hasCompensation &&
    hasCurrency &&
    (!equityRequired || equityNumber !== null) &&
    (!vestingRequired || vestingNumber !== null);

  const processingComplete = processingStatus === "complete";
  const canContinue = qaComplete && processingComplete && auditId;

  const payload = useMemo(
    () => ({
      teamComposition: team,
      salaryAnnual: annualSalary,
      salaryInputMode: salaryMode,
      currency,
      companyValuation: valuationNumber,
      equityPercentage: equityNumber,
      vestingPeriodYears: vestingNumber,
      seniorEngineeringRate: parseNumber(seniorEngineeringRate),
      seniorBusinessRate: parseNumber(seniorBusinessRate),
      juniorEngineeringRate: parseNumber(juniorEngineeringRate),
      juniorBusinessRate: parseNumber(juniorBusinessRate),
      eaRate: parseNumber(eaRate),
    }),
    [
      team,
      annualSalary,
      salaryMode,
      currency,
      valuationNumber,
      equityNumber,
      vestingNumber,
      seniorEngineeringRate,
      seniorBusinessRate,
      juniorEngineeringRate,
      juniorBusinessRate,
      eaRate,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [payload]);

  function updateTeam(role: keyof TeamComposition, delta: number) {
    setTeam((prev) => {
      const next = { ...prev };
      next[role] = Math.max(0, next[role] + delta);
      if (role === "founder") {
        next.founder = Math.max(1, next.founder);
      }
      return next;
    });
  }

  function toggleJustMe() {
    setTeam({
      founder: 1,
      seniorEngineering: 0,
      juniorEngineering: 0,
      qaEngineering: 0,
      seniorBusiness: 0,
      juniorBusiness: 0,
      ea: 0,
    });
  }

  function handleToggleMode(nextMode: "annual" | "hourly") {
    if (nextMode === salaryMode) return;
    let nextValue = "";
    if (annualBase !== null) {
      nextValue =
        nextMode === "hourly"
          ? (annualBase / 2080).toFixed(2)
          : Math.round(annualBase).toString();
    }
    setSalaryMode(nextMode);
    setSalaryValue(nextValue);
  }

  function handleSalaryChange(nextValue: string) {
    setSalaryValue(nextValue);
    const parsed = parseNumber(nextValue);
    if (parsed === null) {
      setAnnualBase(null);
      return;
    }
    const base = salaryMode === "annual" ? parsed : parsed * 2080;
    setAnnualBase(base);
  }

  function applyPreset(value: number) {
    setSalaryValue(String(value));
    const base = salaryMode === "annual" ? value : value * 2080;
    setAnnualBase(base);
  }

  async function startProcessing() {
    if (processingStatus === "running") return;
    setProcessingStatus("running");

    try {
      const profileResponse = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to save profile");
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      const response = await fetch("/api/audit/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateStart: startDate.toISOString(),
          dateEnd: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create audit");
      }

      const data = (await response.json()) as { auditId?: string };
      if (data.auditId) {
        setAuditId(data.auditId);
        setProcessingStatus("complete");
      } else {
        setProcessingStatus("error");
      }
    } catch (error) {
      console.error("Audit creation failed", error);
      setProcessingStatus("error");
    }
  }

  function handleContinue() {
    if (!auditId) return;
    router.push(`/triage/${auditId}`);
  }

  const compensationPresets = salaryMode === "annual" ? ANNUAL_PRESETS : HOURLY_PRESETS;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Processing Audit
              </p>
              <h1 className="mt-3 text-2xl font-semibold">
                We are preparing your calendar audit
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Answer a few questions while we process your calendar events.
              </p>
            </div>
            <Button
              onClick={startProcessing}
              disabled={
                processingStatus === "running" ||
                processingStatus === "complete" ||
                !qaComplete
              }
            >
              {processingStatus === "complete"
                ? "Audit ready"
                : processingStatus === "running"
                  ? "Processing..."
                  : "Start processing"}
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {processingStatus === "complete"
                  ? "Audit complete"
                  : processingStatus === "error"
                    ? "Processing failed - try again"
                    : processingStatus === "running"
                      ? "Processing calendar events"
                      : "Ready to process"}
              </span>
              <span className="text-xs text-muted-foreground">
                {processingStatus === "complete" ? "100%" : processingStatus === "running" ? "60%" : "0%"}
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  processingStatus === "complete"
                    ? "w-full bg-emerald-500"
                    : processingStatus === "running"
                      ? "w-3/5 bg-amber-500 animate-pulse"
                      : "w-1/4 bg-muted-foreground/40"
                }`}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Who is on your team?</h2>
              <p className="text-sm text-muted-foreground">
                Engineering roles on the left, Business roles on the right.
              </p>

              <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between border-b border-border pb-4 text-sm">
                  <span className="font-medium">Founder (including you)</span>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="outline" onClick={() => updateTeam("founder", -1)}>
                      -
                    </Button>
                    <span className="w-6 text-center font-semibold">{team.founder}</span>
                    <Button size="sm" variant="outline" onClick={() => updateTeam("founder", 1)}>
                      +
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Engineering
                    </p>
                    <div className="mt-3 space-y-3">
                      <RoleCounter
                        label="Senior Engineering"
                        value={team.seniorEngineering}
                        onMinus={() => updateTeam("seniorEngineering", -1)}
                        onPlus={() => updateTeam("seniorEngineering", 1)}
                      />
                      <RoleCounter
                        label="Junior Engineering"
                        value={team.juniorEngineering}
                        onMinus={() => updateTeam("juniorEngineering", -1)}
                        onPlus={() => updateTeam("juniorEngineering", 1)}
                      />
                      <RoleCounter
                        label="QA Engineer"
                        value={team.qaEngineering}
                        onMinus={() => updateTeam("qaEngineering", -1)}
                        onPlus={() => updateTeam("qaEngineering", 1)}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Business
                    </p>
                    <div className="mt-3 space-y-3">
                      <RoleCounter
                        label="Senior Business"
                        value={team.seniorBusiness}
                        onMinus={() => updateTeam("seniorBusiness", -1)}
                        onPlus={() => updateTeam("seniorBusiness", 1)}
                      />
                      <RoleCounter
                        label="Junior Business"
                        value={team.juniorBusiness}
                        onMinus={() => updateTeam("juniorBusiness", -1)}
                        onPlus={() => updateTeam("juniorBusiness", 1)}
                      />
                      <RoleCounter
                        label="Executive Assistant"
                        value={team.ea}
                        onMinus={() => updateTeam("ea", -1)}
                        onPlus={() => updateTeam("ea", 1)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-sm">
                  <span className="text-muted-foreground">
                    Total team size: <span className="font-semibold text-foreground">{totalTeamSize}</span>
                  </span>
                  <button
                    type="button"
                    onClick={toggleJustMe}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      isSoloFounder ? "border-emerald-500 text-emerald-600" : "border-border text-muted-foreground"
                    }`}
                  >
                    {isSoloFounder ? "Just me - solo founder" : "Set to just me"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Your compensation</h2>
              <p className="text-sm text-muted-foreground">
                Toggle between annual salary and hourly rate.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant={salaryMode === "annual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleMode("annual")}
                >
                  Annual Salary
                </Button>
                <Button
                  variant={salaryMode === "hourly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleMode("hourly")}
                >
                  Hourly Rate
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {salaryMode === "annual" ? "Annual Salary" : "Hourly Rate"}
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-semibold">$</span>
                    <input
                      value={salaryValue}
                      onChange={(event) => handleSalaryChange(event.target.value)}
                      className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">
                      {salaryMode === "annual" ? "/yr" : "/hr"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {salaryMode === "annual"
                      ? `= ${formatCurrency(hourlyRate, currency, 2)} / hr`
                      : `= ${formatCurrency(annualSalary, currency)} / yr`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {compensationPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-full border border-border px-3 py-1 text-muted-foreground hover:text-foreground"
                    >
                      {formatCurrency(preset, currency)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Financial context</h2>
              <p className="text-sm text-muted-foreground">
                Optional inputs help calculate opportunity costs.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Company valuation
                  </label>
                  <input
                    value={companyValuation}
                    onChange={(event) => setCompanyValuation(event.target.value)}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="e.g. 5000000"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Equity percentage
                  </label>
                  <input
                    value={equityPercentage}
                    onChange={(event) => setEquityPercentage(event.target.value)}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="e.g. 10"
                    disabled={!equityRequired}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Vesting period (years)
                  </label>
                  <input
                    value={vestingPeriod}
                    onChange={(event) => setVestingPeriod(event.target.value)}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="4"
                    disabled={!vestingRequired}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Tier rates</h2>
              <p className="text-sm text-muted-foreground">
                Adjust annual rates to match your market.
              </p>

              <div className="mt-4 space-y-4 text-sm">
                <RateInput
                  label="Senior Engineering"
                  value={seniorEngineeringRate}
                  onChange={setSeniorEngineeringRate}
                />
                <RateInput
                  label="Senior Business"
                  value={seniorBusinessRate}
                  onChange={setSeniorBusinessRate}
                />
                <RateInput
                  label="Junior Engineering"
                  value={juniorEngineeringRate}
                  onChange={setJuniorEngineeringRate}
                />
                <RateInput
                  label="Junior Business"
                  value={juniorBusinessRate}
                  onChange={setJuniorBusinessRate}
                />
                <RateInput label="Executive Assistant" value={eaRate} onChange={setEaRate} />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Continue to review</h2>
              <p className="text-sm text-muted-foreground">
                You can edit these answers later in Settings.
              </p>
              <Button className="mt-4 w-full" onClick={handleContinue} disabled={!canContinue}>
                {processingComplete ? "Continue to triage" : "Finish processing to continue"}
              </Button>
              {!qaComplete && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Add compensation and team details to continue.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function RoleCounter({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onMinus}>
          -
        </Button>
        <span className="w-6 text-center font-semibold">{value}</span>
        <Button size="sm" variant="outline" onClick={onPlus}>
          +
        </Button>
      </div>
    </div>
  );
}

function RateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">$</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm"
        />
      </div>
    </label>
  );
}
