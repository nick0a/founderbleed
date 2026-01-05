"use client";

const tiers = [
  {
    name: "Unique",
    width: "w-[55%]",
    color: "bg-red-700",
    detail: "Only you can do it. Highest cost, lowest pool.",
  },
  {
    name: "Founder",
    width: "w-[65%]",
    color: "bg-red-600",
    detail: "Co-founder level judgment required.",
  },
  {
    name: "Senior",
    width: "w-[75%]",
    color: "bg-red-500",
    detail: "Senior specialists with deep expertise.",
  },
  {
    name: "Junior",
    width: "w-[85%]",
    color: "bg-red-400",
    detail: "Execution-focused teammates.",
  },
  {
    name: "EA",
    width: "w-[95%]",
    color: "bg-red-300",
    detail: "Assistants handle coordination and admin.",
  },
];

export function DelegationPyramid() {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Delegation Pyramid</h3>
          <p className="text-sm text-muted-foreground">
            Higher tiers are costly and scarce. Lower tiers are abundant.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Hourly cost: $25 to $250+
        </div>
      </div>

      <div className="relative mt-6 flex flex-col items-center gap-3">
        {tiers.map((tier) => (
          <div key={tier.name} className={`group relative ${tier.width}`}>
            <div
              className={`flex items-center justify-center rounded-md py-2 text-xs font-semibold text-white shadow ${tier.color}`}
            >
              {tier.name}
            </div>
            <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-background p-2 text-xs text-muted-foreground opacity-0 shadow transition group-hover:opacity-100">
              {tier.detail}
            </div>
          </div>
        ))}
        <div className="mt-4 flex w-full items-center justify-between text-xs text-muted-foreground">
          <span>Smaller talent pool</span>
          <span>Larger talent pool</span>
        </div>
      </div>
    </div>
  );
}
