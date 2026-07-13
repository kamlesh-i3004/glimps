const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Auth ---
export const getGoogleAuthUrl = () =>
  fetchAPI<{ auth_url: string }>("/api/auth/google/login");

export const logout = () =>
  fetchAPI("/api/auth/logout", { method: "POST" });

// --- Photographer ---
export const getMe = () =>
  fetchAPI<Photographer>("/api/photographer/me");

export const updateBranding = (data: Partial<PhotographerBranding>) =>
  fetchAPI<Photographer>("/api/photographer/branding", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export async function uploadLogo(file: File): Promise<Photographer> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/photographer/logo`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Albums (photographer) ---
export const createAlbum = (data: AlbumCreateInput) =>
  fetchAPI<Album>("/api/albums", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMyAlbums = () => fetchAPI<Album[]>("/api/albums");

export const getMyAlbum = (albumId: string) =>
  fetchAPI<Album>(`/api/albums/${albumId}`);

export const updateAlbum = (albumId: string, data: Partial<AlbumUpdateInput>) =>
  fetchAPI<Album>(`/api/albums/${albumId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteAlbum = (albumId: string) =>
  fetchAPI<void>(`/api/albums/${albumId}`, { method: "DELETE" });

export const reindexAlbum = (albumId: string) =>
  fetchAPI<Album>(`/api/albums/${albumId}/reindex`, { method: "POST" });

export const getAlbumSelections = (albumId: string) =>
  fetchAPI<SelectionSummary[]>(`/api/albums/${albumId}/selections`);

export const getAlbumSelectionsDetail = (albumId: string, clientSession?: string) => {
  const params = clientSession ? `?client_session=${clientSession}` : "";
  return fetchAPI<Selection[]>(`/api/albums/${albumId}/selections/detail${params}`);
};

export const getAlbumComments = (albumId: string) =>
  fetchAPI<Comment[]>(`/api/albums/${albumId}/comments`);

// --- Public album (client) ---
export const getPublicAlbum = (slug: string) =>
  fetchAPI<PublicAlbum>(`/api/a/${slug}`);

export const verifyAlbumPin = (slug: string, pin: string) =>
  fetchAPI<{ access: boolean; album_id: string }>(`/api/a/${slug}/verify-pin`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });

export const getAlbumPhotos = (slug: string, page = 1, perPage = 50) =>
  fetchAPI<Photo[]>(`/api/a/${slug}/photos?page=${page}&per_page=${perPage}`);

// Selection (yes/maybe/no/clear)
export const setPhotoSelection = (
  slug: string,
  photoId: string,
  status: SelectionStatus | null,
  clientSession: string,
  clientName?: string
) =>
  fetchAPI<{ status: string | null; photo_id: string }>(
    `/api/a/${slug}/select?client_session=${clientSession}`,
    {
      method: "POST",
      body: JSON.stringify({ photo_id: photoId, status, client_name: clientName }),
    }
  );

export const getClientSelections = (slug: string, clientSession: string) =>
  fetchAPI<Selection[]>(`/api/a/${slug}/selections?client_session=${clientSession}`);

// Favorites
export const togglePhotoFavorite = (
  slug: string,
  photoId: string,
  clientSession: string
) =>
  fetchAPI<{ favorited: boolean; photo_id: string }>(
    `/api/a/${slug}/favorite?client_session=${clientSession}`,
    {
      method: "POST",
      body: JSON.stringify({ photo_id: photoId }),
    }
  );

export const getClientFavorites = (slug: string, clientSession: string) =>
  fetchAPI<Favorite[]>(`/api/a/${slug}/favorites?client_session=${clientSession}`);

// Comments
export const addPhotoComment = (
  slug: string,
  photoId: string,
  text: string,
  clientSession: string,
  clientName?: string
) =>
  fetchAPI<Comment>(
    `/api/a/${slug}/comment?client_session=${clientSession}`,
    {
      method: "POST",
      body: JSON.stringify({ photo_id: photoId, text, client_name: clientName }),
    }
  );

export const getPhotoComments = (slug: string, photoId: string) =>
  fetchAPI<Comment[]>(`/api/a/${slug}/photos/${photoId}/comments`);

export const deletePhotoComment = (
  slug: string,
  commentId: string,
  clientSession: string
) =>
  fetchAPI<void>(
    `/api/a/${slug}/comment/${commentId}?client_session=${clientSession}`,
    { method: "DELETE" }
  );

// --- Types ---
export type SelectionStatus = "yes" | "maybe" | "no";

export interface Photographer {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  business_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  website_url: string | null;
  instagram_handle: string | null;
  created_at: string;
}

export interface PhotographerBranding {
  business_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  website_url: string | null;
  instagram_handle: string | null;
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  has_pin: boolean;
  gdrive_folder_url: string;
  processing_status: string;
  total_photos: number;
  download_enabled: boolean;
  selection_limit: number | null;
  created_at: string;
}

export interface AlbumCreateInput {
  title: string;
  description?: string;
  gdrive_folder_url: string;
  pin?: string;
  download_enabled?: boolean;
  selection_limit?: number;
}

export interface AlbumUpdateInput {
  title?: string;
  description?: string;
  pin?: string;
  is_active?: boolean;
  download_enabled?: boolean;
  selection_limit?: number;
}

export interface Photo {
  id: string;
  filename: string;
  thumbnail_url: string | null;
  full_url: string | null;
  width: number | null;
  height: number | null;
  aspect_ratio: number | null;
  sort_order: number;
}

export interface Selection {
  id: string;
  photo_id: string;
  status: SelectionStatus;
  client_name: string | null;
  created_at: string;
}

export interface SelectionSummary {
  client_session_id: string;
  client_name: string | null;
  yes_count: number;
  maybe_count: number;
  no_count: number;
  total_reviewed: number;
  last_activity: string;
}

export interface Favorite {
  id: string;
  photo_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  photo_id: string;
  client_name: string | null;
  text: string;
  created_at: string;
}

export interface PublicAlbum {
  id: string;
  title: string;
  description: string | null;
  requires_pin: boolean;
  total_photos: number;
  processing_status: string;
  download_enabled: boolean;
  selection_limit: number | null;
  photographer: {
    name: string;
    business_name: string | null;
    tagline: string | null;
    logo_url: string | null;
    primary_color: string;
    accent_color: string;
    website_url: string | null;
    instagram_handle: string | null;
  };
}
