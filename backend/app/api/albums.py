import logging
import time
from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_current_photographer
from app.core.database import async_session, get_db
from app.models.database import Album, Photographer
from app.models.schemas import (
    AlbumCreate,
    AlbumPinVerify,
    AlbumResponse,
    AlbumUpdate,
    CommentCreate,
    CommentResponse,
    FavoriteToggle,
    FavoriteResponse,
    PhotoResponse,
    PublicAlbumResponse,
    SelectionResponse,
    SelectionSet,
)
from app.services.album_service import (
    add_comment,
    create_album,
    delete_album,
    delete_comment,
    get_album_by_share_token,
    get_album_by_slug,
    get_album_comments,
    get_album_photos,
    get_album_selection_summary,
    get_album_selections,
    get_client_favorites,
    get_photo_comments,
    get_photographer_albums,
    index_album_photos,
    reindex_album_photos,
    set_selection,
    toggle_favorite,
    update_album,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["albums"])


# ---------------------------------------------------------------------------
# PIN rate limiting (in-memory)
# NOTE: This only works for a single-worker process. For multiple uvicorn
#       workers or a multi-node deployment, replace with Redis-backed storage
#       (e.g. redis INCR with TTL).
# ---------------------------------------------------------------------------
_pin_attempts: dict[str, list[float]] = defaultdict(list)
_PIN_MAX_ATTEMPTS = 5
_PIN_LOCKOUT_SECONDS = 15 * 60  # 15 minutes
_PIN_WINDOW_SECONDS = 15 * 60   # count attempts within this window


def _check_pin_rate_limit(album_identifier: str, client_ip: str) -> None:
    """Raise 429 if this IP has exceeded PIN attempts for this album."""
    key = f"{album_identifier}:{client_ip}"
    now = time.monotonic()

    # Prune old entries
    _pin_attempts[key] = [t for t in _pin_attempts[key] if now - t < _PIN_WINDOW_SECONDS]

    if len(_pin_attempts[key]) >= _PIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many PIN attempts. Try again later.",
        )


def _record_pin_failure(album_identifier: str, client_ip: str) -> None:
    key = f"{album_identifier}:{client_ip}"
    _pin_attempts[key].append(time.monotonic())


def _clear_pin_attempts(album_identifier: str, client_ip: str) -> None:
    key = f"{album_identifier}:{client_ip}"
    _pin_attempts.pop(key, None)


# ============================================================
# Photographer endpoints (authenticated)
# ============================================================


@router.post("/api/albums", response_model=AlbumResponse, status_code=201)
async def create_new_album(
    data: AlbumCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    album = await create_album(
        db=db,
        photographer_id=photographer.id,
        title=data.title,
        description=data.description,
        gdrive_folder_url=data.gdrive_folder_url,
        pin=data.pin,
        download_enabled=data.download_enabled,
        selection_limit=data.selection_limit,
    )
    await db.commit()

    album_id = album.id
    access_token = photographer.google_access_token

    async def _index():
        async with async_session() as session:
            try:
                await index_album_photos(session, album_id, access_token)
                await session.commit()
            except Exception:
                logger.exception("Background photo indexing failed for album %s", album_id)
                await session.rollback()

    background_tasks.add_task(_index)
    return _album_response(album)


@router.get("/api/albums", response_model=list[AlbumResponse])
async def list_my_albums(
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    albums = await get_photographer_albums(db, photographer.id)
    return [_album_response(a) for a in albums]


@router.get("/api/albums/{album_id}", response_model=AlbumResponse)
async def get_my_album(
    album_id: UUID,
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    album = await db.get(Album, album_id)
    if not album or album.photographer_id != photographer.id:
        raise HTTPException(status_code=404, detail="Album not found")
    return _album_response(album)


@router.patch("/api/albums/{album_id}", response_model=AlbumResponse)
async def update_my_album(
    album_id: UUID,
    data: AlbumUpdate,
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    album = await db.get(Album, album_id)
    if not album or album.photographer_id != photographer.id:
        raise HTTPException(status_code=404, detail="Album not found")
    updated = await update_album(db, album, **data.model_dump(exclude_unset=True))
    return _album_response(updated)


@router.delete("/api/albums/{album_id}", status_code=204)
async def delete_my_album(
    album_id: UUID,
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    album = await db.get(Album, album_id)
    if not album or album.photographer_id != photographer.id:
        raise HTTPException(status_code=404, detail="Album not found")
    await delete_album(db, album)


@router.post("/api/albums/{album_id}/reindex", response_model=AlbumResponse)
async def reindex_my_album(
    album_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    album = await db.get(Album, album_id)
    if not album or album.photographer_id != photographer.id:
        raise HTTPException(status_code=404, detail="Album not found")

    album.processing_status = "pending"
    await db.flush()
    await db.commit()

    access_token = photographer.google_access_token

    async def _reindex():
        async with async_session() as session:
            try:
                await reindex_album_photos(session, album_id, access_token)
                await session.commit()
            except Exception:
                logger.exception("Background reindex failed for album %s", album_id)
                await session.rollback()

    background_tasks.add_task(_reindex)
    return _album_response(album)


@router.get("/api/albums/{album_id}/selections")
async def list_album_selections(
    album_id: UUID,
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    """Selection summary grouped by client with yes/maybe/no counts."""
    album = await db.get(Album, album_id)
    if not album or album.photographer_id != photographer.id:
        raise HTTPException(status_code=404, detail="Album not found")
    return await get_album_selection_summary(db, album_id)


@router.get("/api/albums/{album_id}/selections/detail", response_model=list[SelectionResponse])
async def list_album_selections_detail(
    album_id: UUID,
    client_session: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    album = await db.get(Album, album_id)
    if not album or album.photographer_id != photographer.id:
        raise HTTPException(status_code=404, detail="Album not found")
    return await get_album_selections(db, album_id, client_session)


@router.get("/api/albums/{album_id}/comments", response_model=list[CommentResponse])
async def list_album_comments(
    album_id: UUID,
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    """View all comments on an album's photos."""
    album = await db.get(Album, album_id)
    if not album or album.photographer_id != photographer.id:
        raise HTTPException(status_code=404, detail="Album not found")
    return await get_album_comments(db, album_id)


@router.get("/api/albums/{album_id}/photos", response_model=list[PhotoResponse])
async def list_album_photos_auth(
    album_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    album = await db.get(Album, album_id)
    if not album or album.photographer_id != photographer.id:
        raise HTTPException(status_code=404, detail="Album not found")
    photos, _ = await get_album_photos(db, album.id, page, per_page)
    return photos


# ============================================================
# Public/client endpoints (no auth required)
# Resolved exclusively by share_token (never by slug)
# ============================================================


@router.get("/api/a/{share_token}", response_model=PublicAlbumResponse)
async def get_public_album(share_token: str, db: AsyncSession = Depends(get_db)):
    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    return {
        "id": album.id,
        "title": album.title,
        "description": album.description,
        "requires_pin": album.pin is not None,
        "total_photos": album.total_photos,
        "processing_status": album.processing_status,
        "download_enabled": album.download_enabled,
        "selection_limit": album.selection_limit,
        "photographer": {
            "name": album.photographer.name,
            "business_name": album.photographer.business_name,
            "tagline": album.photographer.tagline,
            "logo_url": album.photographer.logo_url,
            "primary_color": album.photographer.primary_color,
            "accent_color": album.photographer.accent_color,
            "website_url": album.photographer.website_url,
            "instagram_handle": album.photographer.instagram_handle,
        },
    }


@router.post("/api/a/{share_token}/verify-pin")
async def verify_album_pin(
    share_token: str,
    data: AlbumPinVerify,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    _check_pin_rate_limit(share_token, client_ip)

    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    if album.pin and album.pin != data.pin:
        _record_pin_failure(share_token, client_ip)
        raise HTTPException(status_code=403, detail="Incorrect PIN")

    _clear_pin_attempts(share_token, client_ip)
    return {"access": True, "album_id": album.id}


@router.get("/api/a/{share_token}/photos", response_model=list[PhotoResponse])
async def get_public_album_photos(
    share_token: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    photos, _ = await get_album_photos(db, album.id, page, per_page)
    return photos


# --- Selection (yes/maybe/no/clear) ---

@router.post("/api/a/{share_token}/select")
async def set_photo_selection(
    share_token: str,
    data: SelectionSet,
    client_session: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Set a photo's selection status (yes/maybe/no) or clear it (status=null)."""
    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Check selection limit for "yes" selections
    if data.status and data.status.value == "yes" and album.selection_limit:
        existing = await get_album_selections(db, album.id, client_session)
        yes_count = sum(1 for s in existing if s.status == "yes" and s.photo_id != data.photo_id)
        if yes_count >= album.selection_limit:
            raise HTTPException(
                status_code=400,
                detail=f"Selection limit reached ({album.selection_limit} photos)",
            )

    try:
        selection = await set_selection(
            db=db,
            album_id=album.id,
            photo_id=data.photo_id,
            client_session_id=client_session,
            status=data.status.value if data.status else None,
            client_name=data.client_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if selection:
        return {"status": selection.status, "photo_id": str(data.photo_id)}
    return {"status": None, "photo_id": str(data.photo_id)}


@router.get("/api/a/{share_token}/selections", response_model=list[SelectionResponse])
async def get_client_selections_route(
    share_token: str,
    client_session: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return await get_album_selections(db, album.id, client_session)


# --- Favorites ---

@router.post("/api/a/{share_token}/favorite")
async def toggle_photo_favorite(
    share_token: str,
    data: FavoriteToggle,
    client_session: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Toggle favorite on a photo."""
    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    try:
        favorited = await toggle_favorite(db, album.id, data.photo_id, client_session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {"favorited": favorited, "photo_id": str(data.photo_id)}


@router.get("/api/a/{share_token}/favorites", response_model=list[FavoriteResponse])
async def get_client_favorites_route(
    share_token: str,
    client_session: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return await get_client_favorites(db, album.id, client_session)


# --- Comments ---

@router.post("/api/a/{share_token}/comment", response_model=CommentResponse, status_code=201)
async def add_photo_comment(
    share_token: str,
    data: CommentCreate,
    client_session: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    return await add_comment(
        db=db,
        album_id=album.id,
        photo_id=data.photo_id,
        client_session_id=client_session,
        text=data.text,
        client_name=data.client_name,
    )


@router.get("/api/a/{share_token}/photos/{photo_id}/comments", response_model=list[CommentResponse])
async def get_comments_for_photo(
    share_token: str,
    photo_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return await get_photo_comments(db, photo_id)


@router.delete("/api/a/{share_token}/comment/{comment_id}", status_code=204)
async def delete_photo_comment(
    share_token: str,
    comment_id: UUID,
    client_session: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    album = await get_album_by_share_token(db, share_token)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    deleted = await delete_comment(db, comment_id, client_session)
    if not deleted:
        raise HTTPException(status_code=404, detail="Comment not found")


# ============================================================
# Helpers
# ============================================================


def _album_response(album: Album) -> dict:
    return {
        "id": album.id,
        "title": album.title,
        "description": album.description,
        "slug": album.slug,
        "has_pin": album.pin is not None,
        "share_token": album.share_token,
        "gdrive_folder_url": album.gdrive_folder_url,
        "processing_status": album.processing_status,
        "total_photos": album.total_photos,
        "download_enabled": album.download_enabled,
        "selection_limit": album.selection_limit,
        "created_at": album.created_at,
    }
