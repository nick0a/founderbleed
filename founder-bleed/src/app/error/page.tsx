import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Sign-in error</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Something went wrong during authentication. Please try again.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/signin">Return to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
