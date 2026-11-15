from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


# --- Enums ---
class SelectionStatus(str, Enum):
    yes = "yes"
    maybe = "maybe"
    no = "no"


# --- Photographer ---
class PhotographerBranding(BaseModel):
    business_name: str | None = None
    tagline: str | None = None
    logo_url: str | None = None
    primary_color: str = "#000000"
    accent_color: str = "#6366f1"
    website_url: str | None = None
    instagram_handle: str | None = None


class PhotographerResponse(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: str | None
    business_name: str | None
    tagline: str | None
    logo_url: str | None
    primary_color: str
    accent_color: str
    website_url: str | None
    instagram_handle: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Album ---
class AlbumCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    gdrive_folder_url: str = Field(..., min_length=1)
    pin: str | None = Field(None, min_length=4, max_length=6)
    download_enabled: bool = False
    selection_limit: int | None = Field(None, ge=1)


class AlbumUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    pin: str | None = Field(None, min_length=4, max_length=6)
    is_active: bool | None = None
    download_enabled: bool | None = None
    selection_limit: int | None = None


class AlbumResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    slug: str
    share_token: str
    has_pin: bool
    gdrive_folder_url: str
    processing_status: str
    total_photos: int
    download_enabled: bool
    selection_limit: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicPhotographerInfo(BaseModel):
    name: str
    business_name: str | None = None
    tagline: str | None = None
    logo_url: str | None = None
    primary_color: str = "#000000"
    accent_color: str = "#6366f1"
    website_url: str | None = None
    instagram_handle: str | None = None


class PublicAlbumResponse(BaseModel):
    """What clients see — no sensitive data (no gdrive_folder_url, no share_token, no pin)."""

    id: UUID
    title: str
    description: str | None = None
    requires_pin: bool
    total_photos: int
    processing_status: str
    download_enabled: bool
    selection_limit: int | None = None
    photographer: PublicPhotographerInfo


# --- Photo ---
class PhotoResponse(BaseModel):
    id: UUID
    filename: str
    thumbnail_url: str | None
    full_url: str | None
    width: int | None
    height: int | None
    aspect_ratio: float | None
    sort_order: int

    model_config = {"from_attributes": True}


# --- Selection ---
class SelectionSet(BaseModel):
    """Set a photo's selection status or clear it."""
    photo_id: UUID
    status: SelectionStatus | None = None  # None = clear selection
    client_name: str | None = None


class SelectionResponse(BaseModel):
    id: UUID
    photo_id: UUID
    status: str
    client_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Favorite ---
class FavoriteToggle(BaseModel):
    photo_id: UUID


class FavoriteResponse(BaseModel):
    id: UUID
    photo_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Comment ---
class CommentCreate(BaseModel):
    photo_id: UUID
    text: str = Field(..., min_length=1, max_length=2000)
    client_name: str | None = None


class CommentResponse(BaseModel):
    id: UUID
    photo_id: UUID
    client_name: str | None
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Auth ---
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AlbumPinVerify(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6)
