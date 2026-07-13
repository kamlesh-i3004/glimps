from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.database import Photographer


async def get_current_photographer(
    access_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> Photographer:
    """Get the currently authenticated photographer from JWT cookie."""
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    photographer_id = payload.get("sub")
    if not photographer_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    photographer = await db.get(Photographer, photographer_id)
    if not photographer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Photographer not found",
        )

    return photographer
