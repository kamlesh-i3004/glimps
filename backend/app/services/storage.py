"""Simple file storage using Supabase Storage (free tier: 1GB).

Used for photographer logos only — photos stay on Google Drive.
"""

import httpx
from app.core.config import get_settings

settings = get_settings()


async def upload_logo(
    file_bytes: bytes,
    filename: str,
    photographer_id: str,
    content_type: str = "image/png",
) -> str:
    """Upload a photographer's logo to Supabase Storage.

    Returns the public URL of the uploaded file.
    """
    # Supabase storage URL pattern:
    # https://<project>.supabase.co/storage/v1/object/logos/<photographer_id>/<filename>
    supabase_url = settings.DATABASE_URL.split("@")[1].split(":")[0]
    # Extract project ref from the host
    project_ref = supabase_url.replace("db.", "").replace(".supabase.co", "")

    storage_url = f"https://{project_ref}.supabase.co/storage/v1/object/logos/{photographer_id}/{filename}"

    async with httpx.AsyncClient() as client:
        resp = await client.put(
            storage_url,
            content=file_bytes,
            headers={
                "Content-Type": content_type,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            },
        )
        resp.raise_for_status()

    public_url = f"https://{project_ref}.supabase.co/storage/v1/object/public/logos/{photographer_id}/{filename}"
    return public_url
