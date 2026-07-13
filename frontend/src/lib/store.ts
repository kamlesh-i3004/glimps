import { create } from "zustand";
import type { Photographer, Album } from "./api";

interface AppStore {
  // Auth
  photographer: Photographer | null;
  setPhotographer: (p: Photographer | null) => void;

  // Albums
  albums: Album[];
  setAlbums: (albums: Album[]) => void;
  addAlbum: (album: Album) => void;

  // Client session (for album browsing)
  clientSession: string;
}

function getOrCreateClientSession(): string {
  if (typeof window === "undefined") return "";
  let session = localStorage.getItem("glimps_client_session");
  if (!session) {
    session = crypto.randomUUID();
    localStorage.setItem("glimps_client_session", session);
  }
  return session;
}

export const useAppStore = create<AppStore>((set) => ({
  photographer: null,
  setPhotographer: (p) => set({ photographer: p }),

  albums: [],
  setAlbums: (albums) => set({ albums }),
  addAlbum: (album) => set((state) => ({ albums: [album, ...state.albums] })),

  clientSession: getOrCreateClientSession(),
}));
