import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Photographer(Base):
    __tablename__ = "photographers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    google_id = Column(String(255), unique=True, nullable=False)
    avatar_url = Column(Text, nullable=True)
    google_access_token = Column(Text, nullable=True)
    google_refresh_token = Column(Text, nullable=True)

    # Branding
    business_name = Column(String(255), nullable=True)
    tagline = Column(String(500), nullable=True)
    logo_url = Column(Text, nullable=True)
    primary_color = Column(String(7), default="#000000")  # hex
    accent_color = Column(String(7), default="#6366f1")  # hex
    website_url = Column(Text, nullable=True)
    instagram_handle = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    albums = relationship("Album", back_populates="photographer", cascade="all, delete-orphan")


class Album(Base):
    __tablename__ = "albums"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    photographer_id = Column(
        UUID(as_uuid=True), ForeignKey("photographers.id"), nullable=False
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    pin = Column(String(6), nullable=True)
    gdrive_folder_id = Column(String(255), nullable=False)
    gdrive_folder_url = Column(Text, nullable=False)

    is_active = Column(Boolean, default=True)
    download_enabled = Column(Boolean, default=False)
    selection_limit = Column(Integer, nullable=True)  # Max "yes" picks allowed, null = unlimited
    processing_status = Column(
        String(20), default="pending"
    )  # pending, processing, completed, failed
    total_photos = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    photographer = relationship("Photographer", back_populates="albums")
    photos = relationship("Photo", back_populates="album", cascade="all, delete-orphan")
    selections = relationship(
        "Selection", back_populates="album", cascade="all, delete-orphan"
    )
    comments = relationship(
        "Comment", back_populates="album", cascade="all, delete-orphan"
    )
    favorites = relationship(
        "Favorite", back_populates="album", cascade="all, delete-orphan"
    )


class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    album_id = Column(UUID(as_uuid=True), ForeignKey("albums.id"), nullable=False)
    gdrive_file_id = Column(String(255), nullable=False)
    filename = Column(String(500), nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    full_url = Column(Text, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    album = relationship("Album", back_populates="photos")
    selections = relationship("Selection", back_populates="photo", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="photo", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="photo", cascade="all, delete-orphan")

    @property
    def aspect_ratio(self) -> float | None:
        if self.width and self.height and self.height > 0:
            return round(self.width / self.height, 4)
        return None


class Selection(Base):
    """Tracks photo selection status: yes, maybe, no."""

    __tablename__ = "selections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    album_id = Column(UUID(as_uuid=True), ForeignKey("albums.id"), nullable=False)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"), nullable=False)
    client_name = Column(String(255), nullable=True)
    client_session_id = Column(String(255), nullable=False)
    status = Column(String(10), nullable=False, default="yes")  # yes, maybe, no

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    album = relationship("Album", back_populates="selections")
    photo = relationship("Photo", back_populates="selections")


class Favorite(Base):
    """Client's personal favorites — independent of yes/maybe/no selection."""

    __tablename__ = "favorites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    album_id = Column(UUID(as_uuid=True), ForeignKey("albums.id"), nullable=False)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"), nullable=False)
    client_session_id = Column(String(255), nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    album = relationship("Album", back_populates="favorites")
    photo = relationship("Photo", back_populates="favorites")


class Comment(Base):
    """Client comments on individual photos."""

    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    album_id = Column(UUID(as_uuid=True), ForeignKey("albums.id"), nullable=False)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"), nullable=False)
    client_session_id = Column(String(255), nullable=False)
    client_name = Column(String(255), nullable=True)
    text = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    album = relationship("Album", back_populates="comments")
    photo = relationship("Photo", back_populates="comments")
