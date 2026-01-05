import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns } from "@/lib/db/schema";
import { getActiveSubscription } from "@/lib/subscription";

export default async function PostAuthPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const subscription = await getActiveSubscription(session.user.id);
  if (subscription) {
    redirect("/dashboard");
  }

  const latestAudit = await db.query.auditRuns.findFirst({
    where: and(
      eq(auditRuns.userId, session.user.id),
      eq(auditRuns.status, "COMPLETED")
    ),
    orderBy: [desc(auditRuns.completedAt), desc(auditRuns.createdAt)],
  });

  if (latestAudit) {
    redirect(`/results/${latestAudit.id}`);
  }

  redirect("/processing");
}
