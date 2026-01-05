import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { HowItWorksCarousel } from "@/components/how-it-works-carousel";
import { DelegationPyramid } from "@/components/delegation-pyramid";
import { ModeToggle } from "@/components/mode-toggle";
import { auth } from '@/lib/auth';

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-bold text-xl">Founder Bleed</span>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          {session ? (
            <Link href="/processing"><Button>Dashboard</Button></Link>
          ) : (
            <Link href="/signin"><Button variant="ghost">Sign In</Button></Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 text-center space-y-8 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          Stop Bleeding Time on <span className="text-red-600">Work That Isn't Yours</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover how much you're losing by doing work that should be delegated. Get a personalized hiring prescription in minutes.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Link href={session ? "/processing" : "/signin"}>
            <Button size="lg" className="text-lg px-8 py-6 h-auto">TRIAGE YOUR TIME</Button>
          </Link>
          <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full">AI-Powered Calendar Audit</span>
          <p className="text-sm text-muted-foreground">Read-only calendar access. We never modify your calendar.</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <HowItWorksCarousel />
        </div>
      </section>

      {/* Delegation Pyramid */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">The Delegation Pyramid</h2>
          <DelegationPyramid />
        </div>
      </section>

      {/* Sample Report Preview (Placeholder) */}
      <section className="py-20 bg-muted/30 px-6">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Your Personalized Prescription</h2>
          <div className="max-w-4xl mx-auto bg-card border rounded-xl shadow-2xl p-8 aspect-video flex items-center justify-center">
            <p className="text-muted-foreground">Interactive Report Preview Coming Soon</p>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Your Data is Safe</h2>
        <p className="max-w-2xl mx-auto text-muted-foreground mb-8">
          We only access your calendar metadata to analyze time usage. We never read details of private events, and we never modify your calendar. Your data is encrypted at rest and you can delete it anytime.
        </p>
        <Link href="#" className="underline text-sm">Privacy Policy</Link>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary/5 text-center px-6">
        <h2 className="text-3xl font-bold mb-8">Ready to Reclaim Your Time?</h2>
        <Link href={session ? "/processing" : "/signin"}>
          <Button size="lg" className="text-lg px-8 py-6 h-auto">TRIAGE YOUR TIME</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t text-center text-sm text-muted-foreground">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="#">Privacy Policy</Link>
          <Link href="#">Terms of Service</Link>
          <Link href="#">Contact</Link>
        </div>
        <p>© 2026 Founder Bleed. All rights reserved.</p>
      </footer>
    </div>
  );
}
