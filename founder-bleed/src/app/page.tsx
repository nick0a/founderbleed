import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Founder Bleed
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Reclaim time by delegating the right work.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Core loop</h2>
            <p className="text-lg text-muted-foreground">
              TRIAGE -&gt; DELEGATE -&gt; PLAN. Audit your calendar, model delegation
              tiers, and keep your plan focused on unique founder work.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg">Start an audit</Button>
              <Button variant="outline" size="lg">
                View sample report
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-border p-5">
            <p className="text-sm font-medium uppercase text-muted-foreground">
              Phase 0
            </p>
            <p className="mt-2 text-base text-muted-foreground">
              Memory architecture, environment config, and theming foundation.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
