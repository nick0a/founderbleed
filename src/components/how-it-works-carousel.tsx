// How It Works Carousel - 3 steps: Triage, Delegate, Plan

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const steps = [
  {
    id: 1,
    icon: Calendar,
    title: 'TRIAGE',
    description:
      'We analyze your calendar and classify every hour by who should be doing it',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    id: 2,
    icon: Users,
    title: 'DELEGATE',
    description:
      'Get specific hiring recommendations with ready-to-use job descriptions',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 3,
    icon: Sparkles,
    title: 'PLAN',
    description:
      'Our AI helps you restructure your calendar for maximum leverage',
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
];

export function HowItWorksCarousel() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  }, []);

  // Auto-advance every 5 seconds unless paused
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(nextStep, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextStep]);

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <section
      className="py-16 px-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          How It Works
        </h2>

        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={prevStep}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>

          <button
            onClick={nextStep}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
            aria-label="Next step"
          >
            <ChevronRight className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 text-center transition-all duration-300">
            <div className="flex justify-center mb-6">
              <div className={`p-4 rounded-full ${step.bgColor}`}>
                <Icon className={`h-12 w-12 ${step.color}`} />
              </div>
            </div>

            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              STEP {step.id}
            </div>

            <h3 className={`text-2xl md:text-3xl font-bold mb-4 ${step.color}`}>
              {step.title}
            </h3>

            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              {step.description}
            </p>
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center gap-3 mt-8">
            {steps.map((s, index) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'bg-red-500 scale-125'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label={`Go to step ${index + 1}`}
                aria-current={index === currentStep ? 'step' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
