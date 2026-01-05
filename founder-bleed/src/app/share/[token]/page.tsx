'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Mail, Clock, TrendingDown, Target, CheckCircle, Copy, ArrowRight } from 'lucide-react';

interface SharedReport {
  ownerName: string;
  dateStart: string;
  dateEnd: string;
  algorithmVersion: string;
  planningScore: number | null;
  planningAssessment: string | null;
  metrics: {
    totalHours: number;
    uniqueHours: number;
    founderHours: number;
    seniorHours: number;
    juniorHours: number;
    eaHours: number;
    efficiencyPercent: number;
    reclaimableHours: number;
    annualReclaimableHours: number;
    annualArbitrage: number;
    weeklyArbitrage: number;
  } | null;
  events: Array<{
    id: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    title: string;
    finalTier: string;
    businessArea: string;
    vertical: string;
    eventCategory: string;
    isLeave: boolean;
    planningScore: number;
  }>;
  roles: Array<{
    id: string;
    roleTitle: string;
    roleTier: string;
    vertical: string | null;
    businessArea: string;
    hoursPerWeek: string;
    costWeekly: string;
    costMonthly: string;
    costAnnual: string;
    jdText: string | null;
    tasksList: Array<{ task: string; hoursPerWeek: number }> | null;
  }>;
}

export default function SharePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token as string;
  const verifyToken = searchParams?.get('verify');

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  const [report, setReport] = useState<SharedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ctaUrl, setCtaUrl] = useState('/');
  const [ctaText, setCtaText] = useState('Get your own audit');
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token) {
      // If there's a verification token in URL, try to verify
      if (verifyToken) {
        fetchReport(undefined, verifyToken);
      } else {
        // Check if we have a stored verified email
        const storedEmail = localStorage.getItem(`share_verified_${token}`);
        if (storedEmail) {
          fetchReport(storedEmail);
        }
      }
    }
  }, [token, verifyToken]);

  const fetchReport = async (viewerEmail?: string, verify?: string) => {
    setIsLoading(true);
    try {
      let url = `/api/share/${token}`;
      const params = new URLSearchParams();
      if (viewerEmail) params.set('email', viewerEmail);
      if (verify) params.set('verify', verify);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setRequiresVerification(false);
      } else if (data.requiresVerification) {
        setRequiresVerification(true);
      } else if (data.report) {
        setReport(data.report);
        setRequiresVerification(false);
        setCtaUrl(data.ctaUrl || '/');
        setCtaText(data.ctaText || 'Get your own audit');
        // Store verified email for this token
        if (viewerEmail) {
          localStorage.setItem(`share_verified_${token}`, viewerEmail);
        }
      }
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/share/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken: token, email }),
      });
      const data = await response.json();

      if (data.alreadyVerified) {
        // Already verified, fetch the report
        fetchReport(email);
      } else if (data.success) {
        setVerificationSent(true);
        toast.success('Verification email sent! Check your inbox.');
      } else {
        toast.error(data.error || 'Failed to send verification');
      }
    } catch (err) {
      toast.error('Failed to send verification');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const tierColors: Record<string, string> = {
    unique: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    founder: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    senior: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    junior: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    ea: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };

  const toggleRole = (id: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Share Link Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/">Get your own audit</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email verification required
  if (requiresVerification && !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>View Shared Audit Report</CardTitle>
            <CardDescription>
              {verificationSent
                ? 'Check your email and click the verification link to view this report.'
                : 'Enter your email to access this calendar audit report.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verificationSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  We sent a verification link to <strong>{email}</strong>
                </p>
                <Button
                  variant="outline"
                  onClick={() => setVerificationSent(false)}
                >
                  Use a different email
                </Button>
              </div>
            ) : (
              <div className="space-y-4" suppressHydrationWarning>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendVerification()}
                  suppressHydrationWarning
                />
                <Button
                  className="w-full"
                  onClick={handleSendVerification}
                  disabled={isLoading}
                  suppressHydrationWarning
                >
                  {isLoading ? 'Sending...' : 'Continue'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We&apos;ll send you a verification link to access this report.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (isLoading && !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  // Report view
  if (!report) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Founder Bleed</h1>
            <p className="text-sm text-muted-foreground">
              {report.ownerName}'s Calendar Audit
            </p>
          </div>
          <Button asChild>
            <a href={ctaUrl}>
              {ctaText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Metric */}
        {report.metrics?.annualArbitrage && (
          <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <CardContent className="pt-6 text-center">
              <p className="text-lg text-muted-foreground mb-2">
                {report.ownerName} is losing
              </p>
              <p className="text-5xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(report.metrics.annualArbitrage)}/year
              </p>
              <p className="text-muted-foreground mt-2">on work that could be delegated</p>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Weekly Arbitrage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {report.metrics ? formatCurrency(report.metrics.weeklyArbitrage) : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Reclaimable Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {report.metrics ? `${Math.round(report.metrics.reclaimableHours)} hrs/week` : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Efficiency Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {report.metrics ? `${Math.round(report.metrics.efficiencyPercent)}%` : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Planning Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {report.planningScore !== null ? `${report.planningScore}%` : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Breakdown */}
        {report.metrics && (
          <Card>
            <CardHeader>
              <CardTitle>Time Breakdown by Tier</CardTitle>
              <CardDescription>
                Hours analyzed from {formatDate(report.dateStart)} to {formatDate(report.dateEnd)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { tier: 'Unique', hours: report.metrics.uniqueHours ?? 0, color: 'bg-purple-500' },
                  { tier: 'Founder', hours: report.metrics.founderHours ?? 0, color: 'bg-blue-500' },
                  { tier: 'Senior', hours: report.metrics.seniorHours ?? 0, color: 'bg-green-500' },
                  { tier: 'Junior', hours: report.metrics.juniorHours ?? 0, color: 'bg-yellow-500' },
                  { tier: 'EA', hours: report.metrics.eaHours ?? 0, color: 'bg-orange-500' },
                ].filter(({ hours }) => hours > 0).map(({ tier, hours, color }) => (
                  <div key={tier} className="flex items-center gap-4">
                    <span className="w-20 text-sm font-medium">{tier}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all`}
                        style={{
                          width: `${(hours / (report.metrics?.totalHours || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-20 text-sm text-right">
                      {hours.toFixed(1)} hrs
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Recommendations */}
        {report.roles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Role Recommendations</CardTitle>
              <CardDescription>
                Suggested roles based on delegatable work patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.roles.map((role) => (
                <Collapsible
                  key={role.id}
                  open={expandedRoles.has(role.id)}
                  onOpenChange={() => toggleRole(role.id)}
                >
                  <div className="border rounded-lg p-4">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{role.roleTitle}</span>
                          <Badge className={tierColors[role.roleTier] || ''}>
                            {role.roleTier}
                          </Badge>
                          {role.vertical && (
                            <Badge variant="outline">{role.vertical}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {Number(role.hoursPerWeek).toFixed(0)} hrs/week
                          </span>
                          <span className="text-sm font-medium">
                            {formatCurrency(Number(role.costAnnual))}/year
                          </span>
                          {expandedRoles.has(role.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 pt-4 border-t">
                      {role.tasksList && role.tasksList.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">Key Tasks:</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {role.tasksList.map((task, i) => (
                              <li key={i}>
                                {task.task} ({task.hoursPerWeek.toFixed(1)} hrs/week)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {role.jdText && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Job Description:</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(role.jdText || '');
                                toast.success('Job description copied!');
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy JD
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md max-h-60 overflow-y-auto">
                            {role.jdText}
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Event Table */}
        <Card>
          <CardHeader>
            <CardTitle>Event Breakdown</CardTitle>
            <CardDescription>
              {report.events.filter(e => !e.isLeave && e.eventCategory === 'work').length} work events analyzed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Area</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.events
                    .filter(e => !e.isLeave && e.eventCategory === 'work')
                    .slice(0, 50)
                    .map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {event.title}
                        </TableCell>
                        <TableCell>{formatDate(event.startAt)}</TableCell>
                        <TableCell className="text-right">
                          {Math.round(event.durationMinutes / 60 * 10) / 10}h
                        </TableCell>
                        <TableCell>
                          <Badge className={tierColors[event.finalTier] || ''}>
                            {event.finalTier || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {event.businessArea || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            {report.events.filter(e => !e.isLeave && e.eventCategory === 'work').length > 50 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Showing first 50 of {report.events.filter(e => !e.isLeave && e.eventCategory === 'work').length} events
              </p>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Want to audit your own calendar?</h2>
            <p className="mb-4 opacity-90">
              Discover how much of your time could be delegated and reclaim your focus.
            </p>
            <Button asChild variant="secondary" size="lg">
              <a href={ctaUrl}>
                {ctaText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Powered by Founder Bleed | Algorithm v{report.algorithmVersion}</p>
      </footer>
    </div>
  );
}
