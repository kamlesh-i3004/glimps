import re
from typing import Any

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import get_settings

settings = get_settings()

# Image MIME types we support
IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
    "image/heic",
    "image/heif",
}


def extract_folder_id(url: str) -> str | None:
    """Extract Google Drive folder ID from various URL formats."""
    patterns = [
        r"folders/([a-zA-Z0-9_-]+)",
        r"id=([a-zA-Z0-9_-]+)",
        r"^([a-zA-Z0-9_-]{20,})$",  # Raw folder ID
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def build_drive_service(access_token: str):
    """Build a Google Drive service using the photographer's access token."""
    credentials = Credentials(token=access_token)
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


async def list_folder_images(
    access_token: str, folder_id: str
) -> list[dict[str, Any]]:
    """List all image files in a Google Drive folder."""
    service = build_drive_service(access_token)
    images = []
    page_token = None

    while True:
        query = f"'{folder_id}' in parents and trashed = false"
        results = (
            service.files()
            .list(
                q=query,
                fields="nextPageToken, files(id, name, mimeType, size, imageMediaMetadata, thumbnailLink, webContentLink)",
                pageSize=100,
                pageToken=page_token,
                orderBy="name",
            )
            .execute()
        )

        for file in results.get("files", []):
            if file.get("mimeType") in IMAGE_MIME_TYPES:
                images.append(
                    {
                        "gdrive_file_id": file["id"],
                        "filename": file["name"],
                        "mime_type": file.get("mimeType"),
                        "size_bytes": int(file.get("size", 0)),
                        "width": file.get("imageMediaMetadata", {}).get("width"),
                        "height": file.get("imageMediaMetadata", {}).get("height"),
                        "thumbnail_url": file.get("thumbnailLink"),
                        "full_url": file.get("webContentLink"),
                    }
                )

        page_token = results.get("nextPageToken")
        if not page_token:
            break

    return images


def get_thumbnail_url(file_id: str, size: int = 400) -> str:
    """Generate a thumbnail URL for a GDrive file."""
    return f"https://drive.google.com/thumbnail?id={file_id}&sz=w{size}"
