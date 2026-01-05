"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  // Use React's useId for stable, unique gradient IDs to prevent SVG conflicts
  const gradientId = useId();

  return (
    <svg
      className={cn("w-6 h-8", className)}
      viewBox="0 0 24 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Founder Bleed logo"
    >
      <defs>
        <linearGradient
          id={`blood-drop-gradient-${gradientId}`}
          x1="12"
          y1="0"
          x2="12"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#DC2626" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      <path
        d="M12 0C12 0 0 14 0 21C0 27.627 5.373 32 12 32C18.627 32 24 27.627 24 21C24 14 12 0 12 0Z"
        fill={`url(#blood-drop-gradient-${gradientId})`}
      />
    </svg>
  );
}

export function LogoWithText({
  className,
  logoClassName,
  textClassName,
}: {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Logo className={logoClassName} />
      <span
        className={cn(
          "font-bold text-xl text-foreground",
          textClassName
        )}
      >
        Founder Bleed
      </span>
    </div>
  );
}
