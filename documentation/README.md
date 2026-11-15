# Glimps

Glimps lets photographers share photos with clients without making anyone create an account. Clients browse a gallery and pick the photos for their final album (**Yes / Maybe / No**), save personal favourites and leave comments. The photographer sees what each client picked.

> **Status:** early development. The first real end-to-end run (Nov 2026) confirmed login, the dashboard and album creation. Photo storage is being rebuilt; see [Storage](#storage) and the [roadmap](#roadmap).

---

## Who it is for

| User | How they access Glimps |
|------|------------------------|
| Photographer | Signs in with Google (identity only, no Drive access) |
| Client (the couple, plus a few family members they choose) | No login. Opens the selection link, optionally entering a PIN, and picks photos |
| Guests (event attendees) | No login. Open a separate delivery link + PIN and receive only their own photos. Guests never select photos for the album |

---

## Features

### Photo selection (core)
- The photographer creates an album and uploads photos to Glimps.
- Glimps generates a private share link (a long random token).
- The client sees a thumbnail gallery and can open any photo as a full-size preview.
- **Yes / Maybe / No** marks a photo for the final album. A photographer can set a selection limit ("choose up to 50").
- **Favourite** is a personal heart, separate from selection.
- **Comments** let clients leave notes on individual photos ("crop tighter").
- The photographer sees per-client selection counts and comments.

### Download control
- Downloads are switched on or off per album, and this is enforced on the server.
- When downloads are off, only reduced-size (optionally watermarked) previews are served and the originals endpoint returns 403.
- When downloads are on, originals are served through short-lived signed links.
- Browser dev tools and screenshots cannot be blocked, so protection comes from limiting what is served.

### Album controls
- Optional PIN, checked on every client request.
- Optional expiry date. After it, the link returns "gone".
- Branding: logo, colours, business name, tagline, website and Instagram.

### Later (designed, not built)
- **Guest delivery album:** the couple shares a delivery link + PIN with guests (separate from the selection link and PIN). Each guest takes a selfie with the live camera and sees and downloads only the photos they appear in. The selfie is discarded immediately, and the photographer can purge all face data.
- **Live sharing during the event**, in two modes:
  - **Live online (first):** the photographer's desktop app uploads previews as photos are taken and originals later. Guests find their photos with a selfie over mobile data or venue WiFi. The venue needs internet.
  - **Pure offline (later):** the laptop itself serves guests over its own WiFi with no internet. Guests join by QR code. Still blocked on getting the phone camera to work over a local network.
- **Desktop app for photographers:** background folder upload, downloading selections to folders, Lightroom/Photoshop export via XMP sidecar files.

See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for the three flows in detail.

---

## Storage

Photos are uploaded to and served from **Glimps' own storage**: Cloudflare R2 in production, local disk in development. Google Drive is **not** used. Google is used only to sign photographers in.

We dropped Drive for three reasons:
- Drive read access is a "restricted" Google scope that needs a paid annual security assessment.
- Drive thumbnail links expire with the photographer's access token.
- "Anyone with the link" folders make it impossible to enforce the download toggle.

How it works:
- The browser uploads directly to storage with presigned URLs, so photo bytes never pass through the API server.
- For each photo, Glimps keeps a private main file, a preview (max 1600 px, EXIF/GPS stripped, optional watermark) and a thumbnail (max 400 px). In selection albums the main file is a resized ~2560 px master; in delivery albums it is the full-quality original. A photo is never stored twice.
- The database stores storage keys only. Viewing links are generated on demand and expire after about 10 minutes.
- Accepted files are JPEG, PNG and WebP up to 30 MB each.
- Albums expire automatically (3.5 months on Pro; 14 days for selection and 7 days for delivery on Free), then are deleted after a 7-day grace period.

### Plans (proposed; pricing still being validated with photographers)
- **Free** (permanent): the desktop app (uploads, local compression, downloading selections, Lightroom XMP export), 10 GB of uploads a month, selection albums kept 14 days, delivery albums kept 7 days with full-gallery browsing only, and a "Made with Glimps" mark. No face search, live or offline mode, branding or portfolio.
- **Pro** (₹600 a month in India, $6 internationally, before tax, via Razorpay): 50 GB of uploads a month pooled across all albums (about 5 events), 3.5-month retention, guest delivery with face search, live online and offline modes, your own branding.
- **Add-ons (Pro):** a portfolio website, extra 10 GB upload blocks, longer retention (later).
- **Studio** (later): per-seat team plan with pooled storage, shared branding and roles.
- Limits count the bytes uploaded each billing month; deleting photos doesn't give them back. When you reach the limit, new uploads are paused with upgrade options, and existing albums keep working.

---

## How it works

```
Photographer                         Glimps                           Client
    |                                   |                                |
    |-- create album ------------------>|                                |
    |<-- presigned upload URLs ---------|                                |
    |== upload photos directly to storage (R2) ==                       |
    |-- confirm upload ---------------->|-- thumbnail + preview          |
    |<-- share link --------------------|                                |
    |-- sends link ------------------------------------------------->   |
    |                                   |<-- opens link (+ PIN) -------- |
    |                                   |-- short-lived image links ---> |
    |                                   |<-- yes/maybe/no, ♥, comments - |
    |<-- selection summary -------------|                                |
```

### Key design rules
- Clients never talk to Google or to storage credentials. Glimps signs every image URL.
- Public links use long random tokens, never the readable album slug.
- The PIN, if set, is stored hashed and checked on every public request.
- Clients get an anonymous browser session ID, so selections and favourites persist without an account.
- Storage sits behind a backend interface (`local` or `r2`), switched by config.

---

## Architecture

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Zustand (PWA) |
| Backend | FastAPI, SQLAlchemy 2 (async), Alembic |
| Database | PostgreSQL + pgvector. Today: Supabase (session pooler). Target: DigitalOcean Managed PostgreSQL, Bangalore |
| Storage | Cloudflare R2 (S3-compatible, boto3) / local disk in dev |
| Image processing | Pillow |
| Auth | Google OAuth (login only), JWT in an httpOnly cookie |
| Jobs | A Postgres jobs table plus one worker process |
| Hosting (decided) | One VM running Next.js, the API and the worker behind Caddy, on a custom domain (`app.` and `api.`). Private beta on Oracle Always Free; paying customers on a paid VM in Bangalore |

---

## Running locally

```bash
# Backend
cd backend
python -m venv glimps && glimps\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in values; never commit .env
alembic upgrade head
uvicorn app.main:app --reload # http://localhost:8000 (docs at /docs)

# Frontend
cd frontend
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                   # http://localhost:3000
```

Use the Supabase **session pooler** (port 5432) for `DATABASE_URL`, not the transaction pooler (6543).

---

## Roadmap

- [x] Docs updated for the storage change
- [ ] Automated test suite (separate test database)
- [ ] Storage layer (local + R2); remove all Google Drive code
- [ ] Direct-to-storage upload with quota and validation
- [ ] Thumbnails, previews, watermark
- [ ] Client viewing with signed links, download enforcement, album expiry
- [ ] Frontend: login error page, share-token links, new landing page, upload UI
- [ ] Deploy: systemd, Caddy, deploy script, backups with a tested restore, monitoring
- [ ] Selection polish: per-person picks ("Who's choosing?"), exports
- [ ] Face indexing + guest delivery albums
- [ ] Desktop app (folder upload, XMP export)
- [ ] Live sharing, online mode
- [ ] Live sharing, pure offline mode
- [ ] Billing (Razorpay), before anyone is charged
- [ ] Launch controls: terms of service, report link, admin album-disable switch
- [ ] Portfolio website (Pro add-on)

See [FEATURES.md](FEATURES.md) for detailed status, [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for the full design, and [CLAUDE.md](../CLAUDE.md) for engineering rules and known bugs.

---

## Privacy

- Original photos are private and served only through short-lived signed links.
- Previews have EXIF and GPS data stripped.
- If face matching is added later, faces are biometric data, so Glimps will ask for consent before the selfie step, store only embeddings (never the selfie), discard selfie embeddings after the search, and let photographers purge all face data for an event. Face data is deleted with the album at the end of its 3.5-month life.
- This is intended to align with India's DPDP Act, 2023. Review with a legal professional before commercial use.

---

## Known constraints

- Screenshots and dev-tools saves cannot be fully prevented.
- The PIN rate limiter is in memory and only works with a single server worker until it moves to Redis.
- A live camera (for future selfie matching) needs HTTPS and often fails inside in-app browsers such as WhatsApp's.
