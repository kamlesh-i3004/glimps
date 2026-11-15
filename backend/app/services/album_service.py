import secrets
import string
import uuid
from uuid import UUID

from sqlalchemy import delete as sa_delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.database import Album, Comment, Favorite, Photo, Selection
from app.services.gdrive import extract_folder_id, get_thumbnail_url, list_folder_images


def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from title + random suffix."""
    base = title.lower().strip()
    base = "".join(c if c.isalnum() or c == " " else "" for c in base)
    base = "-".join(base.split())
    suffix = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    return f"{base}-{suffix}"


async def create_album(
    db: AsyncSession,
    photographer_id: UUID,
    title: str,
    description: str | None,
    gdrive_folder_url: str,
    pin: str | None,
    download_enabled: bool = False,
    selection_limit: int | None = None,
) -> Album:
    """Create an album and start indexing photos from GDrive."""
    folder_id = extract_folder_id(gdrive_folder_url)
    if not folder_id:
        raise ValueError("Invalid Google Drive folder URL")

    album = Album(
        photographer_id=photographer_id,
        title=title,
        description=description,
        slug=generate_slug(title),
        share_token=secrets.token_urlsafe(32),
        pin=pin,
        gdrive_folder_id=folder_id,
        gdrive_folder_url=gdrive_folder_url,
        download_enabled=download_enabled,
        selection_limit=selection_limit,
        processing_status="pending",
    )
    db.add(album)
    await db.flush()
    return album


async def index_album_photos(
    db: AsyncSession, album_id: UUID, access_token: str
) -> int:
    """Fetch photos from GDrive and store metadata in DB."""
    album = await db.get(Album, album_id)
    if not album:
        raise ValueError("Album not found")

    album.processing_status = "processing"
    await db.flush()

    try:
        images = await list_folder_images(access_token, album.gdrive_folder_id)

        for i, img in enumerate(images):
            photo = Photo(
                album_id=album_id,
                gdrive_file_id=img["gdrive_file_id"],
                filename=img["filename"],
                thumbnail_url=img.get("thumbnail_url")
                or get_thumbnail_url(img["gdrive_file_id"]),
                full_url=img.get("full_url"),
                width=img.get("width"),
                height=img.get("height"),
                size_bytes=img.get("size_bytes"),
                mime_type=img.get("mime_type"),
                sort_order=i,
            )
            db.add(photo)

        album.total_photos = len(images)
        album.processing_status = "completed"
        await db.flush()
        return len(images)

    except Exception:
        album.processing_status = "failed"
        await db.flush()
        raise


async def get_album_by_slug(db: AsyncSession, slug: str) -> Album | None:
    """Look up an album by slug for authenticated photographer routes."""
    result = await db.execute(
        select(Album)
        .where(Album.slug == slug, Album.is_active == True)
        .options(selectinload(Album.photographer))
    )
    return result.scalar_one_or_none()


async def get_album_by_share_token(db: AsyncSession, token: str) -> Album | None:
    """Look up an album by its share token (used exclusively for public client access)."""
    result = await db.execute(
        select(Album)
        .where(Album.share_token == token, Album.is_active == True)
        .options(selectinload(Album.photographer))
    )
    return result.scalar_one_or_none()


async def get_album_photos(
    db: AsyncSession, album_id: UUID, page: int = 1, per_page: int = 50
) -> tuple[list[Photo], int]:
    offset = (page - 1) * per_page
    count_result = await db.execute(
        select(func.count()).where(Photo.album_id == album_id)
    )
    total = count_result.scalar()
    result = await db.execute(
        select(Photo)
        .where(Photo.album_id == album_id)
        .order_by(Photo.sort_order)
        .offset(offset)
        .limit(per_page)
    )
    return list(result.scalars().all()), total


async def get_photographer_albums(
    db: AsyncSession, photographer_id: UUID
) -> list[Album]:
    result = await db.execute(
        select(Album)
        .where(Album.photographer_id == photographer_id)
        .order_by(Album.created_at.desc())
    )
    return list(result.scalars().all())


# --- Selection (yes/maybe/no/clear) ---

async def set_selection(
    db: AsyncSession,
    album_id: UUID,
    photo_id: UUID,
    client_session_id: str,
    status: str | None,
    client_name: str | None = None,
) -> Selection | None:
    """Set or clear a photo's selection status.
    status=None clears the selection. Returns the Selection or None if cleared.
    Verifies that the photo belongs to the album before writing.
    Uses ON CONFLICT (upsert) so concurrent requests cannot create duplicates.
    """
    # Verify photo belongs to the album before writing
    photo = await db.get(Photo, photo_id)
    if not photo or photo.album_id != album_id:
        raise ValueError("Photo does not belong to this album")

    if status is None:
        # Clear — delete if exists
        await db.execute(
            sa_delete(Selection).where(
                Selection.photo_id == photo_id,
                Selection.client_session_id == client_session_id,
            )
        )
        await db.flush()
        return None

    # Upsert: INSERT ... ON CONFLICT DO UPDATE
    stmt = pg_insert(Selection.__table__).values(
        id=uuid.uuid4(),
        album_id=album_id,
        photo_id=photo_id,
        client_session_id=client_session_id,
        status=status,
        client_name=client_name,
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_selection_photo_client",
        set_={
            "status": stmt.excluded.status,
            "client_name": stmt.excluded.client_name,
        },
    ).returning(Selection.__table__)
    result = await db.execute(stmt)
    row = result.fetchone()
    await db.flush()

    if row:
        # Refresh the ORM object from DB
        return await db.get(Selection, row.id)
    return None


async def get_album_selections(
    db: AsyncSession, album_id: UUID, client_session_id: str | None = None
) -> list[Selection]:
    query = select(Selection).where(Selection.album_id == album_id)
    if client_session_id:
        query = query.where(Selection.client_session_id == client_session_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_album_selection_summary(
    db: AsyncSession, album_id: UUID
) -> list[dict]:
    """Get selection summary grouped by client session with status counts."""
    result = await db.execute(
        select(
            Selection.client_session_id,
            Selection.client_name,
            func.count().filter(Selection.status == "yes").label("yes_count"),
            func.count().filter(Selection.status == "maybe").label("maybe_count"),
            func.count().filter(Selection.status == "no").label("no_count"),
            func.count(Selection.id).label("total_reviewed"),
            func.max(Selection.updated_at).label("last_activity"),
        )
        .where(Selection.album_id == album_id)
        .group_by(Selection.client_session_id, Selection.client_name)
    )
    return [
        {
            "client_session_id": row.client_session_id,
            "client_name": row.client_name,
            "yes_count": row.yes_count,
            "maybe_count": row.maybe_count,
            "no_count": row.no_count,
            "total_reviewed": row.total_reviewed,
            "last_activity": row.last_activity,
        }
        for row in result.all()
    ]


# --- Favorites ---

async def toggle_favorite(
    db: AsyncSession,
    album_id: UUID,
    photo_id: UUID,
    client_session_id: str,
) -> bool:
    """Toggle a photo favorite. Returns True if favorited, False if unfavorited.
    Verifies that the photo belongs to the album before writing.
    Uses ON CONFLICT DO NOTHING to prevent duplicates from concurrent requests.
    """
    # Verify photo belongs to the album before writing
    photo = await db.get(Photo, photo_id)
    if not photo or photo.album_id != album_id:
        raise ValueError("Photo does not belong to this album")

    # Try to find existing
    existing = await db.execute(
        select(Favorite).where(
            Favorite.photo_id == photo_id,
            Favorite.client_session_id == client_session_id,
        )
    )
    fav = existing.scalar_one_or_none()

    if fav:
        await db.delete(fav)
        await db.flush()
        return False

    # INSERT ... ON CONFLICT DO NOTHING — safe against concurrent double-tap
    stmt = pg_insert(Favorite.__table__).values(
        id=uuid.uuid4(),
        album_id=album_id,
        photo_id=photo_id,
        client_session_id=client_session_id,
    ).on_conflict_do_nothing(constraint="uq_favorite_photo_client")
    await db.execute(stmt)
    await db.flush()
    return True


async def get_client_favorites(
    db: AsyncSession, album_id: UUID, client_session_id: str
) -> list[Favorite]:
    result = await db.execute(
        select(Favorite).where(
            Favorite.album_id == album_id,
            Favorite.client_session_id == client_session_id,
        )
    )
    return list(result.scalars().all())


# --- Comments ---

async def add_comment(
    db: AsyncSession,
    album_id: UUID,
    photo_id: UUID,
    client_session_id: str,
    text: str,
    client_name: str | None = None,
) -> Comment:
    comment = Comment(
        album_id=album_id,
        photo_id=photo_id,
        client_session_id=client_session_id,
        client_name=client_name,
        text=text,
    )
    db.add(comment)
    await db.flush()
    return comment


async def get_photo_comments(
    db: AsyncSession, photo_id: UUID
) -> list[Comment]:
    result = await db.execute(
        select(Comment)
        .where(Comment.photo_id == photo_id)
        .order_by(Comment.created_at)
    )
    return list(result.scalars().all())


async def get_album_comments(
    db: AsyncSession, album_id: UUID
) -> list[Comment]:
    result = await db.execute(
        select(Comment)
        .where(Comment.album_id == album_id)
        .order_by(Comment.created_at)
    )
    return list(result.scalars().all())


async def delete_comment(db: AsyncSession, comment_id: UUID, client_session_id: str) -> bool:
    """Delete a comment. Only the author can delete."""
    result = await db.execute(
        select(Comment).where(
            Comment.id == comment_id,
            Comment.client_session_id == client_session_id,
        )
    )
    comment = result.scalar_one_or_none()
    if comment:
        await db.delete(comment)
        return True
    return False


# --- Album CRUD ---

async def update_album(db: AsyncSession, album: Album, **kwargs) -> Album:
    """Update album fields. Accepts whatever was in exclude_unset, including None values."""
    for key, value in kwargs.items():
        setattr(album, key, value)
    await db.flush()
    return album


async def delete_album(db: AsyncSession, album: Album) -> None:
    await db.delete(album)
    await db.flush()


async def reindex_album_photos(
    db: AsyncSession, album_id: UUID, access_token: str
) -> int:
    await db.execute(
        sa_delete(Photo).where(Photo.album_id == album_id)
    )
    await db.flush()
    return await index_album_photos(db, album_id, access_token)
