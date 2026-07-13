"""Initial schema - photographers, albums, photos, selections

Revision ID: 001
Revises:
Create Date: 2026-03-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "photographers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("google_id", sa.String(255), unique=True, nullable=False),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("google_access_token", sa.Text, nullable=True),
        sa.Column("google_refresh_token", sa.Text, nullable=True),
        # Branding
        sa.Column("business_name", sa.String(255), nullable=True),
        sa.Column("tagline", sa.String(500), nullable=True),
        sa.Column("logo_url", sa.Text, nullable=True),
        sa.Column("primary_color", sa.String(7), server_default="#000000"),
        sa.Column("accent_color", sa.String(7), server_default="#6366f1"),
        sa.Column("website_url", sa.Text, nullable=True),
        sa.Column("instagram_handle", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "albums",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "photographer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("photographers.id"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("pin", sa.String(6), nullable=True),
        sa.Column("gdrive_folder_id", sa.String(255), nullable=False),
        sa.Column("gdrive_folder_url", sa.Text, nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("processing_status", sa.String(20), server_default="pending"),
        sa.Column("total_photos", sa.Integer, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "album_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("albums.id"),
            nullable=False,
        ),
        sa.Column("gdrive_file_id", sa.String(255), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("thumbnail_url", sa.Text, nullable=True),
        sa.Column("full_url", sa.Text, nullable=True),
        sa.Column("width", sa.Integer, nullable=True),
        sa.Column("height", sa.Integer, nullable=True),
        sa.Column("size_bytes", sa.Integer, nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("sort_order", sa.Integer, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_photos_album_id", "photos", ["album_id"])

    op.create_table(
        "selections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "album_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("albums.id"),
            nullable=False,
        ),
        sa.Column(
            "photo_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("photos.id"),
            nullable=False,
        ),
        sa.Column("client_name", sa.String(255), nullable=True),
        sa.Column("client_session_id", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_selections_album_id", "selections", ["album_id"])
    op.create_index(
        "ix_selections_album_photo_session",
        "selections",
        ["album_id", "photo_id", "client_session_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("selections")
    op.drop_table("photos")
    op.drop_table("albums")
    op.drop_table("photographers")
