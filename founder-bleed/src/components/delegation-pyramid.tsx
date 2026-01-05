"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function DelegationPyramid() {
  const tiers = [
    { name: "Unique", desc: "Only you can do this. Strategic vision, key relationships.", color: "bg-red-600", width: "w-[20%]" },
    { name: "Founder", desc: "Needs founder judgment but a co-founder could handle.", color: "bg-orange-500", width: "w-[40%]" },
    { name: "Senior", desc: "Skilled specialist work. Architecture, high-level execution.", color: "bg-yellow-500", width: "w-[60%]" },
    { name: "Junior", desc: "Entry-level specialist work. Execution, maintenance.", color: "bg-green-500", width: "w-[80%]" },
    { name: "EA", desc: "Administrative work. Scheduling, expenses, travel.", color: "bg-blue-500", width: "w-[100%]" },
  ];

  return (
    <div className="flex flex-col items-center gap-1 w-full max-w-md mx-auto">
      <TooltipProvider>
        {tiers.map((tier, i) => (
          <Tooltip key={tier.name}>
            <TooltipTrigger asChild>
              <div 
                className={`${tier.width} ${tier.color} h-12 flex items-center justify-center text-white font-bold rounded-sm cursor-help hover:opacity-90 transition-opacity`}
              >
                {tier.name}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tier.desc}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
