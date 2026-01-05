import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scheduledAudits } from '@/lib/db/schema';
import { and, eq, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find due audits
  const dueAudits = await db.query.scheduledAudits.findMany({
    where: and(
      eq(scheduledAudits.enabled, true),
      lte(scheduledAudits.nextRunAt, new Date())
    )
  });

  // Mock processing for MVP
  // In real app: loop, check leave, call audit create, update nextRunAt, notify.
  
  return NextResponse.json({ processed: dueAudits.length });
}
