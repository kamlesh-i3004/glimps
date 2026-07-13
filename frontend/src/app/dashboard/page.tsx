"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { getMe, getMyAlbums, createAlbum, getAlbumSelections, deleteAlbum, reindexAlbum } from "@/lib/api";
import type { Album, SelectionSummary } from "@/lib/api";
import Link from "next/link";

export default function Dashboard() {
  const { photographer, setPhotographer, albums, setAlbums, addAlbum } =
    useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selections, setSelections] = useState<SelectionSummary[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const me = await getMe();
        setPhotographer(me);
        const myAlbums = await getMyAlbums();
        setAlbums(myAlbums);
      } catch {
        window.location.href = "/";
      }
    }
    init();
  }, [setPhotographer, setAlbums]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const album = await createAlbum({
        title,
        gdrive_folder_url: driveUrl,
        pin: pin || undefined,
      });
      addAlbum(album);
      setTitle("");
      setDriveUrl("");
      setPin("");
      setShowCreate(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewSelections = async (albumId: string) => {
    setSelectedAlbum(albumId);
    const sels = await getAlbumSelections(albumId);
    setSelections(sels);
  };

  const handleDelete = async (albumId: string) => {
    if (!confirm("Delete this album? This cannot be undone.")) return;
    await deleteAlbum(albumId);
    setAlbums(albums.filter((a) => a.id !== albumId));
    if (selectedAlbum === albumId) setSelectedAlbum(null);
  };

  const handleReindex = async (albumId: string) => {
    const updated = await reindexAlbum(albumId);
    setAlbums(albums.map((a) => (a.id === albumId ? updated : a)));
  };

  if (!photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Glimps</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/settings"
            className="text-sm text-gray-500 hover:text-black"
          >
            Branding
          </Link>
          <span className="text-sm text-gray-600">{photographer.name}</span>
          {photographer.avatar_url && (
            <img
              src={photographer.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Your Albums</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            + New Album
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl p-6 border space-y-4"
          >
            <input
              type="text"
              placeholder="Album title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Google Drive folder URL"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="PIN (optional, 4-6 digits)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={6}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Album"}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onViewSelections={() => viewSelections(album.id)}
              onDelete={() => handleDelete(album.id)}
              onReindex={() => handleReindex(album.id)}
            />
          ))}
          {albums.length === 0 && (
            <p className="text-gray-400 col-span-3 text-center py-12">
              No albums yet. Create your first one!
            </p>
          )}
        </div>

        {selectedAlbum && (
          <div className="bg-white rounded-xl p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                Client Selections ({selections.length} clients)
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAlbum(null)}
                className="text-xs text-gray-400 hover:text-black"
              >
                Close
              </button>
            </div>
            {selections.length === 0 ? (
              <p className="text-gray-400">No selections yet. Share the album link with your clients!</p>
            ) : (
              <div className="space-y-2">
                {selections.map((s) => (
                  <div
                    key={s.client_session_id}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {s.client_name || "Anonymous"}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        — {s.total_reviewed} photos reviewed
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      Last: {new Date(s.last_activity).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function AlbumCard({
  album,
  onViewSelections,
  onDelete,
  onReindex,
}: {
  album: Album;
  onViewSelections: () => void;
  onDelete: () => void;
  onReindex: () => void;
}) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/a/${album.slug}`
      : "";

  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-white rounded-xl p-5 border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold truncate">{album.title}</h3>
        <StatusBadge status={album.processing_status} />
      </div>
      <p className="text-sm text-gray-500">{album.total_photos} photos</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="text-xs px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          type="button"
          onClick={onViewSelections}
          className="text-xs px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Selections
        </button>
        <button
          type="button"
          onClick={onReindex}
          className="text-xs px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
        >
          Delete
        </button>
      </div>
      {album.has_pin && (
        <p className="text-xs text-amber-600">PIN protected</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100"}`}
    >
      {status}
    </span>
  );
}
