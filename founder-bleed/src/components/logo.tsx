"use client"

import { useId } from 'react';

export function Logo({ className }: { className?: string }) {
  const gradientId = useId();

  return (
    <svg className={className} viewBox="0 0 24 32" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="12" y1="0" x2="12" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DC2626" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      <path
        d="M12 0C12 0 0 14 0 21C0 27.627 5.373 32 12 32C18.627 32 24 27.627 24 21C24 14 12 0 12 0Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
