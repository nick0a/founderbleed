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

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFERENCES = {
  email_audit_ready: true,
  email_weekly_digest: true,
  in_app_audit_ready: true,
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      name: true,
      username: true,
      email: true,
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
      // Notification preferences
      notificationPreferences: true,
    }
  });

  // Merge with defaults for calendar settings
  const calendarSettings = {
    ...DEFAULT_CALENDAR_SETTINGS,
    ...(user?.settings as Record<string, unknown> || {}),
  };

  // Merge with defaults for notification preferences
  const notificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(user?.notificationPreferences as Record<string, boolean> || {}),
  };

  return NextResponse.json({
    user,
    calendarSettings,
    notificationPreferences,
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
    columns: { settings: true, notificationPreferences: true },
  });

  // Merge calendar settings with existing settings
  const updatedSettings = {
    ...(currentUser?.settings as Record<string, unknown> || {}),
    ...(data.calendarSettings || {}),
  };

  // Merge notification preferences
  const updatedNotificationPreferences = {
    ...(currentUser?.notificationPreferences as Record<string, boolean> || {}),
    ...(data.notificationPreferences || {}),
  };

  // Build update object - only include fields that are provided
  const updateData: Record<string, unknown> = {
    // Calendar settings (merged)
    settings: updatedSettings,
    // Notification preferences (merged)
    notificationPreferences: updatedNotificationPreferences,
  };

  // Account info (only update if provided)
  if (data.name !== undefined) updateData.name = data.name;
  if (data.username !== undefined) updateData.username = data.username;

  // Compensation
  if (data.salaryAnnual !== undefined) updateData.salaryAnnual = data.salaryAnnual || null;
  if (data.salaryInputMode !== undefined) updateData.salaryInputMode = data.salaryInputMode || 'annual';
  if (data.currency !== undefined) updateData.currency = data.currency || 'USD';

  // Team composition
  if (data.teamComposition !== undefined) updateData.teamComposition = data.teamComposition || {};

  // Equity
  if (data.companyValuation !== undefined) updateData.companyValuation = data.companyValuation || null;
  if (data.equityPercentage !== undefined) updateData.equityPercentage = data.equityPercentage || null;
  if (data.vestingPeriodYears !== undefined) updateData.vestingPeriodYears = data.vestingPeriodYears || '4';

  // Founder tier rates
  if (data.founderUniversalRate !== undefined) updateData.founderUniversalRate = data.founderUniversalRate || '200000';
  if (data.founderEngineeringRate !== undefined) updateData.founderEngineeringRate = data.founderEngineeringRate || '180000';
  if (data.founderBusinessRate !== undefined) updateData.founderBusinessRate = data.founderBusinessRate || '160000';

  // Senior tier rates
  if (data.seniorUniversalRate !== undefined) updateData.seniorUniversalRate = data.seniorUniversalRate || '120000';
  if (data.seniorEngineeringRate !== undefined) updateData.seniorEngineeringRate = data.seniorEngineeringRate || '100000';
  if (data.seniorBusinessRate !== undefined) updateData.seniorBusinessRate = data.seniorBusinessRate || '80000';

  // Junior tier rates
  if (data.juniorUniversalRate !== undefined) updateData.juniorUniversalRate = data.juniorUniversalRate || '50000';
  if (data.juniorEngineeringRate !== undefined) updateData.juniorEngineeringRate = data.juniorEngineeringRate || '40000';
  if (data.juniorBusinessRate !== undefined) updateData.juniorBusinessRate = data.juniorBusinessRate || '50000';

  // Support tier rates
  if (data.eaRate !== undefined) updateData.eaRate = data.eaRate || '25000';

  await db.update(users)
    .set(updateData)
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}