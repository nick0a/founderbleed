"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Users, Sparkles } from "lucide-react";

export function HowItWorksCarousel() {
  const [current, setCurrent] = useState(0);
  const steps = [
    { icon: Calendar, title: "TRIAGE", desc: "We analyze your calendar and classify every hour by who should be doing it" },
    { icon: Users, title: "DELEGATE", desc: "Get specific hiring recommendations with ready-to-use job descriptions" },
    { icon: Sparkles, title: "PLAN", desc: "Our AI helps you restructure your calendar for maximum leverage" },
  ];

  const next = () => setCurrent((c) => (c + 1) % steps.length);
  const prev = () => setCurrent((c) => (c - 1 + steps.length) % steps.length);

  return (
    <div className="relative w-full max-w-lg mx-auto bg-card border rounded-xl p-8 text-center">
        <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft /></Button>
            <div className="bg-primary/10 p-4 rounded-full">
                {(() => {
                    const Icon = steps[current].icon;
                    return <Icon className="w-12 h-12 text-primary" />;
                })()}
            </div>
            <Button variant="ghost" size="icon" onClick={next}><ChevronRight /></Button>
        </div>
        <h3 className="text-2xl font-bold mb-2">{steps[current].title}</h3>
        <p className="text-muted-foreground mb-6">{steps[current].desc}</p>
        <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === current ? 'bg-primary' : 'bg-muted'}`} />
            ))}
        </div>
    </div>
  );
}
