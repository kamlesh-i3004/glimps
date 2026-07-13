"use client";

import { useMemo } from "react";
import type { Photo, SelectionStatus } from "@/lib/api";
import type { LayoutType } from "./LayoutSwitcher";
import PhotoActions from "./PhotoActions";

interface PhotoGridProps {
  photos: Photo[];
  statuses: Map<string, SelectionStatus | null>;
  favoriteIds: Set<string>;
  accentColor: string;
  layout: LayoutType;
  columns?: number;
  onSetStatus: (photoId: string, status: SelectionStatus | null) => void;
  onToggleFavorite: (photoId: string) => void;
  onOpen: (index: number) => void;
  onCompare?: (index: number) => void;
}

export default function PhotoGrid({
  photos,
  statuses,
  favoriteIds,
  accentColor,
  layout,
  columns = 4,
  onSetStatus,
  onToggleFavorite,
  onOpen,
}: PhotoGridProps) {
  if (layout === "grid") return <GridLayout photos={photos} statuses={statuses} favoriteIds={favoriteIds} accentColor={accentColor} onSetStatus={onSetStatus} onToggleFavorite={onToggleFavorite} onOpen={onOpen} />;
  if (layout === "column") return <ColumnLayout photos={photos} statuses={statuses} favoriteIds={favoriteIds} accentColor={accentColor} onSetStatus={onSetStatus} onToggleFavorite={onToggleFavorite} onOpen={onOpen} />;
  if (layout === "justified") return <JustifiedLayout photos={photos} statuses={statuses} favoriteIds={favoriteIds} accentColor={accentColor} onSetStatus={onSetStatus} onToggleFavorite={onToggleFavorite} onOpen={onOpen} />;
  return <MasonryLayout photos={photos} statuses={statuses} favoriteIds={favoriteIds} accentColor={accentColor} columns={columns} onSetStatus={onSetStatus} onToggleFavorite={onToggleFavorite} onOpen={onOpen} />;
}

// Shared card wrapper
function PhotoCard({
  photo,
  index,
  status,
  isFavorited,
  accentColor,
  onSetStatus,
  onToggleFavorite,
  onOpen,
  className = "",
  style,
}: {
  photo: Photo;
  index: number;
  status: SelectionStatus | null;
  isFavorited: boolean;
  accentColor: string;
  onSetStatus: (status: SelectionStatus | null) => void;
  onToggleFavorite: () => void;
  onOpen: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const borderColor = status === "yes" ? "#22c55e" : status === "maybe" ? "#eab308" : status === "no" ? "#ef4444" : "transparent";

  return (
    <div
      className={`relative rounded-lg overflow-hidden group cursor-pointer transition-all ${className}`}
      style={{
        border: `3px solid ${borderColor}`,
        ...style,
      }}
    >
      <PhotoActions
        photoId={photo.id}
        status={status}
        isFavorited={isFavorited}
        accentColor={accentColor}
        onSetStatus={onSetStatus}
        onToggleFavorite={onToggleFavorite}
      />
      <img
        src={photo.thumbnail_url || ""}
        alt={photo.filename}
        className="w-full h-full object-cover"
        loading="lazy"
        onClick={onOpen}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{photo.filename}</p>
      </div>
    </div>
  );
}

type CommonProps = Omit<PhotoGridProps, "layout" | "columns" | "onCompare">;

// --- Masonry ---
function MasonryLayout({ photos, statuses, favoriteIds, accentColor, columns = 4, onSetStatus, onToggleFavorite, onOpen }: CommonProps & { columns?: number }) {
  const columnData = useMemo(() => {
    const cols: { photos: { photo: Photo; index: number }[]; height: number }[] =
      Array.from({ length: columns }, () => ({ photos: [], height: 0 }));
    photos.forEach((photo, index) => {
      const shortest = cols.reduce((min, col, i) => col.height < cols[min].height ? i : min, 0);
      const ratio = photo.aspect_ratio || 1.5;
      cols[shortest].photos.push({ photo, index });
      cols[shortest].height += 1 / ratio;
    });
    return cols;
  }, [photos, columns]);

  return (
    <div className="flex gap-2">
      {columnData.map((col, colIdx) => (
        <div key={colIdx} className="flex-1 flex flex-col gap-2">
          {col.photos.map(({ photo, index }) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={index}
              status={statuses.get(photo.id) ?? null}
              isFavorited={favoriteIds.has(photo.id)}
              accentColor={accentColor}
              onSetStatus={(s) => onSetStatus(photo.id, s)}
              onToggleFavorite={() => onToggleFavorite(photo.id)}
              onOpen={() => onOpen(index)}
              style={{ aspectRatio: photo.aspect_ratio || 1.5 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// --- Grid (uniform squares) ---
function GridLayout({ photos, statuses, favoriteIds, accentColor, onSetStatus, onToggleFavorite, onOpen }: CommonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={index}
          status={statuses.get(photo.id) ?? null}
          isFavorited={favoriteIds.has(photo.id)}
          accentColor={accentColor}
          onSetStatus={(s) => onSetStatus(photo.id, s)}
          onToggleFavorite={() => onToggleFavorite(photo.id)}
          onOpen={() => onOpen(index)}
          className="aspect-square"
        />
      ))}
    </div>
  );
}

// --- Column (one per row, large) ---
function ColumnLayout({ photos, statuses, favoriteIds, accentColor, onSetStatus, onToggleFavorite, onOpen }: CommonProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={index}
          status={statuses.get(photo.id) ?? null}
          isFavorited={favoriteIds.has(photo.id)}
          accentColor={accentColor}
          onSetStatus={(s) => onSetStatus(photo.id, s)}
          onToggleFavorite={() => onToggleFavorite(photo.id)}
          onOpen={() => onOpen(index)}
          style={{ aspectRatio: photo.aspect_ratio || 1.5 }}
        />
      ))}
    </div>
  );
}

// --- Justified (rows with consistent height) ---
function JustifiedLayout({ photos, statuses, favoriteIds, accentColor, onSetStatus, onToggleFavorite, onOpen }: CommonProps) {
  const rows = useMemo(() => {
    const result: { photo: Photo; index: number; width: number }[][] = [];
    let currentRow: { photo: Photo; index: number; width: number }[] = [];
    let rowWidth = 0;
    const targetRowHeight = 250;
    const containerWidth = 1200;

    photos.forEach((photo, index) => {
      const ratio = photo.aspect_ratio || 1.5;
      const width = targetRowHeight * ratio;
      currentRow.push({ photo, index, width });
      rowWidth += width;

      if (rowWidth >= containerWidth) {
        result.push(currentRow);
        currentRow = [];
        rowWidth = 0;
      }
    });
    if (currentRow.length) result.push(currentRow);
    return result;
  }, [photos]);

  return (
    <div className="space-y-2">
      {rows.map((row, rowIdx) => {
        const totalWidth = row.reduce((sum, item) => sum + item.width, 0);
        return (
          <div key={rowIdx} className="flex gap-2">
            {row.map(({ photo, index, width }) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={index}
                status={statuses.get(photo.id) ?? null}
                isFavorited={favoriteIds.has(photo.id)}
                accentColor={accentColor}
                onSetStatus={(s) => onSetStatus(photo.id, s)}
                onToggleFavorite={() => onToggleFavorite(photo.id)}
                onOpen={() => onOpen(index)}
                style={{ flex: `${width / totalWidth}`, aspectRatio: photo.aspect_ratio || 1.5 }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
