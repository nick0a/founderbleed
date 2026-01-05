import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Founder Bleed</h1>
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold tracking-tight">
            Reclaim Your Time
          </h2>
          <p className="text-xl text-muted-foreground">
            Analyze your calendar, classify work by delegation level, and get
            hiring recommendations to free up your most valuable hours.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signin">
              <Button size="lg">Get Started</Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </a>
          </div>
          <div id="features" className="mt-16 p-8 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-4">How It Works</h3>
            <ul className="text-left space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                Connect your Google Calendar (read-only access)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                Select a date range to analyze your time
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                Review AI-classified events by delegation tier
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                See how much time and money you could reclaim
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">5.</span>
                Get personalized hiring recommendations
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
