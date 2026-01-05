'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  ArrowRight,
  Settings,
  Home,
  Sparkles
} from 'lucide-react';

interface AuditRun {
  id: string;
  dateStart: string;
  dateEnd: string;
  status: string;
  planningScore: number | null;
  createdAt: string;
  computedMetrics: {
    totalHours: number;
    efficiencyScore: number;
    reclaimableHoursPerWeek: number;
  } | null;
}

export default function DashboardClient() {
  const [audits, setAudits] = useState<AuditRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const response = await fetch('/api/audits');
        if (response.ok) {
          const data = await response.json();
          setAudits(data.audits || []);
        }
      } catch (err) {
        console.error('Failed to fetch audits:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAudits();
  }, []);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between border-b pb-4 -mt-4 mb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/planning">
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Planning
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            View your calendar audits and insights
          </p>
        </div>
        <Link href="/audit/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Audit
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      {audits.length > 0 && audits[0].computedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Latest Reclaimable Hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {audits[0].computedMetrics.reclaimableHoursPerWeek?.toFixed(1) || '0'} hrs/week
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Latest Efficiency Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {audits[0].computedMetrics.efficiencyScore?.toFixed(0) || '0'}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Total Audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audits.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audits List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Audits</CardTitle>
          <CardDescription>
            Click on an audit to view detailed results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading audits...
            </div>
          ) : audits.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No audits yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first calendar audit to get started
              </p>
              <Link href="/audit/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Audit
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {audits.map((audit) => (
                <Link key={audit.id} href={`/results/${audit.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">
                          {new Date(audit.dateStart).toLocaleDateString()} - {new Date(audit.dateEnd).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(audit.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={audit.status === 'completed' ? 'default' : 'secondary'}>
                        {audit.status}
                      </Badge>
                      {audit.planningScore !== null && (
                        <span className="text-sm font-medium">
                          {audit.planningScore}% planning
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
