from fastapi import APIRouter, Depends, HTTPException, Request, Response
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.database import Photographer

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


def _create_flow() -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=settings.GOOGLE_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )


@router.get("/google/login")
async def google_login():
    """Redirect photographer to Google OAuth consent screen."""
    flow = _create_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_callback(
    code: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback, create/update photographer, set JWT cookie."""
    flow = _create_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials

    # Verify and get user info
    id_info = id_token.verify_oauth2_token(
        credentials.id_token,
        google_requests.Request(),
        settings.GOOGLE_CLIENT_ID,
    )

    google_id = id_info["sub"]
    email = id_info["email"]
    name = id_info.get("name", email.split("@")[0])
    avatar_url = id_info.get("picture")

    # Find or create photographer
    result = await db.execute(
        select(Photographer).where(Photographer.google_id == google_id)
    )
    photographer = result.scalar_one_or_none()

    if photographer:
        photographer.google_access_token = credentials.token
        if credentials.refresh_token:
            photographer.google_refresh_token = credentials.refresh_token
        photographer.avatar_url = avatar_url
    else:
        photographer = Photographer(
            email=email,
            name=name,
            google_id=google_id,
            avatar_url=avatar_url,
            google_access_token=credentials.token,
            google_refresh_token=credentials.refresh_token,
        )
        db.add(photographer)

    await db.flush()

    # Create JWT and set as httpOnly cookie
    token = create_access_token(data={"sub": str(photographer.id)})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    # Redirect to frontend dashboard
    return Response(
        status_code=302,
        headers={"Location": f"{settings.FRONTEND_URL}/dashboard"},
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out"}
