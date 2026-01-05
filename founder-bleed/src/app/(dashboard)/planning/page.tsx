import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { requireSubscription } from "@/lib/subscription";

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const access = await requireSubscription(session.user.id, "starter");

  if (!access.allowed) {
    return (
      <main className="min-h-screen bg-background">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Upgrade Required
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Planning Assistant is paid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Upgrade to unlock AI planning, automation, and continuous audits.
            </p>
            <div className="mt-6 grid gap-3 text-sm">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-semibold">Starter</p>
                <p className="text-muted-foreground">$20/seat/month · Community support</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-semibold">Pro</p>
                <p className="text-muted-foreground">$50/seat/month · Email support</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-semibold">Enterprise</p>
                <p className="text-muted-foreground">$90/seat/month · Priority support</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Link
                href="/processing"
                className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
              >
                Maybe later
              </Link>
              <Link
                href="/"
                className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                View plans
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Planning Assistant</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your AI planning workspace will appear here in Phase 7.
        </p>
      </div>
    </main>
  );
}
