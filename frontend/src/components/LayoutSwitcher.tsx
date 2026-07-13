"use client";

export type LayoutType = "masonry" | "grid" | "column" | "justified";

interface LayoutSwitcherProps {
  active: LayoutType;
  onChange: (layout: LayoutType) => void;
}

const LAYOUTS: { key: LayoutType; label: string; icon: React.ReactNode }[] = [
  {
    key: "masonry",
    label: "Masonry",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="4" height="6" rx="0.5" />
        <rect x="6" y="0" width="4" height="4" rx="0.5" />
        <rect x="12" y="0" width="4" height="8" rx="0.5" />
        <rect x="0" y="8" width="4" height="4" rx="0.5" />
        <rect x="6" y="6" width="4" height="6" rx="0.5" />
        <rect x="12" y="10" width="4" height="6" rx="0.5" />
      </svg>
    ),
  },
  {
    key: "grid",
    label: "Grid",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="4" height="4" rx="0.5" />
        <rect x="6" y="0" width="4" height="4" rx="0.5" />
        <rect x="12" y="0" width="4" height="4" rx="0.5" />
        <rect x="0" y="6" width="4" height="4" rx="0.5" />
        <rect x="6" y="6" width="4" height="4" rx="0.5" />
        <rect x="12" y="6" width="4" height="4" rx="0.5" />
      </svg>
    ),
  },
  {
    key: "column",
    label: "Column",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="16" height="4" rx="0.5" />
        <rect x="0" y="6" width="16" height="4" rx="0.5" />
        <rect x="0" y="12" width="16" height="4" rx="0.5" />
      </svg>
    ),
  },
  {
    key: "justified",
    label: "Justified",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="6" height="4" rx="0.5" />
        <rect x="8" y="0" width="8" height="4" rx="0.5" />
        <rect x="0" y="6" width="10" height="4" rx="0.5" />
        <rect x="12" y="6" width="4" height="4" rx="0.5" />
        <rect x="0" y="12" width="5" height="4" rx="0.5" />
        <rect x="7" y="12" width="9" height="4" rx="0.5" />
      </svg>
    ),
  },
];

export default function LayoutSwitcher({ active, onChange }: LayoutSwitcherProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      {LAYOUTS.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={label}
          className={`p-1.5 rounded-md transition-colors ${
            active === key
              ? "bg-white shadow text-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
