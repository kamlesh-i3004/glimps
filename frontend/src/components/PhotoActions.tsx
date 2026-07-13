"use client";

import { useState, useRef, useEffect } from "react";
import type { SelectionStatus } from "@/lib/api";

interface PhotoActionsProps {
  photoId: string;
  status: SelectionStatus | null;
  isFavorited: boolean;
  accentColor: string;
  onSetStatus: (status: SelectionStatus | null) => void;
  onToggleFavorite: () => void;
}

const STATUS_CONFIG = {
  yes: { label: "Yes", color: "bg-green-500", textColor: "text-green-600", icon: "✓" },
  maybe: { label: "Maybe", color: "bg-yellow-500", textColor: "text-yellow-600", icon: "?" },
  no: { label: "No", color: "bg-red-500", textColor: "text-red-600", icon: "✕" },
} as const;

export default function PhotoActions({
  photoId,
  status,
  isFavorited,
  accentColor,
  onSetStatus,
  onToggleFavorite,
}: PhotoActionsProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const currentConfig = status ? STATUS_CONFIG[status] : null;

  return (
    <div className="absolute top-2 left-2 right-2 flex items-start justify-between z-10">
      {/* Status dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shadow-sm transition-all ${
            currentConfig
              ? `${currentConfig.color} text-white`
              : "bg-black/30 text-white opacity-0 group-hover:opacity-100"
          }`}
        >
          {currentConfig ? (
            <>
              <span>{currentConfig.icon}</span>
              <span>{currentConfig.label}</span>
            </>
          ) : (
            <span>∨</span>
          )}
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border py-1 min-w-[100px] z-20">
            {(["yes", "maybe", "no"] as SelectionStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStatus(s);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    status === s ? "font-semibold" : ""
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${cfg.color} flex items-center justify-center text-white text-[10px]`}>
                    {cfg.icon}
                  </span>
                  {cfg.label}
                </button>
              );
            })}
            {status && (
              <>
                <div className="border-t my-1" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStatus(null);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-50"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Favorite heart */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          isFavorited
            ? "text-red-500"
            : "text-white opacity-0 group-hover:opacity-100"
        }`}
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
      >
        {isFavorited ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        )}
      </button>
    </div>
  );
}
