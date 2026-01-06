import { Suspense } from 'react';
import SettingsClient from './settings-client';

// Force dynamic rendering to avoid prerendering errors with client-side hooks
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <SettingsClient />
    </Suspense>
  );
}
