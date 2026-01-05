import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

type ProfilePayload = {
  name?: string;
  username?: string;
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
  notificationPreferences?: {
    email_audit_ready?: boolean;
    email_weekly_digest?: boolean;
    in_app_audit_ready?: boolean;
  };
  settings?: {
    privacy?: {
      shareScores?: boolean;
      anonymousMode?: boolean;
    };
  };
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumericString(value: unknown): string | null {
  const parsed = toNumber(value);
  return parsed === null ? null : String(parsed);
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

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!currentUser) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  if (payload.name !== undefined) {
    updates.name = payload.name?.trim() || null;
  }

  if (payload.username !== undefined) {
    updates.username = payload.username?.trim() || null;
  }

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
    updates.companyValuation = toNumericString(payload.companyValuation);
  }

  if (payload.equityPercentage !== undefined) {
    updates.equityPercentage = toNumericString(payload.equityPercentage);
  }

  if (payload.vestingPeriodYears !== undefined) {
    updates.vestingPeriodYears = toNumericString(payload.vestingPeriodYears);
  }

  if (payload.seniorEngineeringRate !== undefined) {
    updates.seniorEngineeringRate = toNumericString(payload.seniorEngineeringRate);
  }

  if (payload.seniorBusinessRate !== undefined) {
    updates.seniorBusinessRate = toNumericString(payload.seniorBusinessRate);
  }

  if (payload.juniorEngineeringRate !== undefined) {
    updates.juniorEngineeringRate = toNumericString(payload.juniorEngineeringRate);
  }

  if (payload.juniorBusinessRate !== undefined) {
    updates.juniorBusinessRate = toNumericString(payload.juniorBusinessRate);
  }

  if (payload.eaRate !== undefined) {
    updates.eaRate = toNumericString(payload.eaRate);
  }

  if (payload.notificationPreferences) {
    updates.notificationPreferences = {
      ...(currentUser.notificationPreferences as Record<string, unknown> | null),
      ...payload.notificationPreferences,
    };
  }

  if (payload.settings?.privacy) {
    const existingSettings = (currentUser.settings || {}) as Record<string, unknown>;
    const existingPrivacy = (existingSettings.privacy || {}) as Record<string, unknown>;
    updates.settings = {
      ...existingSettings,
      privacy: {
        ...existingPrivacy,
        ...payload.settings.privacy,
      },
    };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  await db.update(users).set(updates).where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
