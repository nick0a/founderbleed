// Blood drop logo component
// Gradient: #DC2626 (red-600) to #991B1B (red-800)

'use client';

import { useId } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'h-6 w-[18px]',
  md: 'h-8 w-6',
  lg: 'h-10 w-[30px]',
  xl: 'h-12 w-9',
};

export function Logo({ className = '', size = 'md' }: LogoProps) {
  // Use unique gradient ID to prevent SVG conflicts when multiple logos on page
  const gradientId = useId();

  return (
    <svg
      className={`${sizeMap[size]} ${className}`}
      viewBox="0 0 24 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Founder Bleed logo"
    >
      <defs>
        <linearGradient
          id={gradientId}
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
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

export function LogoWithText({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size="md" />
      <span className="font-bold text-lg text-gray-900 dark:text-white">
        Founder Bleed
      </span>
    </div>
  );
}
