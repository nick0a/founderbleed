"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { signIn, signOut } from "next-auth/react";

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

type SettingsClientProps = {
  user: {
    email: string;
    name: string;
    username: string;
    currency: string;
    salaryAnnual: number | null;
    salaryInputMode: "annual" | "hourly";
    companyValuation: number | null;
    equityPercentage: number | null;
    vestingPeriodYears: number | null;
    rates: {
      seniorEngineeringRate: number;
      seniorBusinessRate: number;
      juniorEngineeringRate: number;
      juniorBusinessRate: number;
      eaRate: number;
    };
    teamComposition: TeamComposition;
    notificationPreferences: {
      email_audit_ready: boolean;
      email_weekly_digest: boolean;
      in_app_audit_ready: boolean;
    };
    privacy: {
      shareScores: boolean;
      anonymousMode: boolean;
    };
  };
  subscription: {
    tier: string;
    status: string;
    currentPeriodEnd: string | null;
    llmBudgetCents: number;
    llmSpentCents: number;
  } | null;
  byokKeys: Array<{
    id: string;
    provider: string;
    priority: string;
    masked: string;
  }>;
  calendarConnection: {
    hasWriteAccess: boolean;
    email: string;
  } | null;
  schedule: {
    id: string;
    frequency: string;
    enabled: boolean;
    dayOfWeek: number;
    hour: number;
    timezone: string;
    nextRunAt: string | null;
  } | null;
  sharedReports: Array<{
    id: string;
    shareToken: string;
    createdAt: string | null;
    revokedAt: string | null;
  }>;
  contacts: {
    sent: Array<{ id: string; email: string }>;
    received: Array<{ id: string; email: string; name: string }>;
    accepted: Array<{ id: string; name: string; email: string }>;
    leaderboard: Array<{
      id: string;
      name: string;
      efficiencyScore: number | null;
      planningScore: number | null;
      improvement: number | null;
    }>;
  };
};

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];
const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number | null, currency: string, maxDigits = 0) {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: maxDigits,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Hidden";
  return `${Math.round(value)}%`;
}

function formatDelta(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Hidden";
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

export default function SettingsClient({
  user,
  subscription,
  byokKeys,
  calendarConnection,
  schedule,
  sharedReports,
  contacts,
}: SettingsClientProps) {
  const [accountName, setAccountName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [team, setTeam] = useState<TeamComposition>(user.teamComposition);
  const [salaryMode, setSalaryMode] = useState<"annual" | "hourly">(
    user.salaryInputMode
  );
  const [salaryValue, setSalaryValue] = useState(() => {
    if (!user.salaryAnnual) return "";
    return salaryMode === "hourly"
      ? (user.salaryAnnual / 2080).toFixed(2)
      : Math.round(user.salaryAnnual).toString();
  });
  const [currency, setCurrency] = useState(user.currency);
  const [companyValuation, setCompanyValuation] = useState(
    user.companyValuation ? String(user.companyValuation) : ""
  );
  const [equityPercentage, setEquityPercentage] = useState(
    user.equityPercentage ? String(user.equityPercentage) : ""
  );
  const [vestingPeriod, setVestingPeriod] = useState(
    user.vestingPeriodYears ? String(user.vestingPeriodYears) : "4"
  );
  const [rates, setRates] = useState({
    seniorEngineeringRate: String(user.rates.seniorEngineeringRate),
    seniorBusinessRate: String(user.rates.seniorBusinessRate),
    juniorEngineeringRate: String(user.rates.juniorEngineeringRate),
    juniorBusinessRate: String(user.rates.juniorBusinessRate),
    eaRate: String(user.rates.eaRate),
  });
  const [notificationPrefs, setNotificationPrefs] = useState(
    user.notificationPreferences
  );
  const [privacy, setPrivacy] = useState(user.privacy);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const [byokForm, setByokForm] = useState({
    provider: "openai",
    apiKey: "",
    priority: "budget_first",
  });
  const [byokList, setByokList] = useState(byokKeys);

  const [scheduleState, setScheduleState] = useState(() =>
    schedule || {
      id: "",
      frequency: "weekly",
      enabled: false,
      dayOfWeek: 6,
      hour: 3,
      timezone: "UTC",
      nextRunAt: null as string | null,
    }
  );

  const [sharedReportState, setSharedReportState] = useState(sharedReports);

  const [contactEmail, setContactEmail] = useState("");
  const [contactSent, setContactSent] = useState(contacts.sent);
  const [contactReceived, setContactReceived] = useState(contacts.received);
  const [contactAccepted, setContactAccepted] = useState(contacts.accepted);

  const annualSalary = useMemo(() => {
    const parsed = parseNumber(salaryValue);
    if (parsed === null) return null;
    return salaryMode === "annual" ? parsed : parsed * 2080;
  }, [salaryMode, salaryValue]);

  const leaderboardGroups = useMemo(() => {
    const entries = contacts.leaderboard || [];
    const sortBy = (
      key: "efficiencyScore" | "planningScore" | "improvement"
    ) =>
      entries
        .slice()
        .sort((a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity))
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          value: entry[key] ?? null,
        }));

    return {
      efficiency: sortBy("efficiencyScore"),
      planning: sortBy("planningScore"),
      improvement: sortBy("improvement"),
    };
  }, [contacts.leaderboard]);

  function handleSalaryModeChange(nextMode: "annual" | "hourly") {
    if (nextMode === salaryMode) return;
    const currentAnnual = annualSalary;
    if (currentAnnual !== null) {
      const nextValue =
        nextMode === "hourly"
          ? (currentAnnual / 2080).toFixed(2)
          : Math.round(currentAnnual).toString();
      setSalaryValue(nextValue);
    }
    setSalaryMode(nextMode);
  }

  async function saveProfile(payload: Record<string, unknown>, section: string) {
    setSavingSection(section);
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingSection(null);
  }

  async function saveAccount() {
    await saveProfile({ name: accountName, username }, "account");
  }

  async function saveTeam() {
    await saveProfile({ teamComposition: team }, "team");
  }

  async function saveCompensation() {
    await saveProfile(
      {
        salaryAnnual: annualSalary,
        salaryInputMode: salaryMode,
        currency,
        companyValuation: parseNumber(companyValuation),
        equityPercentage: parseNumber(equityPercentage),
        vestingPeriodYears: parseNumber(vestingPeriod),
        seniorEngineeringRate: parseNumber(rates.seniorEngineeringRate),
        seniorBusinessRate: parseNumber(rates.seniorBusinessRate),
        juniorEngineeringRate: parseNumber(rates.juniorEngineeringRate),
        juniorBusinessRate: parseNumber(rates.juniorBusinessRate),
        eaRate: parseNumber(rates.eaRate),
      },
      "comp"
    );
  }

  async function saveNotifications() {
    await saveProfile({ notificationPreferences: notificationPrefs }, "notifications");
  }

  async function savePrivacy() {
    await saveProfile({ settings: { privacy } }, "privacy");
  }

  function updateTeam(role: keyof TeamComposition, delta: number) {
    setTeam((prev) => ({
      ...prev,
      [role]: Math.max(0, prev[role] + delta),
      founder: role === "founder" ? Math.max(1, prev.founder + delta) : prev.founder,
    }));
  }

  async function handleByokSave() {
    setSavingSection("byok");
    const response = await fetch("/api/byok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(byokForm),
    });

    const data = (await response.json().catch(() => null)) as
      | { key?: string }
      | null;

    const maskedKey = data?.key;
    if (response.ok && maskedKey) {
      setByokList((prev) => {
        const existing = prev.find((item) => item.provider === byokForm.provider);
        if (existing) {
          return prev.map((item) =>
            item.provider === byokForm.provider
              ? { ...item, masked: maskedKey, priority: byokForm.priority }
              : item
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            provider: byokForm.provider,
            masked: maskedKey,
            priority: byokForm.priority,
          },
        ];
      });
      setByokForm({ provider: "openai", apiKey: "", priority: "budget_first" });
    }

    setSavingSection(null);
  }

  async function handleByokDelete(provider: string) {
    await fetch("/api/byok", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    setByokList((prev) => prev.filter((item) => item.provider !== provider));
  }

  async function handleByokPriority(provider: string, priority: string) {
    await fetch("/api/byok", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, priority }),
    });
    setByokList((prev) =>
      prev.map((item) =>
        item.provider === provider ? { ...item, priority } : item
      )
    );
  }

  async function openPortal() {
    const response = await fetch("/api/subscription/portal");
    const data = (await response.json().catch(() => null)) as { url?: string } | null;
    if (data?.url) {
      window.location.href = data.url;
    }
  }

  async function handleCalendarDisconnect() {
    await fetch("/api/calendar/disconnect", { method: "POST" });
    window.location.reload();
  }

  async function handleScheduleSave(nextSchedule: typeof scheduleState) {
    setSavingSection("schedule");
    const response = await fetch("/api/scheduled-audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextSchedule),
    });
    const data = (await response.json().catch(() => null)) as
      | { schedule?: typeof scheduleState }
      | null;
    if (data?.schedule) {
      setScheduleState({
        ...nextSchedule,
        nextRunAt: data.schedule.nextRunAt || null,
        id: data.schedule.id || nextSchedule.id,
      });
    }
    setSavingSection(null);
  }

  async function revokeShare(reportId: string) {
    await fetch("/api/share/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareId: reportId }),
    });
    setSharedReportState((prev) =>
      prev.map((report) =>
        report.id === reportId ? { ...report, revokedAt: new Date().toISOString() } : report
      )
    );
  }

  async function inviteContact() {
    if (!contactEmail.trim()) return;
    setSavingSection("contacts");
    const response = await fetch("/api/contacts/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: contactEmail.trim() }),
    });
    if (response.ok) {
      setContactSent((prev) => [...prev, { id: crypto.randomUUID(), email: contactEmail.trim() }]);
      setContactEmail("");
    }
    setSavingSection(null);
  }

  async function respondContact(contactId: string, action: "accept" | "decline") {
    setSavingSection("contacts");
    const acceptedInvite = contactReceived.find((invite) => invite.id === contactId);
    const response = await fetch("/api/contacts/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, action }),
    });
    if (response.ok) {
      setContactReceived((prev) => prev.filter((invite) => invite.id !== contactId));
      if (action === "accept" && acceptedInvite) {
        setContactAccepted((prev) => [
          ...prev,
          { id: contactId, name: acceptedInvite.name, email: acceptedInvite.email },
        ]);
      }
    }
    setSavingSection(null);
  }

  async function handleDeleteAccount() {
    const confirmText = window.prompt(
      "Type DELETE to permanently remove your account and data."
    );
    if (confirmText !== "DELETE") return;
    const response = await fetch("/api/account/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    if (response.ok) {
      await signOut({ callbackUrl: "/" });
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Settings
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Account & controls</h1>
        </header>

        <Section title="Account">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Email
              </label>
              <input
                value={user.email}
                disabled
                className="mt-2 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Name
              </label>
              <input
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Username
              </label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Button className="mt-4" onClick={saveAccount} disabled={savingSection === "account"}>
            Save account
          </Button>
        </Section>

        <Section title="Team composition">
          <p className="text-sm text-muted-foreground">
            Engineering left, business right. QA Engineer included.
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
                  <RoleCounter label="Senior Engineering" value={team.seniorEngineering} onMinus={() => updateTeam("seniorEngineering", -1)} onPlus={() => updateTeam("seniorEngineering", 1)} />
                  <RoleCounter label="Junior Engineering" value={team.juniorEngineering} onMinus={() => updateTeam("juniorEngineering", -1)} onPlus={() => updateTeam("juniorEngineering", 1)} />
                  <RoleCounter label="QA Engineer" value={team.qaEngineering} onMinus={() => updateTeam("qaEngineering", -1)} onPlus={() => updateTeam("qaEngineering", 1)} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Business
                </p>
                <div className="mt-3 space-y-3">
                  <RoleCounter label="Senior Business" value={team.seniorBusiness} onMinus={() => updateTeam("seniorBusiness", -1)} onPlus={() => updateTeam("seniorBusiness", 1)} />
                  <RoleCounter label="Junior Business" value={team.juniorBusiness} onMinus={() => updateTeam("juniorBusiness", -1)} onPlus={() => updateTeam("juniorBusiness", 1)} />
                  <RoleCounter label="Executive Assistant" value={team.ea} onMinus={() => updateTeam("ea", -1)} onPlus={() => updateTeam("ea", 1)} />
                </div>
              </div>
            </div>
          </div>
          <Button className="mt-4" onClick={saveTeam} disabled={savingSection === "team"}>
            Save team
          </Button>
        </Section>

        <Section title="Compensation & rates">
          <div className="flex flex-wrap gap-3">
            <Button
              variant={salaryMode === "annual" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSalaryModeChange("annual")}
            >
              Annual
            </Button>
            <Button
              variant={salaryMode === "hourly" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSalaryModeChange("hourly")}
            >
              Hourly
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {salaryMode === "annual" ? "Annual Salary" : "Hourly Rate"}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <span>$</span>
                <input
                  value={salaryValue}
                  onChange={(event) => setSalaryValue(event.target.value)}
                  className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {salaryMode === "annual"
                  ? `= ${formatCurrency(annualSalary ? annualSalary / 2080 : null, currency, 2)} / hr`
                  : `= ${formatCurrency(annualSalary, currency)} / yr`}
              </p>
            </div>
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
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Equity %
              </label>
              <input
                value={equityPercentage}
                onChange={(event) => setEquityPercentage(event.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Vesting (years)
              </label>
              <input
                value={vestingPeriod}
                onChange={(event) => setVestingPeriod(event.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <RateInput label="Senior Engineering" value={rates.seniorEngineeringRate} onChange={(value) => setRates((prev) => ({ ...prev, seniorEngineeringRate: value }))} />
            <RateInput label="Senior Business" value={rates.seniorBusinessRate} onChange={(value) => setRates((prev) => ({ ...prev, seniorBusinessRate: value }))} />
            <RateInput label="Junior Engineering" value={rates.juniorEngineeringRate} onChange={(value) => setRates((prev) => ({ ...prev, juniorEngineeringRate: value }))} />
            <RateInput label="Junior Business" value={rates.juniorBusinessRate} onChange={(value) => setRates((prev) => ({ ...prev, juniorBusinessRate: value }))} />
            <RateInput label="Executive Assistant" value={rates.eaRate} onChange={(value) => setRates((prev) => ({ ...prev, eaRate: value }))} />
          </div>
          <Button className="mt-4" onClick={saveCompensation} disabled={savingSection === "comp"}>
            Save compensation
          </Button>
        </Section>

        <Section title="Subscription">
          {subscription ? (
            <div className="space-y-2 text-sm">
              <p>Plan: {subscription.tier}</p>
              <p>Status: {subscription.status}</p>
              <p>Next billing: {formatDate(subscription.currentPeriodEnd)}</p>
              <p>
                LLM budget: ${(subscription.llmSpentCents / 100).toFixed(2)} / ${(subscription.llmBudgetCents / 100).toFixed(2)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Free plan</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={openPortal}>
              Manage subscription
            </Button>
            {!subscription && (
              <Button asChild>
                <Link href="/">Upgrade</Link>
              </Button>
            )}
          </div>
        </Section>

        <Section title="BYOK management">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={byokForm.provider}
              onChange={(event) => setByokForm((prev) => ({ ...prev, provider: event.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
            </select>
            <input
              value={byokForm.apiKey}
              onChange={(event) => setByokForm((prev) => ({ ...prev, apiKey: event.target.value }))}
              placeholder="API key"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <select
              value={byokForm.priority}
              onChange={(event) => setByokForm((prev) => ({ ...prev, priority: event.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="byok_first">BYOK First</option>
              <option value="budget_first">Budget First</option>
              <option value="byok_premium_only">BYOK Premium Only</option>
            </select>
          </div>
          <Button className="mt-3" onClick={handleByokSave} disabled={savingSection === "byok"}>
            Save key
          </Button>

          <div className="mt-4 space-y-3">
            {byokList.length === 0 && (
              <p className="text-sm text-muted-foreground">No keys saved yet.</p>
            )}
            {byokList.map((key) => (
              <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{key.provider}</p>
                  <p className="text-xs text-muted-foreground">{key.masked}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={key.priority}
                    onChange={(event) => handleByokPriority(key.provider, event.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="byok_first">BYOK First</option>
                    <option value="budget_first">Budget First</option>
                    <option value="byok_premium_only">BYOK Premium Only</option>
                  </select>
                  <Button size="sm" variant="outline" onClick={() => handleByokDelete(key.provider)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Calendar connection">
          <div className="text-sm text-muted-foreground">
            {calendarConnection ? (
              <div className="space-y-1">
                <p>Connected as {calendarConnection.email}</p>
                <p>
                  {calendarConnection.hasWriteAccess
                    ? "Read + Write access"
                    : "Read-only access"}
                </p>
              </div>
            ) : (
              <p>No calendar connected.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() =>
                signIn(
                  "google",
                  { callbackUrl: "/settings" },
                  {
                    prompt: "consent",
                    access_type: "offline",
                    scope:
                      "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
                  }
                )
              }
            >
              Upgrade to write access
            </Button>
            <Button variant="outline" onClick={handleCalendarDisconnect}>
              Disconnect
            </Button>
          </div>
        </Section>

        <Section title="Audit schedule">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <label className="flex items-center justify-between gap-2">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={scheduleState.enabled}
                onChange={(event) => {
                  const next = { ...scheduleState, enabled: event.target.checked };
                  setScheduleState(next);
                  void handleScheduleSave(next);
                }}
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>Frequency</span>
              <select
                value={scheduleState.frequency}
                onChange={(event) => {
                  const next = { ...scheduleState, frequency: event.target.value };
                  setScheduleState(next);
                  void handleScheduleSave(next);
                }}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>Week starts</span>
              <select
                value={scheduleState.dayOfWeek}
                onChange={(event) => {
                  const next = {
                    ...scheduleState,
                    dayOfWeek: Number(event.target.value),
                  };
                  setScheduleState(next);
                  void handleScheduleSave(next);
                }}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>Run time</span>
              <select
                value={scheduleState.hour}
                onChange={(event) => {
                  const next = { ...scheduleState, hour: Number(event.target.value) };
                  setScheduleState(next);
                  void handleScheduleSave(next);
                }}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>Timezone</span>
              <select
                value={scheduleState.timezone}
                onChange={(event) => {
                  const next = { ...scheduleState, timezone: event.target.value };
                  setScheduleState(next);
                  void handleScheduleSave(next);
                }}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                {TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>Next run</span>
              <span className="text-xs">{formatDate(scheduleState.nextRunAt)}</span>
            </label>
          </div>
          {savingSection === "schedule" && (
            <p className="mt-2 text-xs text-muted-foreground">Saving schedule...</p>
          )}
        </Section>

        <Section title="Notifications">
          <div className="space-y-3 text-sm">
            <ToggleRow
              label="Email: Audit ready"
              checked={notificationPrefs.email_audit_ready}
              onChange={(checked) =>
                setNotificationPrefs((prev) => ({ ...prev, email_audit_ready: checked }))
              }
            />
            <ToggleRow
              label="Email: Weekly digest"
              checked={notificationPrefs.email_weekly_digest}
              onChange={(checked) =>
                setNotificationPrefs((prev) => ({ ...prev, email_weekly_digest: checked }))
              }
            />
            <ToggleRow
              label="In-app: Audit ready"
              checked={notificationPrefs.in_app_audit_ready}
              onChange={(checked) =>
                setNotificationPrefs((prev) => ({ ...prev, in_app_audit_ready: checked }))
              }
            />
          </div>
          <Button className="mt-3" onClick={saveNotifications} disabled={savingSection === "notifications"}>
            Save notifications
          </Button>
        </Section>

        <Section title="Data & privacy">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href="/api/export/json">Export (JSON)</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/export/markdown">Export (Markdown)</a>
            </Button>
            <Button variant="outline" onClick={handleDeleteAccount}>
              Delete account
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-semibold">Shared reports</h4>
            {sharedReportState.length === 0 && (
              <p className="text-sm text-muted-foreground">No shared reports.</p>
            )}
            {sharedReportState.map((report) => (
              <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{report.shareToken}</p>
                  <p className="text-xs text-muted-foreground">Created: {formatDate(report.createdAt)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => revokeShare(report.id)} disabled={Boolean(report.revokedAt)}>
                  {report.revokedAt ? "Revoked" : "Revoke"}
                </Button>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Contacts">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="Invite by email"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button onClick={inviteContact} disabled={savingSection === "contacts"}>
              Send invite
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="font-semibold">Pending invites sent</p>
              {contactSent.length === 0 ? (
                <p className="text-muted-foreground">No pending invites.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {contactSent.map((invite) => (
                    <li key={invite.id}>{invite.email}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="font-semibold">Invites received</p>
              {contactReceived.length === 0 ? (
                <p className="text-muted-foreground">No invites yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {contactReceived.map((invite) => (
                    <li key={invite.id} className="flex items-center justify-between gap-2">
                      <span>{invite.email}</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => respondContact(invite.id, "accept")}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respondContact(invite.id, "decline")}>
                          Decline
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <p className="font-semibold">Connected contacts</p>
            {contactAccepted.length === 0 ? (
              <p className="text-muted-foreground">No contacts connected yet.</p>
            ) : (
              <ul className="space-y-1">
                {contactAccepted.map((contact) => (
                  <li key={contact.id}>{contact.name || contact.email}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <ToggleRow
              label="Share scores with contacts"
              checked={privacy.shareScores}
              onChange={(checked) => setPrivacy((prev) => ({ ...prev, shareScores: checked }))}
            />
            <ToggleRow
              label="Anonymous mode"
              checked={privacy.anonymousMode}
              onChange={(checked) => setPrivacy((prev) => ({ ...prev, anonymousMode: checked }))}
            />
            <Button onClick={savePrivacy} disabled={savingSection === "privacy"}>
              Save privacy
            </Button>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold">Leaderboard</h4>
            {contacts.leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts to rank yet.</p>
            ) : (
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <LeaderboardPanel
                  title="Efficiency"
                  entries={leaderboardGroups.efficiency}
                  formatter={formatPercent}
                />
                <LeaderboardPanel
                  title="Planning"
                  entries={leaderboardGroups.planning}
                  formatter={formatPercent}
                />
                <LeaderboardPanel
                  title="Improvement"
                  entries={leaderboardGroups.improvement}
                  formatter={formatDelta}
                />
              </div>
            )}
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function LeaderboardPanel({
  title,
  entries,
  formatter,
}: {
  title: string;
  entries: Array<{ id: string; name: string; value: number | null }>;
  formatter: (value: number | null) => string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      {entries.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No data.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2"
            >
              <span>
                {index + 1}. {entry.name}
              </span>
              <span>{formatter(entry.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
