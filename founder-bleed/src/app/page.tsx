import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
              FB
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Founder Bleed
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {"Triage -> Delegate -> Plan"}
              </h1>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Hero Metric
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {"{Username}, You're Losing $X Every Year..."}
          </h2>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Founder Bleed turns calendar chaos into clear delegation plans,
            quantified by cost, arbitrage, and efficiency.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button>Run my audit</Button>
            <Button variant="outline">View methodology</Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Triage",
              detail: "Classify every event into delegation tiers.",
            },
            {
              title: "Delegate",
              detail: "See hiring recommendations with cost arbitrage.",
            },
            {
              title: "Plan",
              detail: "Track a planning score and build healthier weeks.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.detail}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
