"use client";

import { useState, useId } from "react";
import { cn } from "@/lib/utils";

interface RoleData {
  role: string;
  salary: number;
  flexTime: number;
  color: string;
  description: string;
}

const roleData: RoleData[] = [
  {
    role: "Founder",
    salary: 250000,
    flexTime: 3,
    color: "#DC2626", // red-600
    description:
      "Highest cost, least flexibility. Your calendar is maxed out with strategic decisions.",
  },
  {
    role: "Senior",
    salary: 150000,
    flexTime: 6,
    color: "#2563EB", // blue-600
    description:
      "Specialists with some schedule flexibility. Could absorb complex delegated work.",
  },
  {
    role: "Junior",
    salary: 75000,
    flexTime: 12,
    color: "#16A34A", // green-600
    description:
      "Growing capacity with meaningful flexibility. Ideal for scalable processes.",
  },
  {
    role: "EA",
    salary: 25000,
    flexTime: 24,
    color: "#9333EA", // purple-600
    description:
      "Most available capacity. Often underutilized despite handling routine tasks efficiently.",
  },
];

const maxSalary = 280000;
const maxFlexTime = 30;

function formatCurrency(value: number): string {
  return `$${(value / 1000).toFixed(0)}k`;
}

export function DelegationChart({ className }: { className?: string }) {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const chartId = useId();

  // SVG dimensions
  const svgWidth = 400;
  const svgHeight = 300;
  const padding = { top: 20, right: 60, bottom: 50, left: 60 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Bar width and spacing
  const barWidth = chartWidth / roleData.length * 0.6;
  const barGap = chartWidth / roleData.length * 0.4;

  // Calculate bar positions and heights
  const bars = roleData.map((data, index) => {
    const x = padding.left + index * (chartWidth / roleData.length) + barGap / 2;
    const barHeight = (data.salary / maxSalary) * chartHeight;
    const y = padding.top + chartHeight - barHeight;
    return { ...data, x, y, width: barWidth, height: barHeight, index };
  });

  // Calculate smooth curve points for flex time
  // Use cubic bezier for smooth exponential-looking curve
  const linePoints = roleData.map((data, index) => {
    const x = padding.left + index * (chartWidth / roleData.length) + (chartWidth / roleData.length) / 2;
    const y = padding.top + chartHeight - (data.flexTime / maxFlexTime) * chartHeight;
    return { x, y, data };
  });

  // Generate smooth curve path using cubic bezier
  const generateSmoothPath = () => {
    if (linePoints.length < 2) return "";

    let path = `M ${linePoints[0].x} ${linePoints[0].y}`;

    for (let i = 0; i < linePoints.length - 1; i++) {
      const current = linePoints[i];
      const next = linePoints[i + 1];

      // Control points for smooth curve
      const cp1x = current.x + (next.x - current.x) / 3;
      const cp1y = current.y;
      const cp2x = current.x + (next.x - current.x) * 2 / 3;
      const cp2y = next.y;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    return path;
  };

  // Y-axis labels for salary (left)
  const salaryLabels = [0, 75000, 150000, 225000];
  // Y-axis labels for flex time (right)
  const flexLabels = [0, 8, 16, 24];

  return (
    <div className={cn("w-full max-w-3xl mx-auto", className)}>
      <div className="bg-muted/30 rounded-2xl p-6 md:p-8">
        <h3 className="text-xl font-bold text-center mb-2 text-foreground">
          The Delegation Opportunity
        </h3>
        <p className="text-center text-muted-foreground mb-8 text-sm">
          Founders cost the most but have the least flexibility. Lower-cost roles
          have unused capacity waiting for delegation.
        </p>

        {/* Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[320px]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient
                id={`curve-gradient-${chartId}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="50%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#9333EA" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`grid-${i}`}
                x1={padding.left}
                y1={padding.top + (chartHeight / 4) * i}
                x2={svgWidth - padding.right}
                y2={padding.top + (chartHeight / 4) * i}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4,4"
              />
            ))}

            {/* Y-axis left (Salary) */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + chartHeight}
              stroke="currentColor"
              strokeOpacity={0.3}
            />
            {salaryLabels.map((value, i) => (
              <text
                key={`salary-${i}`}
                x={padding.left - 8}
                y={padding.top + chartHeight - (value / maxSalary) * chartHeight + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                ${value / 1000}k
              </text>
            ))}
            <text
              x={20}
              y={padding.top + chartHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90, 20, ${padding.top + chartHeight / 2})`}
              className="fill-muted-foreground text-[11px] font-medium"
            >
              Annual Salary
            </text>

            {/* Y-axis right (Flex Time) */}
            <line
              x1={svgWidth - padding.right}
              y1={padding.top}
              x2={svgWidth - padding.right}
              y2={padding.top + chartHeight}
              stroke="currentColor"
              strokeOpacity={0.3}
            />
            {flexLabels.map((value, i) => (
              <text
                key={`flex-${i}`}
                x={svgWidth - padding.right + 8}
                y={padding.top + chartHeight - (value / maxFlexTime) * chartHeight + 4}
                textAnchor="start"
                className="fill-muted-foreground text-[10px]"
              >
                {value}%
              </text>
            ))}
            <text
              x={svgWidth - 15}
              y={padding.top + chartHeight / 2}
              textAnchor="middle"
              transform={`rotate(90, ${svgWidth - 15}, ${padding.top + chartHeight / 2})`}
              className="fill-muted-foreground text-[11px] font-medium"
            >
              Available Flex Time
            </text>

            {/* X-axis */}
            <line
              x1={padding.left}
              y1={padding.top + chartHeight}
              x2={svgWidth - padding.right}
              y2={padding.top + chartHeight}
              stroke="currentColor"
              strokeOpacity={0.3}
            />

            {/* Bars */}
            {bars.map((bar) => (
              <g
                key={bar.role}
                onMouseEnter={() => setHoveredRole(bar.role)}
                onMouseLeave={() => setHoveredRole(null)}
                className="cursor-pointer"
              >
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill={bar.color}
                  rx={4}
                  className={cn(
                    "transition-opacity duration-200",
                    hoveredRole === bar.role ? "opacity-100" : "opacity-70"
                  )}
                />
                {/* X-axis label */}
                <text
                  x={bar.x + bar.width / 2}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  className={cn(
                    "text-[12px] font-medium transition-colors",
                    hoveredRole === bar.role ? "fill-primary" : "fill-foreground"
                  )}
                >
                  {bar.role}
                </text>
              </g>
            ))}

            {/* Smooth curve for flex time */}
            <path
              d={generateSmoothPath()}
              fill="none"
              stroke={`url(#curve-gradient-${chartId})`}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points on curve */}
            {linePoints.map((point, index) => (
              <g key={`point-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={8}
                  fill={point.data.color}
                  className={cn(
                    "transition-all duration-200",
                    hoveredRole === point.data.role ? "opacity-100" : "opacity-90"
                  )}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={5}
                  fill="white"
                  className="dark:fill-gray-900"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  fill={point.data.color}
                />
              </g>
            ))}

            {/* Tooltip */}
            {hoveredRole && (
              (() => {
                const bar = bars.find((b) => b.role === hoveredRole);
                const point = linePoints.find((p) => p.data.role === hoveredRole);
                if (!bar || !point) return null;

                const tooltipX = bar.x + bar.width / 2;
                const tooltipY = Math.min(bar.y, point.y) - 10;

                return (
                  <g>
                    <rect
                      x={tooltipX - 70}
                      y={tooltipY - 55}
                      width={140}
                      height={50}
                      rx={6}
                      className="fill-popover stroke-border"
                      strokeWidth={1}
                    />
                    <text
                      x={tooltipX}
                      y={tooltipY - 38}
                      textAnchor="middle"
                      className="fill-foreground text-[11px] font-bold"
                    >
                      {bar.role}
                    </text>
                    <text
                      x={tooltipX}
                      y={tooltipY - 24}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      Salary: {formatCurrency(bar.salary)}/yr
                    </text>
                    <text
                      x={tooltipX}
                      y={tooltipY - 10}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      Flex Time: {point.data.flexTime}%
                    </text>
                  </g>
                );
              })()
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-4 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-b from-red-600 via-blue-600 to-purple-600 rounded" />
            <span className="text-muted-foreground">Annual Salary (bars)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-gradient-to-r from-red-600 via-violet-600 to-purple-600 rounded-full" />
            <span className="text-muted-foreground">Available Flex Time (curve)</span>
          </div>
        </div>

        {/* Key insight */}
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-center text-foreground">
            <span className="font-semibold">Key insight:</span> Founders cost the
            most but have almost no scheduling flexibility (~3%). Lower-cost roles
            like EAs often have significant unused capacity (~24%) because
            delegation isn&apos;t happening systematically.
          </p>
        </div>
      </div>
    </div>
  );
}
