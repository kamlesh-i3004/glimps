# Glimps: feature status

Last reviewed: Nov 2026, after the first real end-to-end run and the decision to drop Google Drive.

## Legend

- ✅ **Verified**: tested end to end and working
- 🟡 **Built, unverified**: code exists but has not been tested end to end
- 🐞 **Built, broken**: code exists but is known not to work (see the Notes column)
- 🔧 **In progress**: current or next roadmap phase
- 📋 **Planned (v1)**
- 🔮 **Future (v2+)**, design only
- ❌ **Removed / will not build**

---

## Auth and accounts

| Status | Feature | Notes |
|--------|---------|-------|
| ✅ | Google login for photographers | Scopes openid/email/profile only. JWT in an httpOnly cookie |
| ✅ | Photographer profile (`/me`) | |
| 🐞 | Login error page | Backend redirects to `/login?error=...`, which does not exist yet (phase 6) |
| 🐞 | Session-expiry handling | Dashboard redirects on *any* failed call, not just a 401 (phase 6) |
| ❌ | Google Drive access via login | Dropped. No Drive scopes, no stored Google tokens |

## Albums (photographer)

| Status | Feature | Notes |
|--------|---------|-------|
| ✅ | Create album | `POST /api/albums` returns 201 |
| ✅ | List albums | |
| 🟡 | Update / delete album | |
| 🟡 | Selection limit ("choose up to N") | Enforced on the server for Yes picks |
| 🐞 | Copy share link | Builds the link from the slug; the public API needs `share_token` (phase 6) |
| 🟡 | Per-client selection summary | Yes/Maybe/No counts per client session |
| 🟡 | View all comments on an album | API exists; dashboard UI is partial |
| 📋 | Album expiry (`expires_at`, 410 Gone) | Phase 2 (model), phase 5 (enforcement) |
| 📋 | Storage accounting + per-photographer quota | Default 5 GB. Phases 2-3 |
| 📋 | Cover photo | |
| 📋 | Filename list export (.txt/.csv) | |
| 📋 | Selection report (exportable) | |
| 📋 | Email notification when the client finishes | |
| 🔮 | Lightroom export (XMP sidecars) | |
| 🔮 | Multi-client overlay, Editor's Picks, activity log, analytics | |
| ❌ | CRM features | Out of scope; competitors already cover this |

## Photos and storage

| Status | Feature | Notes |
|--------|---------|-------|
| ❌ | Google Drive folder import + indexing | Dropped. Code is still present and fails; it is removed in phase 2 |
| ❌ | Album reindex from Drive | Removed with the above |
| 🔧 | Storage layer (`local` / `r2`) | Phase 2 |
| 📋 | Direct-to-storage presigned upload (multipart) | Phase 3. JPEG/PNG/WebP, max 30 MB, 50 files per request |
| 📋 | Server-generated object keys | `albums/{album_id}/{photo_id}/original.ext` |
| 📋 | Thumbnails (400 px) + previews (1600 px, EXIF/GPS stripped) | Phase 4, Pillow |
| 📋 | Optional text watermark on previews | Phase 4 |
| 📋 | Short-lived signed image URLs (~10 min) | Phase 5 |
| 📋 | Server-side download toggle | Phase 5. Originals endpoint returns 403 when downloads are off |
| 📋 | Upload UI in the dashboard | Phase 6 |
| 🔮 | RAW file support | |

## Client access and security

| Status | Feature | Notes |
|--------|---------|-------|
| 🟡 | Public album by `share_token` | API resolves by token; the frontend still passes the slug (phase 6) |
| 🐞 | PIN protection | `verify-pin` exists but no other route checks it. PIN is stored in plain text. **High priority** |
| 🟡 | PIN rate limiting | In memory, single worker only |
| 📋 | Signed PIN proof required on every public route | Hashed PIN storage |
| 🔧 | Automated tests (leaks, slug returns 404, PIN, idempotency, cross-album writes) | Phase 1 |
| 📋 | General API rate limiting | |

## Client: browsing

| Status | Feature | Notes |
|--------|---------|-------|
| 🟡 | Masonry gallery, responsive columns | Shows Drive thumbnails today; will use signed preview URLs |
| 🟡 | Layout switcher (Masonry / Grid / Column / Justified) | |
| 🟡 | Lightbox with keyboard navigation | |
| 🟡 | Paginated / lazy loading | |
| 📋 | Sort options | |
| 📋 | Dark mode | |
| 🔮 | Slideshow | |

## Client: selection and review

| Status | Feature | Notes |
|--------|---------|-------|
| 🟡 | Yes / Maybe / No / Clear | Upsert with a unique constraint per photo + client session |
| 🟡 | Favourite (heart), independent of selection | |
| 🟡 | Comments per photo (add / view / delete own) | |
| 🟡 | Filter bar: All / Yes / Maybe / No / Favourites / Unreviewed | |
| 🟡 | Review progress bar | |
| 🟡 | Compare mode (side by side) | |
| 🟡 | Keyboard shortcuts (arrows, Y/M/N, H) | |
| 🟡 | Optimistic UI updates | |
| 📋 | Verify the photo belongs to the album on every public write | Covered by phase 1 tests |
| 🔮 | Batch select (shift+click), share favourites, multi-album view | |

## Photographer: branding

| Status | Feature | Notes |
|--------|---------|-------|
| 🟡 | Business name, tagline, colours, website, Instagram | |
| 🟡 | Logo upload | Stored as base64 in the DB today; moves to object storage |
| 🟡 | Live preview in settings | |
| 🔮 | Custom domains | |

## Platform

| Status | Feature | Notes |
|--------|---------|-------|
| 🟡 | PWA (manifest + service worker) | Caching rules still target Drive thumbnails; revisit in phase 5/6 |
| 🔧 | Dependency cleanup | `requirements.txt` is UTF-16 and missing python-jose; phase 2 |
| 📋 | Consistent DB driver | Currently psycopg 3 by default; settle in phase 2 |
| 📋 | Frontend error boundaries | |
| 🔮 | Capacitor app wrapper | |

## Future (v2+, design only)

| Status | Feature | Notes |
|--------|---------|-------|
| 🔮 | Face recognition: selfie, then only your photos | Consent, embeddings only, purge per event |
| 🔮 | Live / offline event mode | SD-card ingest on a laptop, QR for guests, no internet. Key differentiator |
| 🔮 | Face grouping / share by face | |

---

## Pricing (tentative, not decided)

| Tier | Idea |
|------|------|
| **Free** | Capped by storage and active events; galleries auto-expire |
| **Paid (annual)** | Higher limits, branding, exports |
| **Storage** | Priced per event or per GB, never "unlimited" |
| **Live mode** | Per-event add-on |
