"""Add selection status, favorites, comments, download toggle, selection limit

Revision ID: 002
Revises: 001
Create Date: 2026-03-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status column to selections (yes/maybe/no)
    op.add_column(
        "selections",
        sa.Column("status", sa.String(10), server_default="yes", nullable=False),
    )
    op.add_column(
        "selections",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    # Add download_enabled and selection_limit to albums
    op.add_column(
        "albums",
        sa.Column("download_enabled", sa.Boolean, server_default=sa.text("false")),
    )
    op.add_column(
        "albums",
        sa.Column("selection_limit", sa.Integer, nullable=True),
    )

    # Create favorites table
    op.create_table(
        "favorites",
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
        sa.Column("client_session_id", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_favorites_album_id", "favorites", ["album_id"])
    op.create_index(
        "ix_favorites_unique",
        "favorites",
        ["album_id", "photo_id", "client_session_id"],
        unique=True,
    )

    # Create comments table
    op.create_table(
        "comments",
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
        sa.Column("client_session_id", sa.String(255), nullable=False),
        sa.Column("client_name", sa.String(255), nullable=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_comments_album_id", "comments", ["album_id"])
    op.create_index("ix_comments_photo_id", "comments", ["photo_id"])


def downgrade() -> None:
    op.drop_table("comments")
    op.drop_table("favorites")
    op.drop_column("albums", "selection_limit")
    op.drop_column("albums", "download_enabled")
    op.drop_column("selections", "updated_at")
    op.drop_column("selections", "status")
