import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Default calendar settings
const DEFAULT_CALENDAR_SETTINGS = {
  calendarViewDays: 7, // 1, 3, 5, 6, 7
  plannableDays: [1, 2, 3, 4, 5], // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat (default: Mon-Fri)
  exclusions: ['lunch', 'gym'],
  timezone: 'Asia/Singapore',
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      salaryAnnual: true,
      salaryInputMode: true,
      currency: true,
      // Team composition
      teamComposition: true,
      // Equity
      companyValuation: true,
      equityPercentage: true,
      vestingPeriodYears: true,
      // Founder tier rates
      founderUniversalRate: true,
      founderEngineeringRate: true,
      founderBusinessRate: true,
      // Senior tier rates
      seniorUniversalRate: true,
      seniorEngineeringRate: true,
      seniorBusinessRate: true,
      // Junior tier rates
      juniorUniversalRate: true,
      juniorEngineeringRate: true,
      juniorBusinessRate: true,
      // Support tier rates
      eaRate: true,
      // Calendar settings
      settings: true,
    }
  });

  // Merge with defaults for calendar settings
  const calendarSettings = {
    ...DEFAULT_CALENDAR_SETTINGS,
    ...(user?.settings as Record<string, unknown> || {}),
  };

  return NextResponse.json({
    ...user,
    calendarSettings,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  // Get current settings to merge calendar settings
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { settings: true },
  });

  // Merge calendar settings with existing settings
  const updatedSettings = {
    ...(currentUser?.settings as Record<string, unknown> || {}),
    ...(data.calendarSettings || {}),
  };

  await db.update(users)
    .set({
      salaryAnnual: data.salaryAnnual || null,
      salaryInputMode: data.salaryInputMode || 'annual',
      currency: data.currency || 'USD',
      // Team composition
      teamComposition: data.teamComposition || {},
      // Equity
      companyValuation: data.companyValuation || null,
      equityPercentage: data.equityPercentage || null,
      vestingPeriodYears: data.vestingPeriodYears || '4',
      // Founder tier rates
      founderUniversalRate: data.founderUniversalRate || '200000',
      founderEngineeringRate: data.founderEngineeringRate || '180000',
      founderBusinessRate: data.founderBusinessRate || '160000',
      // Senior tier rates
      seniorUniversalRate: data.seniorUniversalRate || '120000',
      seniorEngineeringRate: data.seniorEngineeringRate || '100000',
      seniorBusinessRate: data.seniorBusinessRate || '80000',
      // Junior tier rates
      juniorUniversalRate: data.juniorUniversalRate || '50000',
      juniorEngineeringRate: data.juniorEngineeringRate || '40000',
      juniorBusinessRate: data.juniorBusinessRate || '50000',
      // Support tier rates
      eaRate: data.eaRate || '25000',
      // Calendar settings (merged)
      settings: updatedSettings,
    })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}