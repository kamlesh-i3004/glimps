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
├── documentation/      README.md, FEATURES.md, SYSTEM_DESIGN.md
└── CLAUDE.md           this file
```

## Tech stack

- **Backend:** Python 3.14, FastAPI, SQLAlchemy 2.1 (async), Alembic, Pydantic v2, python-jose (JWT), google-auth + google-auth-oauthlib (login only)
- **Database (today):** Supabase PostgreSQL through the **session pooler (port 5432)**. Never use the transaction pooler (6543).
- **Database (target, decided):** DigitalOcean Managed PostgreSQL + pgvector, Bangalore ($15/month). Use **plain Postgres only** (no provider-specific features) so a later switch is a dump and restore. Where the DB lives during the Oracle beta is open (SYSTEM_DESIGN D18).
- **Jobs (decided):** a Postgres jobs table plus one worker process. No BackgroundTasks for real work, no Redis.
- **Job fairness (decided):** max `JOB_MAX_RUNNING_PER_PHOTOGRAPHER` (default 2) running jobs per photographer, work-conserving, two-pass claim under an advisory lock; ties go to the least recently claimed photographer (`max(locked_at)`, NULL first), so never clear `locked_at` (SYSTEM_DESIGN §7.2.1).
- **Storage (target):** Cloudflare R2 via boto3 with presigned URLs, plus a `LocalStorage` backend for development. Selected by `STORAGE_BACKEND = "local" | "r2"`. Keep `StorageBackend` provider-agnostic (S3 API); Backblaze B2 is a later option.
- **Image processing (target):** Pillow, run in `run_in_threadpool`
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Zustand
- **Hosting (decided):** one rented VM runs Next.js, the API and the worker behind Caddy (no Vercel). Private beta on Oracle Always Free (Ampere A1); paying customers on a paid VM in Bangalore (2 vCPU / 4 GB). A custom domain with `app.` and `api.` as sibling subdomains is required; buy it before the Deploy phase. Details in SYSTEM_DESIGN §11.

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
- **Resolution (decided):** selection albums store ~2560 px masters (resized before upload) plus preview and thumb; delivery albums store full originals. A photo is never stored twice.
- **Retention:** the server sets `expires_at` from plan and kind (Pro 3.5 months; Free selection 14 days, Free delivery 7 days, proposed). Public routes return **410 Gone** after it, then a 7-day grace, then automatic deletion.
- **Plans and limits (PROPOSED, SYSTEM_DESIGN §1 Plans and §6.4):** Free (permanent) and Pro (₹600 / $6 a month); Studio later. Limits come from config keyed by `photographers.plan`, never a fixed quota column:
  - a monthly upload meter (`period_uploaded_bytes`: Free 10 GB, Pro 50 GB; deleting photos doesn't refund it);
  - a stored-bytes ceiling (Free 20 GB, Pro 200 GB);
  - 30 MB per file and 20 albums a month.
  - Over the limit, block new upload URLs with upgrade options; existing albums keep working.
  - Pro-only features are refused server-side for Free.
- Branding assets (logo) are stored as objects, not base64 in the DB.

### Downloads
- Enforced on the server. If `album.download_enabled` is false, the originals endpoint returns **403**. Otherwise it returns a short-lived signed URL with `Content-Disposition: attachment`.

### Client access
- Public routes resolve albums **by `share_token` only**: `/api/a/{share_token}/...`. Slugs are for photographer routes only, and a slug on a public route must 404.
- Public responses use `PublicAlbumResponse` and must never expose `share_token`, original keys, the PIN, or any leftover Drive fields.

### PIN
- Enforced on **every** public route: photos, select, favourite, comments, download.
- `verify-pin` issues a signed, short-lived proof that the other routes require. It is sent as a **Bearer header**, not a cookie (decided, D13).
- Delivery albums have their **own** token and PIN (decided, D7). Selection and delivery share the `albums`/`photos` tables, separated by `kind` (decided, D8).
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
7. **Deploy:** systemd units, Caddyfile, deploy script, backup and tested restore runbook, monitoring. Tested on a throwaway VM first (SYSTEM_DESIGN §11.4).

**After Deploy:** Flow A polish, then face indexing + Flow B, then the desktop app, then Flow C1 (live online), then Flow C2 (pure offline). Billing (Razorpay) must exist before anyone is charged; its timing is open (D19). The phase dependencies, and what each phase must leave room for, are in SYSTEM_DESIGN §14.

**Code issues found during the system design** (details in SYSTEM_DESIGN §0): `add_comment` doesn't check the photo belongs to the album, and comment reads and deletes aren't album-scoped (C1/C2). Migration `cae0715edc0e` dropped the `album_id` indexes (C3). DB FKs have no `ON DELETE CASCADE` (C4). The selection-limit check can race (C7). Phase 1 tests should cover C1, C2 and C7.

---

## Product flows (authoritative)

The full design (data model, API, access control, costs, threat model, open decisions) is in [documentation/SYSTEM_DESIGN.md](documentation/SYSTEM_DESIGN.md). §15 there lists what is decided and what is still open, with a "decide by" point for each open item. Don't settle open items silently; ask when a task reaches its "decide by" point.

**Terminology:** the *client* is the couple (bride and groom) plus at most a few family members they hand the link to. *Guests* are event attendees. Guests never select photos for the album; they only receive photos.

**Flow A: Selection (online, after the event)**
- The photographer uploads photos. The client browses and marks Yes / Maybe / No, adds favourites and comments. The photographer sees the picks.
- Only the photographer's upload needs internet at upload time; nothing about the event itself is offline.
- No face search in this flow.
- Each person's picks are kept separate (on first open: "Who's choosing? Bride / Groom / Family"). Whether to offer a shared selection is open (D1, decide before Flow A polish).

**Flow B: Guest delivery album (online, after the event)**
- The photographer publishes a delivery album, and the couple shares its link + PIN with all guests.
- Each guest takes a selfie (live camera capture only, never a file upload) and sees and downloads only the photos they appear in.
- Needs HTTPS (camera). Detect in-app browsers (WhatsApp/Instagram) and show an "Open in Chrome/Safari" prompt.
- Offer a "browse everything" fallback only when the album's `guest_mode` is `full_gallery`.
- Guest delivery has its **own** routes, tables and access rules (many anonymous read-only users), separate from Flow A (a few named people with write access). Don't force one model to serve both.

**Flow C: Live sharing (during the event), two modes. Build C1 before C2.**
- **C1, live online:** the photographer's desktop app uploads previews first and originals later to hosted storage. Guests use mobile data or venue WiFi, and face search runs in the cloud over HTTPS (the Flow B code path). Internet is required at the venue.
- **C2, pure offline:** the laptop is the server and storage (LocalStorage backend, same face module). SD cards are ingested there, and guests join the laptop's WiFi by QR code. **Unsolved:** phone browsers only allow the camera on HTTPS, and a LAN address is plain HTTP (D6). The operator selfie kiosk fallback is **dropped**.

**Face recognition (Flows B and C only)**
- **Index time:** detect every face in every photo and store one embedding per face; images are not changed.
- **Search time:** embed the selfie, compare it to the album's embeddings, return photos above a threshold, then **discard** the selfie and its embedding immediately.
- The selfie is a convenience filter, **not a security gate**: anyone with the link + PIN can try someone else's face. Required safeguards:
  - per-device and per-album rate limits on searches;
  - a high match threshold and a cap on results;
  - a search log visible to the photographer;
  - the ability to hide photos from guest search;
  - watermarked, reduced previews;
  - album expiry;
  - explicit consent text before the selfie step;
  - a "delete all face data" action for the photographer.
- Camera-only capture is a UX/privacy choice enforced only in the browser; the server cannot prove a frame came from a live camera. Never describe it as a security control.
- `guest_mode`: `full_gallery | find_my_photos_only`. The `find_my_photos_only` restriction is enforced **server-side** (the list endpoint must not return everything), never only in the UI.
- Faces are biometric data under India's DPDP Act 2023: consent first, embeddings only, a retention limit, purge on request or expiry. Legal review is needed before charging customers.
- Verify a model's current license before choosing it (some well-known face models are research-only). Never pick a model without checking.
- Embeddings live in Postgres with pgvector for Flow B; Flow C1 uses the same server path; the local app uses a local index for Flow C2.

**Clients and apps**
- **Web app (Next.js):** the primary product for Flows A and B.
- **Desktop app for photographers** (Electron or Tauri wrapping the web UI plus a local FastAPI):
  - folder-watch background uploads with local compression;
  - downloading selections and favourites to folders;
  - Lightroom/Photoshop export via XMP sidecar files (not direct catalog edits);
  - Flow C1 live upload (previews first) and the Flow C2 local server.
- **Android guest app:** only if the browser route for Flow C2 proves too painful. Not planned.

**Build order:** phases 2-6 (storage, uploads, processing, signed viewing, frontend), then Deploy, then Flow A polish, then face indexing + Flow B, then the desktop app, then Flow C1, then Flow C2.

**Non-goals:** no CRM features. Never name competitors in the docs.

**Plans (PROPOSED, pricing still to be validated with photographers):**
- **Free:** desktop app, short retention, 10 GB a month, full-gallery delivery only, "Made with Glimps" mark.
- **Pro:** ₹600 / $6 a month before tax via Razorpay Subscriptions; face search, live online and offline modes, branding.
- **Add-ons:** portfolio site, extra 10 GB blocks.
- **Studio:** later, needs workspaces.
- **Before public launch:** terms of service, a report link on public pages, an admin album-disable switch, and the file-type allow-list.

Details, costs and break-even: SYSTEM_DESIGN §1, §6.4-6.5, §9.12, §10.
