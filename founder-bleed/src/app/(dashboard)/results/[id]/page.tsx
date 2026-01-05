import ResultsClient from './results-client';

// Force dynamic rendering to avoid prerendering errors with client-side hooks
export const dynamic = 'force-dynamic';

export default function ResultsPage() {
  return <ResultsClient />;
}
