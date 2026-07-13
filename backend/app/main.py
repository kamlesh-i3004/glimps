from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import albums, auth, photographer
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered photo proofing for photographers",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(albums.router)
app.include_router(photographer.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
