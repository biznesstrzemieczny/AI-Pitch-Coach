"use client";

import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function getScoreGradientId(score: number): string {
  if (score <= 40) return "score-red";
  if (score <= 70) return "score-yellow";
  return "score-green";
}

function getScoreTextColor(score: number): string {
  if (score <= 40) return "text-red-400";
  if (score <= 70) return "text-amber-400";
  return "text-emerald-400";
}

export function ScoreRing({
  score,
  size = 200,
  strokeWidth = 12,
  className,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const gradientId = getScoreGradientId(score);

  return (
    <div
      className={cn("relative inline-flex", className)}
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id="score-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.7 0.2 25)" />
            <stop offset="100%" stopColor="oklch(0.55 0.22 25)" />
          </linearGradient>
          <linearGradient id="score-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.85 0.15 85)" />
            <stop offset="100%" stopColor="oklch(0.7 0.18 70)" />
          </linearGradient>
          <linearGradient id="score-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.75 0.18 155)" />
            <stop offset="100%" stopColor="oklch(0.55 0.2 145)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={`url(#${gradientId})`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "text-6xl font-bold tabular-nums drop-shadow-sm md:text-8xl",
            getScoreTextColor(score)
          )}
        >
          {score}
        </span>
      </div>
    </div>
  );
}
