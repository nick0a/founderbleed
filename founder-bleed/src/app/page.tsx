import Link from "next/link";

import { auth } from "@/lib/auth";
import { CtaButton } from "@/components/cta-button";
import { DelegationPyramid } from "@/components/delegation-pyramid";
import { HowItWorksCarousel } from "@/components/how-it-works-carousel";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Home() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-8" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Founder Bleed
              </p>
              <p className="text-sm font-semibold text-foreground">
                Triage · Delegate · Plan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {isLoggedIn ? (
              <Link href="/processing" className="hover:text-foreground">
                Dashboard
              </Link>
            ) : (
              <Link href="/signin" className="hover:text-foreground">
                Sign in
              </Link>
            )}
            <ThemeToggle />
          </div>
        </header>

        <section className="rounded-[32px] border border-border bg-card/80 px-8 py-12 shadow-lg">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Founder Bleed
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Stop Bleeding Time on Work That Isn&apos;t Yours
            </h1>
            <p className="mt-4 text-base text-muted-foreground">
              Discover how much you are losing by doing work that should be delegated.
              Get a personalized hiring prescription in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <CtaButton isLoggedIn={isLoggedIn} />
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                AI-Powered Calendar Audit
              </span>
              <span className="text-xs text-muted-foreground">
                Read-only calendar access. We never modify your calendar.
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <p className="text-sm text-muted-foreground">
              Three steps to uncover wasted time, assign the right talent, and
              build a calendar that compounds your leverage.
            </p>
            <HowItWorksCarousel />
          </div>
          <DelegationPyramid />
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Sample report preview</h3>
            <p className="text-sm text-muted-foreground">
              A private look at your biggest losses and the hiring moves that fix them.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {["Hero metric", "Role recommendations", "Planning score"].map((label) => (
                <div key={label} className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {label}
                  </p>
                  <div className="mt-4 h-6 w-full rounded-full bg-muted blur-sm" />
                  <div className="mt-2 h-3 w-3/4 rounded-full bg-muted blur-sm" />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Delegation Snapshot
              </p>
              <div className="mt-3 space-y-2">
                {[60, 40, 25].map((width, index) => (
                  <div
                    key={`preview-${index}`}
                    className="h-3 rounded-full bg-muted"
                    style={{ width: `${width}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Privacy first</h3>
            <p className="text-sm text-muted-foreground">
              We take your calendar data seriously.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Read-only calendar access. We never modify events.</li>
              <li>Tokens, titles, and descriptions are encrypted at rest.</li>
              <li>Delete your data anytime with a single click.</li>
            </ul>
            <div className="mt-6 flex flex-col gap-3 text-sm">
              <Link href="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-blue-600 hover:underline dark:text-blue-400">
                Terms of Service
              </Link>
              <Link href="/support" className="text-blue-600 hover:underline dark:text-blue-400">
                Contact Support
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-border bg-card/80 px-8 py-10 text-center shadow-lg">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to triage your time?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            A clear delegation plan is minutes away.
          </p>
          <div className="mt-6 flex justify-center">
            <CtaButton isLoggedIn={isLoggedIn} />
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted-foreground">
          <span>© 2026 Founder Bleed</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/support" className="hover:text-foreground">
              Contact Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
