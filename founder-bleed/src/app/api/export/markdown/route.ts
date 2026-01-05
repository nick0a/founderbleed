import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns, events, users } from "@/lib/db/schema";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return "";
  }
}

function formatDate(date: Date | null) {
  if (!date) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const audits = await db.query.auditRuns.findMany({
    where: eq(auditRuns.userId, session.user.id),
    orderBy: [desc(auditRuns.createdAt)],
  });

  const latestAudit = audits[0];
  const latestEvents = latestAudit
    ? await db.query.events.findMany({
        where: eq(events.auditRunId, latestAudit.id),
      })
    : [];

  const metrics = (latestAudit?.computedMetrics || {}) as {
    totalHours?: number;
    efficiencyScore?: number;
    hoursByTier?: Record<string, number>;
  };

  const markdown = `# Founder Bleed Data Export
Exported: ${new Date().toLocaleDateString("en-US")}

## Summary
- Total Audits: ${audits.length}
- Latest Efficiency Score: ${Math.round(metrics.efficiencyScore || 0)}%
- Latest Planning Score: ${Math.round(Number(latestAudit?.planningScore || 0))}%

## Latest Audit (${formatDate(latestAudit?.startDate || null)} - ${formatDate(
    latestAudit?.endDate || null
  )})
### Metrics
- Total Hours: ${Math.round(metrics.totalHours || 0)}
- Unique: ${Math.round(metrics.hoursByTier?.unique || 0)}h
- Founder: ${Math.round(metrics.hoursByTier?.founder || 0)}h
- Senior: ${Math.round(metrics.hoursByTier?.senior || 0)}h
- Junior: ${Math.round(metrics.hoursByTier?.junior || 0)}h
- EA: ${Math.round(metrics.hoursByTier?.ea || 0)}h

### Events
${latestEvents
  .slice(0, 20)
  .map((event) => `- ${safeDecrypt(event.title) || "Untitled"} (${event.finalTier || "SENIOR"})`)
  .join("\n")}
`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": "attachment; filename=founder-bleed-export.md",
    },
  });
}
