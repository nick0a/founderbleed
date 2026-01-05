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
            <Button size="lg">Get Started</Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
          <div className="mt-16 p-8 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-4">Phase 0 Setup Complete</h3>
            <ul className="text-left space-y-2 text-muted-foreground">
              <li> Next.js 14+ with App Router</li>
              <li> TypeScript + Tailwind CSS</li>
              <li> shadcn/ui components</li>
              <li> Dark/Light mode support</li>
              <li> Drizzle ORM configured</li>
              <li> Memory architecture created</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}