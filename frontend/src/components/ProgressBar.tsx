"use client";

interface ProgressBarProps {
  reviewed: number;
  total: number;
  accentColor: string;
}

export default function ProgressBar({ reviewed, total, accentColor }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: accentColor }}
        />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {reviewed}/{total} reviewed ({pct}%)
      </span>
    </div>
  );
}
