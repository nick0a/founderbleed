"use client";

import { useState } from "react";

const steps = [
  {
    title: "TRIAGE",
    description:
      "We analyze your calendar and classify every hour by who should be doing it.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <path
          fill="currentColor"
          d="M7 2h10a2 2 0 0 1 2 2v2h-2V4H7v2H5V4a2 2 0 0 1 2-2Zm-2 6h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Zm4 4h6v2H9v-2Zm0 4h6v2H9v-2Z"
        />
      </svg>
    ),
  },
  {
    title: "DELEGATE",
    description:
      "Get specific hiring recommendations with ready-to-use job descriptions.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <path
          fill="currentColor"
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0v2H5Zm13-9a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z"
        />
      </svg>
    ),
  },
  {
    title: "PLAN",
    description:
      "Our AI helps you restructure your calendar for maximum leverage.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <path
          fill="currentColor"
          d="m12 2 2.2 4.5L19 7l-3.5 3.4.8 4.8L12 13.6 7.7 15.2l.8-4.8L5 7l4.8-.5Z"
        />
      </svg>
    ),
  },
];

export function HowItWorksCarousel() {
  const [index, setIndex] = useState(0);
  const step = steps[index];

  function goNext() {
    setIndex((prev) => (prev + 1) % steps.length);
  }

  function goPrev() {
    setIndex((prev) => (prev - 1 + steps.length) % steps.length);
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
          aria-label="Previous step"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path fill="currentColor" d="M15 18 9 12l6-6 1.4 1.4L11.8 12l4.6 4.6Z" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            {step.icon}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Step {index + 1}
            </p>
            <h3 className="text-lg font-semibold">{step.title}</h3>
          </div>
        </div>
        <button
          onClick={goNext}
          className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
          aria-label="Next step"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path fill="currentColor" d="m9 6 6 6-6 6-1.4-1.4L12.2 12 7.6 7.4Z" />
          </svg>
        </button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{step.description}</p>

      <div className="mt-5 flex items-center justify-center gap-2">
        {steps.map((_, dotIndex) => (
          <button
            key={`dot-${dotIndex}`}
            onClick={() => setIndex(dotIndex)}
            className={`h-2 w-2 rounded-full ${
              dotIndex === index ? "bg-primary" : "bg-muted-foreground/40"
            }`}
            aria-label={`Go to step ${dotIndex + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
