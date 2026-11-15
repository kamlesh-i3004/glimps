import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.database import Photographer
import logging
logger = logging.getLogger(__name__)

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
        autogenerate_code_verifier=False,  # avoid PKCE invalid_grant
    )


def _error_redirect(error: str) -> RedirectResponse:
    """Redirect to the frontend login page with an error query param."""
    url = f"{settings.FRONTEND_URL}/login?{urlencode({'error': error})}"
    return RedirectResponse(url=url, status_code=302)


@router.get("/google/login")
async def google_login() -> RedirectResponse:
    """Redirect photographer to Google OAuth consent screen."""
    flow = _create_flow()
    auth_url, state = flow.authorization_url(access_type="online")

    # Store state in a short-lived httpOnly cookie for CSRF protection
    response = RedirectResponse(url=auth_url, status_code=302)
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=600,  # 10 minutes
    )
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback, create/update photographer, set JWT cookie."""
    params = request.query_params

    # --- Handle user-denied consent or any error from Google ---
    if "error" in params:
        return _error_redirect(params["error"])

    code = params.get("code")
    if not code:
        return _error_redirect("missing_code")

    # --- Verify OAuth state (CSRF protection) ---
    state_from_google = params.get("state", "")
    state_from_cookie = request.cookies.get("oauth_state", "")
    if not state_from_cookie or not secrets.compare_digest(state_from_cookie, state_from_google):
        return _error_redirect("state_mismatch")

    # --- Exchange code for tokens (sync HTTP — run in threadpool) ---
    flow = _create_flow()
    try:
        await run_in_threadpool(flow.fetch_token, code=code)
    except Exception:
        logger.exception("token exchange failed")
        return _error_redirect("token_exchange_failed")

    credentials = flow.credentials

    # --- Verify the ID token (sync HTTP — run in threadpool) ---
    try:
        id_info = await run_in_threadpool(
            id_token.verify_oauth2_token,
            credentials.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except Exception:
        logger.exception("ID token verification failed")
        return _error_redirect("id_token_invalid")

    # --- Reject unverified emails ---
    if not id_info.get("email_verified", False):
        return _error_redirect("email_not_verified")

    google_id = id_info["sub"]
    email = id_info["email"]
    name = id_info.get("name", email.split("@")[0])
    avatar_url = id_info.get("picture")

    # --- Find or create photographer ---
    result = await db.execute(
        select(Photographer).where(Photographer.google_id == google_id)
    )
    photographer = result.scalar_one_or_none()

    if photographer:
        photographer.avatar_url = avatar_url
        # No longer storing google tokens — Drive access removed
    else:
        photographer = Photographer(
            email=email,
            name=name,
            google_id=google_id,
            avatar_url=avatar_url,
        )
        db.add(photographer)

    await db.flush()
    await db.commit()

    # --- Create JWT and set on the RedirectResponse that is actually returned ---
    token = create_access_token(data={"sub": str(photographer.id)})
    redirect = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/dashboard", status_code=302
    )
    redirect.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    # Clear the one-time oauth_state cookie
    redirect.delete_cookie("oauth_state")
    return redirect


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out"}
