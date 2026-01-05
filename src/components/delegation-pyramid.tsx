// Delegation Pyramid - 5-tier visualization
// Unique (narrowest/top) → EA (widest/bottom)

'use client';

import { useState } from 'react';

interface TierInfo {
  id: string;
  name: string;
  description: string;
  hourlyRate: string;
  talentPool: string;
  color: string;
  bgColor: string;
  width: string;
}

const tiers: TierInfo[] = [
  {
    id: 'unique',
    name: 'Unique',
    description: 'Skills or knowledge only you possess. Cannot be delegated.',
    hourlyRate: '$250+',
    talentPool: 'You only',
    color: 'bg-violet-600',
    bgColor: 'bg-violet-100 dark:bg-violet-900/40',
    width: 'w-[30%]',
  },
  {
    id: 'founder',
    name: 'Founder',
    description: 'Strategic decisions requiring founder authority and context.',
    hourlyRate: '$200',
    talentPool: 'Co-founders only',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40',
    width: 'w-[45%]',
  },
  {
    id: 'senior',
    name: 'Senior',
    description: 'Complex work requiring deep expertise and judgment.',
    hourlyRate: '$100',
    talentPool: 'Specialized professionals',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    width: 'w-[60%]',
  },
  {
    id: 'junior',
    name: 'Junior',
    description: 'Defined tasks requiring some skill but clear direction.',
    hourlyRate: '$50',
    talentPool: 'Entry-level talent',
    color: 'bg-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    width: 'w-[75%]',
  },
  {
    id: 'ea',
    name: 'EA',
    description: 'Scheduling, coordination, and admin tasks.',
    hourlyRate: '$25',
    talentPool: 'Large available pool',
    color: 'bg-teal-500',
    bgColor: 'bg-teal-100 dark:bg-teal-900/40',
    width: 'w-[90%]',
  },
];

export function DelegationPyramid() {
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  return (
    <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          The Delegation Pyramid
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
          Every task on your calendar fits somewhere on this pyramid. The higher
          up, the more expensive your time and the smaller the talent pool.
        </p>

        {/* Axis Labels */}
        <div className="flex justify-between items-center mb-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-medium">Hourly Cost</span>
            <span>↑</span>
          </div>
          <div className="flex items-center gap-2">
            <span>↔</span>
            <span className="font-medium">Talent Pool Size</span>
          </div>
        </div>

        {/* Pyramid */}
        <div className="relative">
          <div className="flex flex-col items-center gap-2">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`${tier.width} transition-all duration-300 cursor-pointer`}
                onMouseEnter={() => setHoveredTier(tier.id)}
                onMouseLeave={() => setHoveredTier(null)}
              >
                <div
                  className={`${tier.color} py-3 md:py-4 rounded-lg text-white text-center font-semibold 
                    transition-all duration-300 
                    ${hoveredTier === tier.id ? 'scale-105 shadow-lg' : 'scale-100'}
                    ${hoveredTier && hoveredTier !== tier.id ? 'opacity-60' : 'opacity-100'}`}
                >
                  <span className="text-sm md:text-base">{tier.name}</span>
                  <span className="hidden md:inline text-white/70 ml-2 text-sm">
                    {tier.hourlyRate}/hr
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {hoveredTier && (
            <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200">
              {(() => {
                const tier = tiers.find((t) => t.id === hoveredTier)!;
                return (
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div
                      className={`shrink-0 w-16 h-16 ${tier.bgColor} rounded-lg flex items-center justify-center`}
                    >
                      <span
                        className={`text-2xl font-bold ${tier.color.replace('bg-', 'text-')}`}
                      >
                        {tier.name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white">
                        {tier.name} Tier
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                        {tier.description}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          <strong>Rate:</strong> {tier.hourlyRate}/hr
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          <strong>Pool:</strong> {tier.talentPool}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`p-3 rounded-lg ${tier.bgColor} transition-all duration-200 
                ${hoveredTier === tier.id ? 'ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}`}
              style={{
                borderColor:
                  hoveredTier === tier.id
                    ? tier.color.replace('bg-', '')
                    : 'transparent',
              }}
              onMouseEnter={() => setHoveredTier(tier.id)}
              onMouseLeave={() => setHoveredTier(null)}
            >
              <div
                className={`font-semibold ${tier.color.replace('bg-', 'text-')}`}
              >
                {tier.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {tier.hourlyRate}/hr
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
