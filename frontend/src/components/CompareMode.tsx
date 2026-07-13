"use client";

import { useEffect, useCallback } from "react";
import type { Photo, SelectionStatus } from "@/lib/api";

interface CompareModeProps {
  photos: Photo[];
  leftIndex: number;
  rightIndex: number;
  statuses: Map<string, SelectionStatus | null>;
  favoriteIds: Set<string>;
  accentColor: string;
  onClose: () => void;
  onNavigate: (side: "left" | "right", direction: "prev" | "next") => void;
  onSetStatus: (photoId: string, status: SelectionStatus | null) => void;
  onToggleFavorite: (photoId: string) => void;
}

export default function CompareMode({
  photos,
  leftIndex,
  rightIndex,
  statuses,
  favoriteIds,
  accentColor,
  onClose,
  onNavigate,
  onSetStatus,
  onToggleFavorite,
}: CompareModeProps) {
  const left = photos[leftIndex];
  const right = photos[rightIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate("left", "prev");
      if (e.key === "ArrowRight") onNavigate("right", "next");
    },
    [onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!left || !right) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm opacity-70">Compare Mode</span>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Side by side */}
      <div className="flex-1 flex gap-1 px-2 pb-2">
        {[{ photo: left, index: leftIndex, side: "left" as const }, { photo: right, index: rightIndex, side: "right" as const }].map(
          ({ photo, side }) => {
            const status = statuses.get(photo.id);
            const fav = favoriteIds.has(photo.id);
            return (
              <div key={photo.id} className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                  <img
                    src={photo.full_url || photo.thumbnail_url || ""}
                    alt={photo.filename}
                    className="max-h-[calc(100vh-180px)] max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="text-white/60 text-xs truncate">{photo.filename}</span>
                  <div className="flex items-center gap-2">
                    {(["yes", "maybe", "no"] as SelectionStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onSetStatus(photo.id, status === s ? null : s)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          status === s
                            ? s === "yes"
                              ? "bg-green-500 text-white"
                              : s === "maybe"
                              ? "bg-yellow-500 text-white"
                              : "bg-red-500 text-white"
                            : "text-white/50 hover:text-white/80"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(photo.id)}
                      className={fav ? "text-red-500" : "text-white/40 hover:text-white/70"}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>

      <div className="text-center py-2 text-white/40 text-xs">
        Arrow keys to swap photos · Esc to close
      </div>
    </div>
  );
}
