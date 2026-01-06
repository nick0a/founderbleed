import { Suspense } from 'react';
import PlanningClient from './planning-client';

// Force dynamic rendering to avoid prerendering errors with client-side hooks
export const dynamic = 'force-dynamic';

export default function PlanningPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <PlanningClient />
    </Suspense>
  );
}
