import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { reportAccessLog, sharedReports } from "@/lib/db/schema";

export default async function ShareVerifyPage({
  params,
}: {
  params: { token: string };
}) {
  const access = await db.query.reportAccessLog.findFirst({
    where: eq(reportAccessLog.verificationToken, params.token),
  });

  if (!access) {
    notFound();
  }

  await db
    .update(reportAccessLog)
    .set({ emailVerified: true })
    .where(eq(reportAccessLog.id, access.id));

  const sharedReport = await db.query.sharedReports.findFirst({
    where: eq(sharedReports.id, access.sharedReportId),
  });

  if (!sharedReport) {
    notFound();
  }

  redirect(`/share/${sharedReport.shareToken}?verified=true`);
}
