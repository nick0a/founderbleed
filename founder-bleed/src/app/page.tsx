import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoWithText } from "@/components/logo";
import { HowItWorksCarousel } from "@/components/how-it-works-carousel";
import { DelegationChart } from "@/components/delegation-chart";
import { Shield, Lock, Trash2 } from "lucide-react";

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <LogoWithText />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/signin">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              Stop Bleeding Time on Work That Isn&apos;t Yours
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover how much you&apos;re losing by doing work that should be
              delegated. Get a personalized hiring prescription in minutes.
            </p>
            <div className="pt-4">
              <Link href="/signin">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 h-auto font-semibold"
                >
                  TRIAGE YOUR TIME
                </Button>
              </Link>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                ✨ AI-Powered Calendar Audit
              </span>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Read-only calendar access.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
              How It Works
            </h2>
            <HowItWorksCarousel />
          </div>
        </section>

        {/* Delegation Chart Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <DelegationChart />
          </div>
        </section>

        {/* Sample Report Preview Section */}
        <section className="py-16 md:py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
              See What You&apos;ll Discover
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Your personalized audit reveals exactly where your time is going and
              how much you could save.
            </p>

            {/* Sample Report Card */}
            <div className="max-w-4xl mx-auto bg-card rounded-2xl border shadow-lg overflow-hidden">
              {/* Hero Metric */}
              <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-8 text-center">
                <p className="text-sm uppercase tracking-wider mb-2 opacity-90">
                  Your Annual Opportunity
                </p>
                <h3 className="text-4xl md:text-5xl font-bold">$127,450/year</h3>
                <p className="mt-2 text-lg opacity-90">
                  in recoverable time value
                </p>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                {/* Time Breakdown */}
                <div>
                  <h4 className="text-lg font-semibold mb-4 text-foreground">
                    Where Your Time Is Going
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        tier: "Unique (Only You)",
                        percentage: 18.3,
                        color: "bg-red-600",
                        hours: "7.3h/week",
                      },
                      {
                        tier: "Founder-Level",
                        percentage: 23.7,
                        color: "bg-orange-500",
                        hours: "9.5h/week",
                      },
                      {
                        tier: "Senior Specialist",
                        percentage: 27.4,
                        color: "bg-blue-600",
                        hours: "11.0h/week",
                      },
                      {
                        tier: "Junior Team Member",
                        percentage: 19.2,
                        color: "bg-green-600",
                        hours: "7.7h/week",
                      },
                      {
                        tier: "Executive Assistant",
                        percentage: 11.4,
                        color: "bg-purple-600",
                        hours: "4.6h/week",
                      },
                    ].map((item) => (
                      <div key={item.tier} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{item.tier}</span>
                          <span className="text-muted-foreground">
                            {item.percentage}% ({item.hours})
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meeting Categories */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-foreground">
                      Meeting Categories
                    </h4>
                    <div className="space-y-2 text-sm">
                      {[
                        { name: "1:1s & Team Syncs", pct: 31.2 },
                        { name: "External Calls", pct: 22.8 },
                        { name: "Strategy & Planning", pct: 18.4 },
                        { name: "Admin & Operations", pct: 15.9 },
                        { name: "Focus / Deep Work", pct: 11.7 },
                      ].map((cat) => (
                        <div
                          key={cat.name}
                          className="flex justify-between py-1 border-b border-border/50"
                        >
                          <span className="text-muted-foreground">{cat.name}</span>
                          <span className="font-medium text-foreground">
                            {cat.pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-foreground">
                      Hiring Recommendations
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <p className="font-medium text-purple-600 dark:text-purple-400">
                          Executive Assistant
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Reclaim 4.6 hrs/week in scheduling & admin
                        </p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="font-medium text-green-600 dark:text-green-400">
                          Operations Coordinator
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Delegate process work & recurring tasks
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Planning Score */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      Planning Score
                    </h4>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      How effectively you track and plan your time. If you fail to plan, you plan to fail.
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-primary">67%</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
              Your Privacy Matters
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">
                  Read-Only Access
                </h3>
                <p className="text-muted-foreground text-sm">
                  We only read your calendar events. We never create, modify, or
                  delete anything.
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">
                  Encrypted Data
                </h3>
                <p className="text-muted-foreground text-sm">
                  Your calendar data is encrypted at rest using AES-256
                  encryption.
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trash2 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">
                  Delete Anytime
                </h3>
                <p className="text-muted-foreground text-sm">
                  You can delete your account and all data at any time from your
                  settings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Ready to Reclaim Your Time?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join founders who have discovered how to focus on what only they can
              do.
            </p>
            <Link href="/signin">
              <Button
                size="lg"
                className="text-lg px-8 py-6 h-auto font-semibold"
              >
                TRIAGE YOUR TIME
              </Button>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Free audit • No credit card required
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Founder Bleed. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="mailto:support@founderbleed.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
