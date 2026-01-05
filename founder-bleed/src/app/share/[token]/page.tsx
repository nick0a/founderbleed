import { db } from '@/lib/db';
import { sharedReports, roleRecommendations, auditRuns, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import ResultsClient from '@/app/(dashboard)/results/[id]/results-client';

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Find shared report
  const report = await db.query.sharedReports.findFirst({
    where: eq(sharedReports.shareToken, token)
  });

  if (!report) notFound();

  // Check expiry
  if (report.expiresAt && report.expiresAt < new Date()) {
      return <div>Report expired</div>;
  }

  // Fetch audit run
  const auditRun = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, report.auditRunId!)
  });

  if (!auditRun) notFound();

  // Fetch user (owner)
  const owner = await db.query.users.findFirst({
    where: eq(users.id, report.ownerUserId!)
  });

  if (!owner) notFound();

  // Fetch recommendations
  const recs = await db.query.roleRecommendations.findMany({
    where: eq(roleRecommendations.auditRunId, auditRun.id)
  });

  // Filter sensitive data
  const safeUser = {
      name: owner.name,
      username: owner.username,
      currency: owner.currency,
      salaryAnnual: null,
      salaryInputMode: null
  };

  const safeAuditRun = {
      ...auditRun,
      computedMetrics: {
          ...((auditRun.computedMetrics as any) || {}),
          founderCostTotal: null,
          delegatedCostTotal: null,
          arbitrage: null
      }
  };

  return (
    <div>
        <div className="bg-muted p-2 text-center text-sm border-b">
            Viewing shared report for {safeUser.name || safeUser.username}
        </div>
        <ResultsClient 
            auditRun={safeAuditRun}
            user={safeUser}
            events={[]} 
            recommendations={recs}
        />
    </div>
  );
}
