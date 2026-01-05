import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns, events, users } from "@/lib/db/schema";
import { decrypt } from "@/lib/encryption";

import TriageClient from "./triage-client";

function safeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return "";
  }
}

export default async function TriagePage({
  params,
}: {
  params: { auditId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const audit = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, params.auditId),
  });

  if (!audit) {
    notFound();
  }

  if (audit.userId && audit.userId !== session.user.id) {
    notFound();
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    notFound();
  }

  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, params.auditId),
  });

  const teamComposition = (user.teamComposition || {}) as Record<string, number>;
  const founderCount = Number(teamComposition.founder || 0);
  const hasOtherRoles = Object.entries(teamComposition).some(
    ([key, value]) => key !== "founder" && Number(value) > 0
  );
  const isSoloFounder = founderCount === 1 && !hasOtherRoles;

  const eventsForClient = auditEvents.map((event) => ({
    id: event.id,
    title: safeDecrypt(event.title) || "Untitled",
    startAt: event.startAt ? event.startAt.toISOString() : null,
    durationMinutes: event.durationMinutes || 0,
    suggestedTier: event.suggestedTier || null,
    finalTier: event.finalTier || null,
    reconciled: event.reconciled || false,
    isLeave: event.isLeave || false,
    leaveConfidence: event.leaveConfidence || null,
    leaveDetectionMethod: event.leaveDetectionMethod || null,
  }));

  return (
    <TriageClient
      auditId={audit.id}
      events={eventsForClient}
      isSoloFounder={isSoloFounder}
    />
  );
}
