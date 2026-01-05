"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Users, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Medical cross icon (Red Cross style) in brand colors
function MedicalCrossIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z"
        fill="currentColor"
      />
    </svg>
  );
}

interface CarouselStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const steps: CarouselStep[] = [
  {
    icon: MedicalCrossIcon,
    title: "TRIAGE",
    description:
      "We analyze your calendar and classify every hour by who should be doing it",
  },
  {
    icon: Users,
    title: "DELEGATE",
    description:
      "Get specific hiring recommendations with ready-to-use job descriptions",
  },
  {
    icon: Sparkles,
    title: "PLAN",
    description:
      "Our AI helps you restructure your calendar for maximum leverage",
  },
];

export function HowItWorksCarousel() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  }, []);

  const goToStep = useCallback((index: number) => {
    setCurrentStep(index);
  }, []);

  // Auto-advance with pause on hover
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(goToNext, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, goToNext]);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div
      className="w-full max-w-2xl mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main carousel content */}
      <div className="relative bg-muted/50 rounded-2xl p-8 md:p-12 min-h-[280px]">
        {/* Step indicator */}
        <div className="absolute top-4 left-4 text-sm text-muted-foreground font-medium">
          Step {currentStep + 1} of {steps.length}
        </div>

        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full hover:bg-background/80"
          onClick={goToPrev}
          aria-label="Previous step"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full hover:bg-background/80"
          onClick={goToNext}
          aria-label="Next step"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Content */}
        <div className="flex flex-col items-center justify-center text-center pt-6">
          <div className="mb-6 p-4 rounded-full bg-primary/10">
            <CurrentIcon className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-foreground">
            {steps[currentStep].title}
          </h3>
          <p className="text-muted-foreground text-lg max-w-md">
            {steps[currentStep].description}
          </p>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center gap-2 mt-6" role="tablist">
        {steps.map((step, index) => (
          <button
            key={step.title}
            onClick={() => goToStep(index)}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              index === currentStep
                ? "bg-primary scale-125"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to step ${index + 1}: ${step.title}`}
            aria-selected={index === currentStep}
            role="tab"
          />
        ))}
      </div>
    </div>
  );
}
