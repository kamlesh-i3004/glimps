"use client";

import { useEffect, useCallback, useState } from "react";
import type { Photo, SelectionStatus, Comment as CommentType } from "@/lib/api";

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  statuses: Map<string, SelectionStatus | null>;
  favoriteIds: Set<string>;
  comments: Map<string, CommentType[]>;
  accentColor: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onSetStatus: (photoId: string, status: SelectionStatus | null) => void;
  onToggleFavorite: (photoId: string) => void;
  onAddComment: (photoId: string, text: string) => void;
  onCompare: (index: number) => void;
}

const STATUS_BTN = {
  yes: { label: "Yes", key: "Y", active: "bg-green-500 text-white", inactive: "text-white/50 hover:text-white/80" },
  maybe: { label: "Maybe", key: "M", active: "bg-yellow-500 text-white", inactive: "text-white/50 hover:text-white/80" },
  no: { label: "No", key: "N", active: "bg-red-500 text-white", inactive: "text-white/50 hover:text-white/80" },
} as const;

export default function Lightbox({
  photos,
  currentIndex,
  statuses,
  favoriteIds,
  comments,
  accentColor,
  onClose,
  onNavigate,
  onSetStatus,
  onToggleFavorite,
  onAddComment,
  onCompare,
}: LightboxProps) {
  const photo = photos[currentIndex];
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  if (!photo) return null;

  const status = statuses.get(photo.id) ?? null;
  const isFav = favoriteIds.has(photo.id);
  const photoComments = comments.get(photo.id) || [];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture keys when typing in comment input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrev) onNavigate(currentIndex - 1);
          break;
        case "ArrowRight":
          if (hasNext) onNavigate(currentIndex + 1);
          break;
        case "y":
        case "Y":
          onSetStatus(photo.id, status === "yes" ? null : "yes");
          break;
        case "m":
        case "M":
          onSetStatus(photo.id, status === "maybe" ? null : "maybe");
          break;
        case "n":
        case "N":
          onSetStatus(photo.id, status === "no" ? null : "no");
          break;
        case "h":
        case "H":
          onToggleFavorite(photo.id);
          break;
        case "c":
        case "C":
          setShowComments((v) => !v);
          break;
      }
    },
    [onClose, onNavigate, onSetStatus, onToggleFavorite, currentIndex, hasPrev, hasNext, photo.id, status]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(photo.id, commentText.trim());
    setCommentText("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm opacity-70">
          {currentIndex + 1} / {photos.length}
        </span>

        <span className="text-sm truncate max-w-xs">{photo.filename}</span>

        <div className="flex items-center gap-2">
          {/* Status buttons */}
          {(["yes", "maybe", "no"] as SelectionStatus[]).map((s) => {
            const cfg = STATUS_BTN[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSetStatus(photo.id, status === s ? null : s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  status === s ? cfg.active : cfg.inactive
                }`}
              >
                {cfg.label} ({cfg.key})
              </button>
            );
          })}

          {/* Favorite */}
          <button
            type="button"
            onClick={() => onToggleFavorite(photo.id)}
            className={`px-2 py-1 ${isFav ? "text-red-500" : "text-white/50 hover:text-white/80"}`}
            title="Favorite (H)"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>

          {/* Comment toggle */}
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className={`px-2 py-1 text-xs ${showComments ? "text-white" : "text-white/50 hover:text-white/80"}`}
            title="Comments (C)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {photoComments.length > 0 && (
              <span className="ml-1">{photoComments.length}</span>
            )}
          </button>

          {/* Compare */}
          {hasNext && (
            <button
              type="button"
              onClick={() => onCompare(currentIndex)}
              className="px-2 py-1 text-white/50 hover:text-white/80 text-xs"
              title="Compare with next"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
            </button>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image + optional comment panel */}
      <div className="flex-1 flex">
        {/* Image area */}
        <div className="flex-1 flex items-center justify-center relative px-16">
          {hasPrev && (
            <button
              type="button"
              onClick={() => onNavigate(currentIndex - 1)}
              title="Previous photo"
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <img
            src={photo.full_url || photo.thumbnail_url || ""}
            alt={photo.filename}
            className="max-h-[calc(100vh-120px)] max-w-full object-contain"
          />

          {hasNext && (
            <button
              type="button"
              onClick={() => onNavigate(currentIndex + 1)}
              title="Next photo"
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Comment sidebar */}
        {showComments && (
          <div className="w-80 bg-white/5 border-l border-white/10 flex flex-col">
            <div className="p-3 border-b border-white/10">
              <h3 className="text-white text-sm font-medium">Comments</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {photoComments.length === 0 && (
                <p className="text-white/30 text-sm">No comments yet</p>
              )}
              {photoComments.map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="text-white/60 font-medium">{c.client_name || "Anonymous"}</span>
                  <p className="text-white/80 mt-0.5">{c.text}</p>
                  <span className="text-white/30 text-xs">{new Date(c.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmitComment} className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-white/10 text-white text-sm px-3 py-2 rounded-lg placeholder-white/30 outline-none focus:bg-white/15"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-white/20 text-white text-sm rounded-lg hover:bg-white/30"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bottom shortcuts hint */}
      <div className="text-center py-2 text-white/40 text-xs">
        ← → Navigate · Y/M/N Select · H Favorite · C Comments · Esc Close
      </div>
    </div>
  );
}
