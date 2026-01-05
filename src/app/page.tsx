import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold">Founder Bleed</h1>
          <ThemeToggle />
        </header>

        <main className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              Reclaim Your Time
            </h2>
            <p className="text-xl text-muted-foreground">
              Stop bleeding money on work others could do.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              Get Started
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>

          <div className="pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              Phase 0: Setup Complete ✓
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
