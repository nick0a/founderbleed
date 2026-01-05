import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

type ProfilePayload = {
  teamComposition?: Record<string, number>;
  salaryAnnual?: number | string | null;
  salaryInputMode?: "annual" | "hourly" | string;
  currency?: string;
  companyValuation?: number | string | null;
  equityPercentage?: number | string | null;
  vestingPeriodYears?: number | string | null;
  seniorEngineeringRate?: number | string | null;
  seniorBusinessRate?: number | string | null;
  juniorEngineeringRate?: number | string | null;
  juniorBusinessRate?: number | string | null;
  eaRate?: number | string | null;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as ProfilePayload | null;
  if (!payload) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const updates: Partial<typeof users.$inferInsert> = {};

  if (payload.teamComposition && typeof payload.teamComposition === "object") {
    updates.teamComposition = payload.teamComposition;
    const counts = Object.values(payload.teamComposition).map((value) =>
      Number.isFinite(Number(value)) ? Number(value) : 0
    );
    const teamSize = counts.reduce((sum, value) => sum + value, 0);
    const founderCount = Number(payload.teamComposition.founder || 0);
    updates.teamSize = teamSize;
    updates.teamFounders = founderCount;
  }

  if (payload.salaryInputMode === "annual" || payload.salaryInputMode === "hourly") {
    updates.salaryInputMode = payload.salaryInputMode;
  }

  if (payload.currency) {
    updates.currency = payload.currency;
  }

  if (payload.salaryAnnual !== undefined) {
    updates.salaryAnnual = toNumber(payload.salaryAnnual);
  }

  if (payload.companyValuation !== undefined) {
    updates.companyValuation = toNumber(payload.companyValuation);
  }

  if (payload.equityPercentage !== undefined) {
    updates.equityPercentage = toNumber(payload.equityPercentage);
  }

  if (payload.vestingPeriodYears !== undefined) {
    updates.vestingPeriodYears = toNumber(payload.vestingPeriodYears);
  }

  if (payload.seniorEngineeringRate !== undefined) {
    updates.seniorEngineeringRate = toNumber(payload.seniorEngineeringRate);
  }

  if (payload.seniorBusinessRate !== undefined) {
    updates.seniorBusinessRate = toNumber(payload.seniorBusinessRate);
  }

  if (payload.juniorEngineeringRate !== undefined) {
    updates.juniorEngineeringRate = toNumber(payload.juniorEngineeringRate);
  }

  if (payload.juniorBusinessRate !== undefined) {
    updates.juniorBusinessRate = toNumber(payload.juniorBusinessRate);
  }

  if (payload.eaRate !== undefined) {
    updates.eaRate = toNumber(payload.eaRate);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  await db.update(users).set(updates).where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
