# Glimps - AI-Powered Photo Proofing

## Project Structure
- `frontend/` — Next.js 16 + React 19 + Tailwind + Zustand (PWA)
- `backend/` — FastAPI + SQLAlchemy + asyncpg

## Tech Stack
- **Frontend**: Next.js, Tailwind CSS, Zustand, TypeScript
- **Backend**: FastAPI, SQLAlchemy (async), Alembic
- **Database**: Supabase (PostgreSQL)
- **Auth**: Google OAuth (photographers), link+PIN (clients)
- **Images**: Google Drive API (photographer's own storage)
- **Face Rec (v2)**: InsightFace (buffalo_s pretrained model)
- **Hosting**: Vercel (frontend), Oracle Cloud VM (backend)

## Key Commands
- Backend: `cd backend && uvicorn app.main:app --reload`
- Frontend: `cd frontend && npm run dev`
- Migrations: `cd backend && alembic upgrade head`

## Architecture Notes
- Photographers authenticate via Google OAuth which also grants Drive access
- Clients access albums via public link + optional PIN, no signup required
- Photos are NOT stored — we use GDrive thumbnails and link to originals
- Album photo indexing happens in background tasks
- Face recognition (v2) will process embeddings at album creation time
