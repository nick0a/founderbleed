"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function CtaButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return (
      <Button asChild className="h-12 px-8 text-sm font-semibold tracking-[0.2em]">
        <Link href="/processing">TRIAGE YOUR TIME</Link>
      </Button>
    );
  }

  return (
    <Button
      className="h-12 px-8 text-sm font-semibold tracking-[0.2em]"
      onClick={() => signIn("google", { callbackUrl: "/post-auth" })}
    >
      TRIAGE YOUR TIME
    </Button>
  );
}
