"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Founder Bleed
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Read-only access (for audits). We never modify, create, or delete
          events. If you sign up for AI Planning, we will request additional
          permissions then.
        </p>
        <Button
          className="mt-6 w-full"
          onClick={() => signIn("google", { callbackUrl: "/post-auth" })}
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
