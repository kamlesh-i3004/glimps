# Glimps: working notes for Claude

Glimps is photo proofing and sharing for photographers. Photographers sign in with Google and upload photos to Glimps. Clients open a share link (no account, optional PIN) and mark photos Yes / Maybe / No, add favourites and leave comments.

> **Storage decision (Nov 2026):** Google Drive has been dropped entirely. Photos are uploaded to and served from our own storage (Cloudflare R2, or local disk in development). Google is used **only** for photographer login (scopes `openid`, `email`, `profile`). No Drive scopes, no Google API calls outside the login flow, no stored Google tokens.
>
> Why: Drive read scopes are "restricted" and need a paid annual security assessment; Drive thumbnail URLs expire with the access token; and "anyone with link" folders make the download toggle impossible to enforce.

---

## Working rules (apply to every task)

- Show a diff for each change and explain it in 1-2 lines. No unrelated refactors or renames.
- **Never edit an Alembic migration that has already run.** Generate a new one with `alembic revision --autogenerate`, show `upgrade()` to the user, and only then apply it.
- **Never run `alembic upgrade head` without showing `upgrade()` first.**
- No secrets in git, in chat, or in logs. `.env` stays untracked; keep `.env.example` current.
- Anything blocking and synchronous (Google token exchange, Pillow processing, boto3) goes through `run_in_threadpool` or an async client.
- If unsure, ask instead of guessing.
- After each task, list the files changed and what the user must test manually.
- Work one roadmap phase at a time, in order (see below).

---

## Project structure

```
glimps/
├── backend/            FastAPI + SQLAlchemy (async) + Alembic
│   ├── app/main.py     app, CORS, routers, /health
│   ├── app/core/       config (pydantic-settings), database (engine/session), security (JWT)
│   ├── app/models/     database.py = ORM tables, schemas.py = Pydantic models
│   ├── app/api/        auth.py, albums.py, photographer.py, deps.py
│   ├── app/services/   album_service.py (business logic), storage layer (to be rebuilt)
│   ├── alembic/        migrations (3 applied)
│   └── tests/          empty, filled in phase 1
├── frontend/           Next.js 16 + React 19 + Tailwind 4 + Zustand (PWA)
│   └── src/app/        /, /dashboard, /dashboard/settings, /a/[slug] (to become /a/[token])
└── documentation/      this file, README.md, FEATURES.md
```

## Tech stack

- **Backend:** Python 3.14, FastAPI, SQLAlchemy 2.1 (async), Alembic, Pydantic v2, python-jose (JWT), google-auth + google-auth-oauthlib (login only)
- **Database:** Supabase PostgreSQL through the **session pooler (port 5432)**. Never use the transaction pooler (6543).
- **Storage (target):** Cloudflare R2 via boto3 with presigned URLs, plus a `LocalStorage` backend for development. Selected by `STORAGE_BACKEND = "local" | "r2"`.
- **Image processing (target):** Pillow, run in `run_in_threadpool`
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Zustand
- **Hosting (planned):** Vercel (frontend), Oracle Cloud VM (backend)

## Commands

```bash
# Backend
cd backend
glimps\Scripts\activate              # local venv (git-ignored)
pip install -r requirements.txt
uvicorn app.main:app --reload        # http://localhost:8000, docs at /docs
alembic revision --autogenerate -m "..."   # then SHOW upgrade() before applying
alembic upgrade head                 # only after the user has approved upgrade()

# Frontend
cd frontend
npm install
npm run dev                          # http://localhost:3000
npm run lint
```

---

## Current verified state (first real end-to-end run, Nov 2026)

**Works:** Google login, then a JWT httpOnly cookie, then the dashboard. `GET /api/photographer/me`, `GET /api/albums` and `POST /api/albums` (201) all work. Alembic migrations are applied on Supabase via the session pooler.

**Fails (expected):** background Drive indexing after album creation, because Drive tokens no longer exist. **This code is to be removed, not fixed** (phase 2).

**Database driver (open item, decide in phase 2):**
- `backend/.env` uses `DATABASE_URL=postgresql://...` with no driver suffix. SQLAlchemy 2.1 picks **psycopg 3** for that by default, which is why tracebacks showed psycopg.
- `.env.example` still says `postgresql+asyncpg://` (with the 6543 port), so the docs and the real config disagree.
- `app/core/database.py` and `alembic/env.py` both take the URL from settings unchanged. Neither sets `connect_args`.
- Recommendation: standardise on `postgresql+psycopg://` explicitly (it is already in use and has applied the migrations). If asyncpg is chosen instead, `connect_args` must disable the statement cache (`statement_cache_size=0`) for pooler safety. Make all three places consistent and tell the user which was chosen.

---

## Target architecture

### Storage and photos
- Browser uploads **directly** to storage with presigned URLs (multipart/resumable for large files). Photo bytes never pass through FastAPI.
- The DB stores object **keys**, never URLs. URLs are generated on demand and are short-lived (about 10 minutes).
- Keys are generated server-side, `albums/{album_id}/{photo_id}/original.ext`, never from the client filename.
- Per photo:
  - `original_key` (private)
  - `preview_key` (max 1600 px, JPEG quality about 82, EXIF/GPS stripped, optional text watermark)
  - `thumb_key` (max 400 px)
  - `size_bytes`, `width`, `height`, `content_type`
  - `upload_status`: `pending | uploaded | processed | failed`
- Allowed types: JPEG, PNG and WebP for now (no RAW). Max 30 MB per file, max 50 files per request.
- Albums get `expires_at` (public routes return **410 Gone** after it) and `storage_used_bytes`. Each photographer has a quota (default 5 GB, configurable).
- Branding assets (logo) are stored as objects, not base64 in the DB.

### Downloads
- Enforced on the server. If `album.download_enabled` is false, the originals endpoint returns **403**. Otherwise it returns a short-lived signed URL with `Content-Disposition: attachment`.

### Client access
- Public routes resolve albums **by `share_token` only**: `/api/a/{share_token}/...`. Slugs are for photographer routes only, and a slug on a public route must 404.
- Public responses use `PublicAlbumResponse` and must never expose `share_token`, original keys, the PIN, or any leftover Drive fields.

### PIN
- Enforced on **every** public route: photos, select, favourite, comments, download.
- `verify-pin` issues a signed, short-lived proof (a cookie or token) that the other routes require.
- The PIN is stored hashed.
- Keep the rate limiter. In-memory is fine for now, but multiple workers will need Redis.

### Selection model (keep as is)
- Clients have no account. `client_session_id` is a UUID created in the browser and kept in `localStorage`.
- Selection (yes/maybe/no), favourites and comments are keyed on photo + `client_session_id`, with DB unique constraints and upserts.
- Public writes must verify that the photo belongs to the album in the URL.

### Auth and cookies
- Google OAuth (openid/email/profile) leads to a JWT in an httpOnly cookie.
- The login endpoint returns a redirect, so the frontend must navigate with `window.location.href`, never `fetch`.
- Production needs `COOKIE_SECURE=true`. If the frontend and API are on different domains, SameSite must be handled deliberately.

---

## Known bugs (verified in the code; fix in the phase noted)

1. **Share links 404.** The dashboard builds client links from `album.slug` (`frontend/src/app/dashboard/page.tsx`), but the public API resolves by `share_token`, and the frontend `Album` type has no `share_token`. Fix: add it to the type, build links from it, and rename `/a/[slug]` to `/a/[token]`. *(phase 6)*
2. **PIN not enforced.** `verify-pin` only returns `{access: true}`, and no other public endpoint checks the PIN. *(PIN work, high priority; tests in phase 1)*
3. **Dependencies.** `security.py` imports `jose`, but `python-jose` is missing from `requirements.txt` (it only works because the local venv has it). `requirements.txt` is UTF-16; re-save it as UTF-8 and list the real dependencies, adding boto3 and Pillow. Remove `google-api-python-client` and `google-auth-httplib2` once the Drive code is gone; keep `google-auth` and `google-auth-oauthlib`. *(phase 2)*
4. **Missing `/login` page.** Failed logins redirect to `/login`, which does not exist. Create it: read `?error=`, show a readable message for `access_denied`/denied, `state_mismatch`, `token_exchange_failed`, `id_token_invalid` and `email_not_verified`, and add a Sign in button that sets `window.location.href` to `NEXT_PUBLIC_API_URL + "/api/auth/google/login"`. *(phase 6)*
5. **Over-eager redirects.** The dashboard and settings pages send the user away on **any** failed initial API call (currently to `/`). Only a 401 should redirect to login; other errors should show a message and a retry. *(phase 6)*
6. **Dead storage code.** `services/storage.py` references `SUPABASE_SERVICE_KEY`, which does not exist in settings and is never called. Logos are stored as base64 in the DB. Replace it with the new storage layer. *(phase 2/3)*
7. **Stale Drive copy.** The landing page ("connects your Google Drive", "paste your Google Drive folder link") and old docs still advertise Drive. Rewrite. *(phase 6; docs done in phase 0)*

---

## Roadmap (one phase at a time, in this order)

0. **Docs update.** Done.
1. **Test suite:** pytest + httpx against a separate `TEST_DATABASE_URL` (never the real DB). Cover public leak checks, slug returns 404, PIN enforcement and lockout, idempotent selections, and blocked cross-album writes.
2. **Storage layer + models.** Add `StorageBackend` (local/R2). Remove all Drive code: `gdrive.py`, the indexing/reindex tasks, and Drive fields on models and schemas. Fix dependencies and settle the DB driver. Then **one** new migration.
3. **Presigned upload flow:** upload-urls, confirm, quota, validation, and a local dev PUT endpoint.
4. **Processing:** thumbnails, previews, EXIF stripping, watermark.
5. **Client viewing:** signed URLs, server-side download enforcement, album expiry (410).
6. **Frontend:** `/login` page, 401-only redirects, share_token links and the `/a/[token]` route, new landing copy, upload UI.

**Later (design only, not now):** face recognition (selfie, then only your photos), offline/live event mode (SD-card ingest on a laptop, QR for guests, no internet required), Lightroom export.

---

## Product context (for decisions, not implementation)

- **Competitor:** Camtom (camtom.in) already offers selection + CRM + face recognition in India for about 1,299 to 1,999 INR/yr. **Do not build a CRM.**
- **Differentiators to protect:** live/offline event mode, fast and simple proofing, Like vs Favourite plus comments.
- **Pricing (tentative, not decided):** a free tier capped by storage and active events, with auto-expiring galleries; a paid annual plan; hosted storage priced per event or per GB, never "unlimited"; live mode as a per-event add-on.
