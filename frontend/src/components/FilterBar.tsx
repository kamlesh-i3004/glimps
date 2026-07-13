"use client";

export type FilterType = "all" | "yes" | "maybe" | "no" | "favorites" | "unreviewed";

interface FilterBarProps {
  active: FilterType;
  onChange: (filter: FilterType) => void;
  counts: {
    all: number;
    yes: number;
    maybe: number;
    no: number;
    favorites: number;
    unreviewed: number;
  };
  accentColor: string;
}

const FILTERS: { key: FilterType; label: string; dotColor?: string }[] = [
  { key: "all", label: "All" },
  { key: "yes", label: "Yes", dotColor: "bg-green-500" },
  { key: "maybe", label: "Maybe", dotColor: "bg-yellow-500" },
  { key: "no", label: "No", dotColor: "bg-red-500" },
  { key: "favorites", label: "Favorites", dotColor: "bg-red-400" },
  { key: "unreviewed", label: "Unreviewed" },
];

export default function FilterBar({ active, onChange, counts, accentColor }: FilterBarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {FILTERS.map(({ key, label, dotColor }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            active === key
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
          {label}
          <span className={`${active === key ? "text-white/70" : "text-gray-400"}`}>
            {counts[key]}
          </span>
        </button>
      ))}
    </div>
  );
}
