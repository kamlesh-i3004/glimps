# Glimps: feature status

Last reviewed: 15 Nov 2026, after recording the decisions on retention, plans, pricing, hosting and live sharing.

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
| 📋 | Album expiry (`expires_at`, 410 Gone) | Pro 3.5 months; Free 14 days (selection) / 7 days (delivery); then a 7-day grace and automatic deletion. Phase 2 (model), phase 5 (enforcement) |
| 📋 | Expiry reminder email | Optional (SYSTEM_DESIGN D21) |
| 📋 | Monthly upload meter + stored-bytes ceiling | Free 10 GB / month (20 GB ceiling), Pro 50 GB / month (200 GB ceiling); deletions don't refund the month; over the limit, upload URLs are blocked with upgrade options. Columns in phase 2, enforcement in phase 3 |
| 📋 | Sanity caps | 30 MB per file; 20 albums a month (assumption) |
| 📋 | Usage display (`GET /api/photographer/usage`) | Phase 3 |
| 📋 | Plan gating (Free vs Pro) | Face search, live and offline modes, branding, portfolio and find-my-photos-only are Pro-only, enforced on the server |
| 📋 | Paid add-ons: extra 10 GB upload blocks, portfolio customisation (extra templates, custom domain) | Needs the billing phase |
| 📋 | Cover photo | |
| 📋 | Filename list export (.txt/.csv) | |
| 📋 | Selection report (exportable) | |
| 📋 | Email notification when the client finishes | |
| 🔮 | Lightroom export (XMP sidecars) | |
| 🔮 | Multi-client overlay, Editor's Picks, activity log, analytics | |
| ❌ | CRM features | Non-goal: Glimps stays focused on proofing and delivery |

## Photos and storage

| Status | Feature | Notes |
|--------|---------|-------|
| ❌ | Google Drive folder import + indexing | Dropped. Code is still present and fails; it is removed in phase 2 |
| ❌ | Album reindex from Drive | Removed with the above |
| 🔧 | Storage layer (`local` / `r2`) | Phase 2 |
| 📋 | Storage provider | Cloudflare R2 (final). Backblaze B2 revisited only past ~1 TB stored, after a Mumbai download-speed test |
| 📋 | Direct-to-storage presigned upload (multipart) | Phase 3. JPEG/PNG/WebP, max 30 MB, 50 files per request |
| 📋 | Server-generated object keys | `albums/{album_id}/{photo_id}/original.ext` |
| 📋 | Selection masters (~2560 px) vs delivery originals | Selection albums keep resized masters; delivery albums keep full originals; never stored twice |
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
| 📋 | Signed PIN proof required on every public route | Sent as a Bearer header (D13); hashed PIN storage |
| 🔧 | Automated tests (leaks, slug returns 404, PIN, idempotency, cross-album writes) | Phase 1 |
| 📋 | General API rate limiting | |
| 📋 | Terms of service at signup | Required before public launch |
| 📋 | "Report this page" link on public pages | Required before public launch; reports go to an admin queue |
| 📋 | Admin switch to disable an album | Required before public launch; the photographer can't re-enable it |
| 📋 | File-type allow-list | JPEG/PNG/WebP by magic bytes (already in the upload design) |

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
| 🔮 | Portfolio website (included in Pro, PROPOSED) | Basic template site on a free subdomain `name.<portfolio-domain>` (separate portfolio domain, one proxied wildcard record, first-level names only). A few templates rendered by one route from a per-photographer config; up to 30 images (2 MB each), excluded from album expiry; template sample images royalty-free or owned, with licences recorded. Built after the core product; not announced before it exists |
| 🔮 | Portfolio customisation add-on | Extra templates; a custom domain (one per photographer) via Caddy on-demand TLS with a verified-domains approval endpoint, our own throttling, a reserved static IP and certificate monitoring. Custom domains bypass Cloudflare (no CDN or DDoS shield for the HTML). Apex via A record untested |
| 🔮 | Interim: domain forwarding help page | Photographer forwards their own domain to their Glimps subdomain at the registrar |
| 🔮 | Fallback: Cloudflare for SaaS | Not planned; 100 hostnames included then $0.10 / month each; no apex or wildcard below Enterprise |
| 📋 | "Made with Glimps" mark | On Free plan public pages |

## Platform

| Status | Feature | Notes |
|--------|---------|-------|
| 🟡 | PWA (manifest + service worker) | Caching rules still target Drive thumbnails; revisit in phase 5/6 |
| 🔧 | Dependency cleanup | `requirements.txt` is UTF-16 and missing python-jose; phase 2 |
| 📋 | Consistent DB driver | Currently psycopg 3 by default; settle in phase 2 |
| 📋 | Managed Postgres | DigitalOcean, Bangalore (decided); plain Postgres only. Beta topology is D18 |
| 📋 | Job queue | Postgres jobs table + one worker process (decided). Phase 4 |
| 📋 | Fair job scheduling between photographers | Max 2 running jobs per photographer (configurable) while others are waiting; uses every slot when nobody else is; ties go to the least recently served photographer, so it's fair with a single worker slot too (D24, decided). Columns in phase 2, logic in phase 4 |
| 📋 | Queue diagnostics + alert | Queue depth per photographer and oldest queued job age on an admin endpoint; alert above 30 min. Phase 4 |
| 📋 | Custom domain (`app.` + `api.`) | Required; buy before the Deploy phase |
| 📋 | Deploy phase | systemd, Caddy (frontend self-hosted, no Vercel), deploy script, backup + tested restore, monitoring; after phase 6 |
| 📋 | Billing via Razorpay Subscriptions | UPI AutoPay (India) and international cards; before anyone is charged (D19) |
| 📋 | Frontend error boundaries | |
| 🔮 | Capacitor app wrapper | |

## Future (designed in SYSTEM_DESIGN.md, not built)

Build order: phases 2-6, then Deploy, then Flow A polish, then face indexing + Flow B, then the desktop app, then Flow C1 (live online), then Flow C2 (pure offline).

| Status | Feature | Notes |
|--------|---------|-------|
| 🔮 | **Flow A polish:** "Who's choosing? Bride / Groom / Family", separate per-person picks | Shared selection is open (D1, decide before Flow A polish) |
| 🔮 | **Flow B: guest delivery album** with its own link + PIN (decided, D7) | Shares the albums/photos tables via `kind` (D8); separate routes and guest tables; guests are read-only |
| 🔮 | Selfie search (live camera only) and download of your own photos | Selfie discarded immediately; consent first; rate-limited; search log for the photographer |
| 🔮 | `guest_mode`: full gallery vs find-my-photos-only | Enforced on the server. Default is open (D2, decide before Flow B) |
| 🔮 | Hide photos from guest search; delete all face data | Photographer controls |
| 🔮 | In-app browser detection ("Open in Chrome/Safari") | Camera needs a real browser and HTTPS |
| 🔮 | **Desktop app:** folder-watch upload with local compression, download selections to folders | Tauri or Electron + local FastAPI |
| 🔮 | XMP sidecar export for Lightroom/Photoshop | Matched to RAW files by filename |
| 🔮 | **Flow C1: live online sharing** (desktop app uploads previews first, originals later; guests search in the cloud over HTTPS) | Built before C2. Needs internet at the venue |
| 🔮 | **Flow C2: pure offline sharing** (laptop server, SD-card ingest, guests over WiFi by QR) | Blocked on HTTPS on the LAN (SYSTEM_DESIGN D6), still unsolved |
| ❌ | Operator selfie kiosk for offline mode | Dropped (Nov 2026) |
| 🔮 | Android guest app | Only if the browser route for Flow C2 fails; not planned |

---

## Plans (PROPOSED Nov 2026; pricing still to be validated with photographers)

| | Free (permanent) | Pro (₹600 / $6 a month, before tax) | Studio (later) |
|------|------|------|------|
| Uploads per month | 10 GB | 50 GB, pooled across albums (~5 events) | pooled across seats |
| Stored-bytes ceiling | 20 GB (assumption) | 200 GB (assumption) | – |
| Retention | selection 14 days, delivery 7 days | 3.5 months | – |
| Desktop app (uploader, compression, downloads, XMP) | ✔ | ✔ | ✔ |
| Delivery albums | full-gallery browsing only | ✔, incl. face search | ✔ |
| Live online / offline modes | – | ✔ | ✔ |
| Branding | "Made with Glimps" mark | own branding | shared branding, roles |
| Portfolio site | – | basic template, free subdomain (proposed) | – |
| Add-ons | – | portfolio customisation (extra templates, custom domain), extra 10 GB upload blocks, longer retention (later) | – |

Payments through Razorpay Subscriptions (UPI AutoPay in India). Grace after expiry: 7 days. Cost model and break-even: SYSTEM_DESIGN §9.12.
