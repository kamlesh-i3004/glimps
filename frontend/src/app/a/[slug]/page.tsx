"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useAppStore } from "@/lib/store";
import {
  getPublicAlbum,
  getAlbumPhotos,
  verifyAlbumPin,
  setPhotoSelection,
  getClientSelections,
  togglePhotoFavorite,
  getClientFavorites,
  addPhotoComment,
  getPhotoComments,
} from "@/lib/api";
import type { PublicAlbum, Photo, SelectionStatus, Comment } from "@/lib/api";
import PhotoGrid from "@/components/MasonryGrid";
import Lightbox from "@/components/Lightbox";
import CompareMode from "@/components/CompareMode";
import FilterBar, { type FilterType } from "@/components/FilterBar";
import ProgressBar from "@/components/ProgressBar";
import LayoutSwitcher, { type LayoutType } from "@/components/LayoutSwitcher";

function useResponsiveColumns() {
  const [columns, setColumns] = useState(4);
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) setColumns(2);
      else if (w < 768) setColumns(3);
      else if (w < 1024) setColumns(4);
      else setColumns(5);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return columns;
}

export default function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { clientSession } = useAppStore();
  const columns = useResponsiveColumns();

  const [album, setAlbum] = useState<PublicAlbum | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [statuses, setStatuses] = useState<Map<string, SelectionStatus | null>>(new Map());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Map<string, Comment[]>>(new Map());
  const [needsPin, setNeedsPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // UI state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [compareIndices, setCompareIndices] = useState<[number, number] | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [layout, setLayout] = useState<LayoutType>("masonry");

  // Load album
  useEffect(() => {
    async function loadAlbum() {
      try {
        const data = await getPublicAlbum(slug);
        setAlbum(data);
        if (data.requires_pin) setNeedsPin(true);
        else setAuthorized(true);
      } catch {
        setAlbum(null);
      } finally {
        setLoading(false);
      }
    }
    loadAlbum();
  }, [slug]);

  // Load photos + selections + favorites
  useEffect(() => {
    if (!authorized) return;

    async function loadPhotos() {
      const data = await getAlbumPhotos(slug, page);
      setPhotos((prev) => (page === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === 50);
    }
    async function loadSelections() {
      const sels = await getClientSelections(slug, clientSession);
      const map = new Map<string, SelectionStatus | null>();
      sels.forEach((s) => map.set(s.photo_id, s.status));
      setStatuses(map);
    }
    async function loadFavorites() {
      const favs = await getClientFavorites(slug, clientSession);
      setFavoriteIds(new Set(favs.map((f) => f.photo_id)));
    }

    loadPhotos();
    loadSelections();
    loadFavorites();
  }, [authorized, slug, page, clientSession]);

  // Handlers
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyAlbumPin(slug, pinInput);
      setAuthorized(true);
      setNeedsPin(false);
    } catch {
      setPinError("Incorrect PIN");
    }
  };

  const handleSetStatus = useCallback(
    async (photoId: string, status: SelectionStatus | null) => {
      setStatuses((prev) => new Map(prev).set(photoId, status));
      try {
        await setPhotoSelection(slug, photoId, status, clientSession);
      } catch {
        // Revert on error
        setStatuses((prev) => {
          const next = new Map(prev);
          next.delete(photoId);
          return next;
        });
      }
    },
    [slug, clientSession]
  );

  const handleToggleFavorite = useCallback(
    async (photoId: string) => {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(photoId)) next.delete(photoId);
        else next.add(photoId);
        return next;
      });
      try {
        await togglePhotoFavorite(slug, photoId, clientSession);
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (next.has(photoId)) next.delete(photoId);
          else next.add(photoId);
          return next;
        });
      }
    },
    [slug, clientSession]
  );

  const handleAddComment = useCallback(
    async (photoId: string, text: string) => {
      try {
        const comment = await addPhotoComment(slug, photoId, text, clientSession);
        setComments((prev) => {
          const next = new Map(prev);
          const existing = next.get(photoId) || [];
          next.set(photoId, [...existing, comment]);
          return next;
        });
      } catch {
        // silent fail
      }
    },
    [slug, clientSession]
  );

  // Load comments when opening lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const photo = displayPhotos[lightboxIndex];
    if (!photo || comments.has(photo.id)) return;

    getPhotoComments(slug, photo.id).then((c) => {
      setComments((prev) => new Map(prev).set(photo.id, c));
    });
  }, [lightboxIndex, slug]);

  const handleCompare = (index: number) => {
    const nextIndex = index + 1 < displayPhotos.length ? index + 1 : index;
    setLightboxIndex(null);
    setCompareIndices([index, nextIndex]);
  };

  // Filtering
  const displayPhotos = photos.filter((p) => {
    const s = statuses.get(p.id);
    switch (filter) {
      case "yes": return s === "yes";
      case "maybe": return s === "maybe";
      case "no": return s === "no";
      case "favorites": return favoriteIds.has(p.id);
      case "unreviewed": return !s;
      default: return true;
    }
  });

  const counts = {
    all: photos.length,
    yes: photos.filter((p) => statuses.get(p.id) === "yes").length,
    maybe: photos.filter((p) => statuses.get(p.id) === "maybe").length,
    no: photos.filter((p) => statuses.get(p.id) === "no").length,
    favorites: photos.filter((p) => favoriteIds.has(p.id)).length,
    unreviewed: photos.filter((p) => !statuses.get(p.id)).length,
  };

  const totalReviewed = counts.yes + counts.maybe + counts.no;

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto" />
          <p className="text-gray-500">Loading album...</p>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold">404</p>
          <p className="text-gray-500">Album not found</p>
        </div>
      </div>
    );
  }

  if (needsPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-6 max-w-sm">
          {album.photographer.logo_url && (
            <img src={album.photographer.logo_url} alt="" className="h-16 mx-auto" />
          )}
          <h1 className="text-2xl font-bold">{album.title}</h1>
          <p className="text-gray-500">
            by {album.photographer.business_name || album.photographer.name}
          </p>
          <form onSubmit={handleVerifyPin} className="space-y-3">
            <input
              type="text"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              maxLength={6}
              className="w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest"
            />
            {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
            <button type="submit" className="w-full py-3 bg-black text-white rounded-lg font-medium">
              View Album
            </button>
          </form>
        </div>
      </div>
    );
  }

  const p = album.photographer;

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Branded header */}
      <header className="px-6 py-8 text-center text-white" style={{ backgroundColor: p.primary_color }}>
        {p.logo_url && <img src={p.logo_url} alt="" className="h-12 mx-auto mb-3" />}
        <h1 className="text-3xl font-bold">{album.title}</h1>
        <p className="text-sm opacity-80 mt-1">by {p.business_name || p.name}</p>
        {p.tagline && <p className="text-xs opacity-60 mt-1">{p.tagline}</p>}
        {album.description && (
          <p className="text-sm opacity-70 mt-3 max-w-lg mx-auto">{album.description}</p>
        )}
      </header>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 py-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <FilterBar active={filter} onChange={setFilter} counts={counts} accentColor={p.accent_color} />
          <LayoutSwitcher active={layout} onChange={setLayout} />
        </div>
        <ProgressBar reviewed={totalReviewed} total={album.total_photos} accentColor={p.accent_color} />
        {album.selection_limit && (
          <p className="text-xs text-gray-500">
            Selection limit: {counts.yes}/{album.selection_limit} picks used
          </p>
        )}
      </div>

      {/* Photo grid */}
      <div className="max-w-7xl mx-auto p-3 sm:p-4">
        {displayPhotos.length > 0 ? (
          <PhotoGrid
            photos={displayPhotos}
            statuses={statuses}
            favoriteIds={favoriteIds}
            accentColor={p.accent_color}
            layout={layout}
            columns={columns}
            onSetStatus={handleSetStatus}
            onToggleFavorite={handleToggleFavorite}
            onOpen={setLightboxIndex}
          />
        ) : (
          <p className="text-center py-16 text-gray-400">
            {filter === "all" ? "No photos in this album yet." : `No ${filter} photos.`}
          </p>
        )}

        {hasMore && filter === "all" && (
          <div className="text-center py-8">
            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              className="px-6 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
            >
              Load more photos
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 space-x-2">
        {p.website_url && (
          <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
            {p.business_name || p.name}
          </a>
        )}
        {p.instagram_handle && (
          <>
            <span>·</span>
            <a href={`https://instagram.com/${p.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
              @{p.instagram_handle}
            </a>
          </>
        )}
        <span>·</span>
        <span>Powered by Glimps</span>
      </footer>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={displayPhotos}
          currentIndex={lightboxIndex}
          statuses={statuses}
          favoriteIds={favoriteIds}
          comments={comments}
          accentColor={p.accent_color}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onSetStatus={handleSetStatus}
          onToggleFavorite={handleToggleFavorite}
          onAddComment={handleAddComment}
          onCompare={handleCompare}
        />
      )}

      {/* Compare Mode */}
      {compareIndices && (
        <CompareMode
          photos={displayPhotos}
          leftIndex={compareIndices[0]}
          rightIndex={compareIndices[1]}
          statuses={statuses}
          favoriteIds={favoriteIds}
          accentColor={p.accent_color}
          onClose={() => setCompareIndices(null)}
          onNavigate={(side, dir) => {
            setCompareIndices((prev) => {
              if (!prev) return [0, 1];
              const [l, r] = prev;
              if (side === "left") {
                const next = dir === "prev" ? l - 1 : l + 1;
                if (next >= 0 && next < displayPhotos.length && next !== r) return [next, r];
              } else {
                const next = dir === "prev" ? r - 1 : r + 1;
                if (next >= 0 && next < displayPhotos.length && next !== l) return [l, next];
              }
              return prev;
            });
          }}
          onSetStatus={handleSetStatus}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </main>
  );
}
