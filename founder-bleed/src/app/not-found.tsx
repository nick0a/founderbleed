// This file is required to prevent prerendering errors with client providers
// Next.js 14+ auto-generates a /_not-found page that can fail when wrapped in client providers

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="text-primary hover:underline"
      >
        Go back home
      </Link>
    </div>
  );
}