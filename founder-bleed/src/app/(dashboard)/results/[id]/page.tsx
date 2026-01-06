import { Suspense } from 'react';
import ResultsClient from './results-client';

// Force dynamic rendering to avoid prerendering errors with client-side hooks
export const dynamic = 'force-dynamic';

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <ResultsClient />
    </Suspense>
  );
}
