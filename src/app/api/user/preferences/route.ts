import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/user/preferences - Get user preferences
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await db
      .select({
        teamComposition: users.teamComposition,
        salaryAnnual: users.salaryAnnual,
        salaryInputMode: users.salaryInputMode,
        currency: users.currency,
        companyValuation: users.companyValuation,
        equityPercentage: users.equityPercentage,
        vestingPeriodYears: users.vestingPeriodYears,
        seniorEngineeringRate: users.seniorEngineeringRate,
        seniorBusinessRate: users.seniorBusinessRate,
        juniorEngineeringRate: users.juniorEngineeringRate,
        juniorBusinessRate: users.juniorBusinessRate,
        eaRate: users.eaRate,
        settings: users.settings,
        qaProgress: users.qaProgress,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      teamComposition: user.teamComposition,
      salaryAnnual: user.salaryAnnual ? Number(user.salaryAnnual) : null,
      salaryInputMode: user.salaryInputMode,
      currency: user.currency,
      companyValuation: user.companyValuation ? Number(user.companyValuation) : null,
      equityPercentage: user.equityPercentage ? Number(user.equityPercentage) : null,
      vestingPeriodYears: user.vestingPeriodYears ? Number(user.vestingPeriodYears) : null,
      tierRates: {
        senior_engineering: user.seniorEngineeringRate ? Number(user.seniorEngineeringRate) : 100000,
        senior_business: user.seniorBusinessRate ? Number(user.seniorBusinessRate) : 100000,
        junior_engineering: user.juniorEngineeringRate ? Number(user.juniorEngineeringRate) : 50000,
        junior_business: user.juniorBusinessRate ? Number(user.juniorBusinessRate) : 50000,
        ea: user.eaRate ? Number(user.eaRate) : 30000,
      },
      settings: user.settings,
      qaProgress: user.qaProgress,
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user/preferences - Update user preferences
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      teamComposition,
      salaryAnnual,
      salaryInputMode,
      currency,
      companyValuation,
      equityPercentage,
      vestingPeriodYears,
      tierRates,
      settings,
      qaProgress,
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (teamComposition !== undefined) {
      updateData.teamComposition = teamComposition;
    }

    if (salaryAnnual !== undefined) {
      updateData.salaryAnnual = salaryAnnual?.toString() || null;
    }

    if (salaryInputMode !== undefined) {
      updateData.salaryInputMode = salaryInputMode;
    }

    if (currency !== undefined) {
      updateData.currency = currency;
    }

    if (companyValuation !== undefined) {
      updateData.companyValuation = companyValuation?.toString() || null;
    }

    if (equityPercentage !== undefined) {
      updateData.equityPercentage = equityPercentage?.toString() || null;
    }

    if (vestingPeriodYears !== undefined) {
      updateData.vestingPeriodYears = vestingPeriodYears?.toString() || null;
    }

    if (tierRates !== undefined) {
      if (tierRates.senior_engineering !== undefined) {
        updateData.seniorEngineeringRate = tierRates.senior_engineering?.toString() || '100000';
      }
      if (tierRates.senior_business !== undefined) {
        updateData.seniorBusinessRate = tierRates.senior_business?.toString() || '100000';
      }
      if (tierRates.junior_engineering !== undefined) {
        updateData.juniorEngineeringRate = tierRates.junior_engineering?.toString() || '50000';
      }
      if (tierRates.junior_business !== undefined) {
        updateData.juniorBusinessRate = tierRates.junior_business?.toString() || '50000';
      }
      if (tierRates.ea !== undefined) {
        updateData.eaRate = tierRates.ea?.toString() || '30000';
      }
    }

    if (settings !== undefined) {
      updateData.settings = settings;
    }

    if (qaProgress !== undefined) {
      updateData.qaProgress = qaProgress;
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id))
      .returning({
        id: users.id,
        teamComposition: users.teamComposition,
        salaryAnnual: users.salaryAnnual,
        salaryInputMode: users.salaryInputMode,
        currency: users.currency,
      });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        teamComposition: updatedUser.teamComposition,
        salaryAnnual: updatedUser.salaryAnnual ? Number(updatedUser.salaryAnnual) : null,
        salaryInputMode: updatedUser.salaryInputMode,
        currency: updatedUser.currency,
      },
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
