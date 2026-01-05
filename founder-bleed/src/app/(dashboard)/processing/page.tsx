import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import ProcessingClient from "./processing-client";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function ProcessingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    redirect("/signin");
  }

  const team = (user.teamComposition || {}) as Record<string, number>;

  return (
    <ProcessingClient
      initialTeam={{
        founder: Number(team.founder || 1),
        seniorEngineering: Number(team.seniorEngineering || 0),
        juniorEngineering: Number(team.juniorEngineering || 0),
        qaEngineering: Number(team.qaEngineering || 0),
        seniorBusiness: Number(team.seniorBusiness || 0),
        juniorBusiness: Number(team.juniorBusiness || 0),
        ea: Number(team.ea || 0),
      }}
      initialSalaryAnnual={toNumber(user.salaryAnnual)}
      initialSalaryMode={
        user.salaryInputMode === "hourly" ? "hourly" : "annual"
      }
      initialCurrency={user.currency || "USD"}
      initialCompanyValuation={toNumber(user.companyValuation)}
      initialEquityPercentage={toNumber(user.equityPercentage)}
      initialVestingPeriodYears={toNumber(user.vestingPeriodYears)}
      initialRates={{
        seniorEngineeringRate: Number(user.seniorEngineeringRate || 100000),
        seniorBusinessRate: Number(user.seniorBusinessRate || 100000),
        juniorEngineeringRate: Number(user.juniorEngineeringRate || 50000),
        juniorBusinessRate: Number(user.juniorBusinessRate || 50000),
        eaRate: Number(user.eaRate || 30000),
      }}
    />
  );
}
