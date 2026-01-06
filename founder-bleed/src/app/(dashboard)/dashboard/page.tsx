import { Suspense } from 'react';
import DashboardClient from './dashboard-client';

// Force dynamic rendering to avoid prerendering errors with client-side hooks
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <DashboardClient />
    </Suspense>
  );
}
