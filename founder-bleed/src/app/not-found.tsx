// This file is required to prevent prerendering errors with client providers
// Next.js 14+ auto-generates a /_not-found page that can fail when wrapped in client providers

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
      <a
        href="/"
        className="text-primary hover:underline"
      >
        Go back home
      </a>
    </div>
  );
}