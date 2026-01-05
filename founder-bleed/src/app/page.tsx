import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold">Founder Bleed</h1>
      <p>Phase 0: Setup Complete</p>
      <div className="flex gap-4 items-center">
        <Button>Shadcn Button</Button>
        <ModeToggle />
      </div>
    </div>
  );
}
