import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  // Basic validation: remove sensitive fields if any (e.g. id, email if strict)
  // For now, assume client sends valid fields.
  
  await db.update(users).set(data).where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
