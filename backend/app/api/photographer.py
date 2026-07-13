from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_photographer
from app.core.database import get_db
from app.models.database import Photographer
from app.models.schemas import PhotographerBranding, PhotographerResponse

router = APIRouter(prefix="/api/photographer", tags=["photographer"])

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}
MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB


@router.get("/me", response_model=PhotographerResponse)
async def get_me(
    photographer: Photographer = Depends(get_current_photographer),
):
    """Get the authenticated photographer's profile."""
    return photographer


@router.patch("/branding", response_model=PhotographerResponse)
async def update_branding(
    data: PhotographerBranding,
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    """Update photographer branding settings."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(photographer, field, value)
    await db.flush()
    return photographer


@router.post("/logo", response_model=PhotographerResponse)
async def upload_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    photographer: Photographer = Depends(get_current_photographer),
):
    """Upload a logo image. Stores as base64 data URL to avoid needing external storage."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WebP, and SVG are allowed")

    contents = await file.read()
    if len(contents) > MAX_LOGO_SIZE:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Logo must be under 2MB")

    import base64
    b64 = base64.b64encode(contents).decode()
    data_url = f"data:{file.content_type};base64,{b64}"

    photographer.logo_url = data_url
    await db.flush()
    return photographer
