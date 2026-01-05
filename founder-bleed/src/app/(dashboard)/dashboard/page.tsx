import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getActiveSubscription } from '@/lib/subscription';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  // Fetch audits
  const audits = await db.query.auditRuns.findMany({
    where: eq(auditRuns.userId, session.user.id),
    orderBy: [desc(auditRuns.createdAt)],
    limit: 5
  });

  const latestAudit = audits[0];
  const previousAudit = audits[1];

  const subscription = await getActiveSubscription(session.user.id);
  const isSubscribed = subscription && subscription.status === 'active';

  // Calculate trends
  const currentEfficiency = (latestAudit?.computedMetrics as any)?.efficiencyScore || 0;
  const previousEfficiency = (previousAudit?.computedMetrics as any)?.efficiencyScore || 0;
  const trend = currentEfficiency - previousEfficiency;
  
  const planningScore = latestAudit?.planningScore || 0;
  const reclaimable = (latestAudit?.computedMetrics as any)?.reclaimableHours || 0;
  const arbitrage = (latestAudit?.computedMetrics as any)?.arbitrage || 0;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
            <Link href="/planning"><Button variant="outline">Planning Assistant</Button></Link>
            <Link href="/processing"><Button>Run New Audit</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Efficiency Score</CardTitle></CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{currentEfficiency}%</div>
                {previousAudit && (
                    <div className={`text-xs ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last audit
                    </div>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Planning Score</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{planningScore}%</div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Reclaimable Hours</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{reclaimable} hrs/mo</div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Potential Savings</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">${arbitrage.toLocaleString()} / yr</div></CardContent>
        </Card>
      </div>

      {/* Recent Audits */}
      <Card>
          <CardHeader><CardTitle>Recent Audits</CardTitle></CardHeader>
          <CardContent>
              <div className="space-y-2">
                  {audits.map(audit => (
                      <div key={audit.id} className="flex justify-between items-center border p-3 rounded hover:bg-muted/50 transition-colors">
                          <div>
                              <div className="font-bold">{new Date(audit.createdAt!).toLocaleDateString()}</div>
                              <div className="text-sm text-muted-foreground">Score: {(audit.computedMetrics as any)?.efficiencyScore}%</div>
                          </div>
                          <Link href={`/results/${audit.id}`}><Button variant="ghost" size="sm">View Results</Button></Link>
                      </div>
                  ))}
                  {audits.length === 0 && <div className="text-muted-foreground text-center py-4">No audits found. Run your first audit to see results.</div>}
              </div>
          </CardContent>
      </Card>
      
      {!isSubscribed && (
          <div className="bg-primary/10 border border-primary p-6 rounded-lg flex justify-between items-center">
              <div>
                  <h3 className="font-bold text-lg">Unlock Automated Audits</h3>
                  <p className="text-sm">Get weekly insights and AI planning assistance.</p>
              </div>
              <Button>Subscribe Now</Button>
          </div>
      )}
    </div>
  );
}
