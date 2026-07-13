# Glimps — Feature Roadmap

## Legend

- ✅ Implemented
- 🔧 In Progress
- 📋 Planned (v1)
- 🔮 Future (v2+)

---

## Core — Album Sharing

| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | Google Drive integration | Photographer pastes GDrive folder link, app indexes all photos |
| ✅ | Shareable album link | Unique slug URL per album (e.g. `glimps.app/a/wedding-raj-neha-x8k2m1`) |
| ✅ | PIN protection | Optional 4-6 digit PIN for private albums |
| ✅ | Background photo indexing | Photos indexed async, album browsable immediately |
| ✅ | Album reindex | Re-fetch from GDrive if photographer adds/removes photos |
| 📋 | Album expiry/deadline | Photographer sets expiry date — creates urgency, auto-disables link |
| 📋 | Cover photo | Photographer picks a hero image for the album thumbnail |
| 📋 | Download toggle | Photographer enables/disables client downloads per album, changeable anytime |

---

## Client — Photo Browsing

| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | Masonry layout | Pinterest-style layout respecting aspect ratios |
| ✅ | Lightbox view | Full-screen photo viewer with keyboard navigation |
| ✅ | Lazy loading | Photos load as client scrolls, paginated |
| ✅ | Responsive columns | 2 cols mobile → 5 cols desktop |
| 📋 | Layout switcher | Client chooses: Masonry / Grid / Column / Justified |
| 📋 | Dark mode | Toggle dark background for better photo viewing |
| 📋 | Sort options | By filename, date taken, photographer's order, popularity |
| 🔮 | Slideshow mode | Auto-play through photos, optional music |

---

## Client — Selection & Review

| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | Select/deselect photos | Toggle selection with click |
| ✅ | Optimistic updates | Instant UI feedback, syncs with server |
| ✅ | View selected photos | Filter to show only selected |
| 📋 | **Yes / Maybe / No** | Three-state selection: Yes (want), Maybe (undecided), No (skip) |
| 📋 | **Favorite (heart)** | Independent of selection — client's personal favorites |
| 📋 | **Comment on photo** | Client leaves notes per photo (e.g. "crop tighter", "love this one") |
| 📋 | **Filter bar** | Quick toggles: All / Yes / Maybe / No / Favorites / Unreviewed |
| 📋 | **Selection progress** | "You've reviewed 120/500 photos" progress bar |
| 📋 | **Compare mode** | Side-by-side view of 2 photos for choosing between similar shots |
| 📋 | **Selection limit** | Photographer sets max picks (e.g. "Choose up to 50") — prevents over-selection |
| 📋 | **Dropdown actions** | "∨" dropdown on each photo: Yes / Maybe / No / Clear — clean, non-intrusive |
| 📋 | **Keyboard shortcuts** | Arrow left/right to navigate, Y/M/N for selection, H to favorite |
| 🔮 | **Batch select** | Shift+click to select a range of photos |
| 🔮 | **Share favorites** | Client generates a link to show their picks to someone else |

---

## Photographer — Branding

| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | Logo upload | Photographer uploads their studio logo |
| ✅ | Brand colors | Primary + accent color customization |
| ✅ | Business name & tagline | Shown on every album page |
| ✅ | Website & Instagram links | Social links in album footer |
| ✅ | Live preview | See how album header looks while editing branding |

---

## Photographer — Dashboard & Management

| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | Album CRUD | Create, update, delete albums |
| ✅ | Selection summary | See per-client selection counts |
| ✅ | Copy share link | One-click copy album URL |
| 📋 | **Selection report** | Detailed summary: X Yes, Y Maybe, Z comments per client — exportable |
| 📋 | **Multi-client overlay** | See what each client picked side-by-side (e.g. bride vs groom selections) |
| 🔮 | **Editor's Picks** | Photographer pre-marks recommended photos — clients see a star badge |
| 📋 | **Lightroom export (XMP)** | Generate .xmp sidecar files with star ratings (5★=Yes, 3★=Maybe, 1★=No) + color labels for favorites. Drop next to originals, Lightroom reads them. |
| 📋 | **Filename list export** | Download .txt/.csv of selected filenames for manual Lightroom filtering |
| 📋 | **Email notification** | Notify photographer when client finishes selecting |
| 📋 | **Download toggle control** | Enable/disable client downloads per album, changeable after sharing |
| 🔮 | **Activity log** | "Client opened album at 3pm, selected 20 photos in 45 min" |
| 🔮 | **Analytics** | Views, time spent, most-viewed photos per album |

---

## Client — Multi-Album

| Status | Feature | Description |
|--------|---------|-------------|
| 🔮 | **Multi-album view** | Client who has access to multiple albums (engagement + wedding) sees them in one place |
| 🔮 | **Favorites folder** | Cross-album favorites collection |

---

## Face Recognition (v2)

| Status | Feature | Description |
|--------|---------|-------------|
| 🔮 | Face detection | InsightFace `buffalo_s` model extracts face embeddings at album creation |
| 🔮 | Face scan | Client uses webcam to scan face → sees only their photos |
| 🔮 | Face grouping | Auto-group photos by person — photographer sees clusters |
| 🔮 | Share by face | "Send Raj only his photos" — one click |

---

## Technical / Platform

| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | PWA | Installable on mobile, service worker caches thumbnails |
| ✅ | Google OAuth | One-click login for photographers, grants Drive access |
| ✅ | Async job queue | Album indexing runs in background, doesn't block UI |
| 📋 | **Rate limiting** | Protect API from abuse |
| 📋 | **Error boundaries** | Graceful error handling in frontend |
| 🔮 | **Capacitor wrapper** | Ship to App Store / Play Store |
| 🔮 | **Custom domains** | Photographer uses `photos.sharmaStudios.com` instead of `glimps.app` |

---

## Monetization Path (Future)

| Tier | Features |
|------|----------|
| **Free** | 5 albums/month, logo + colors, basic selection |
| **Pro** | Unlimited albums, remove "Powered by Glimps", Lightroom export, comments, compare mode, analytics |
| **Studio** | Custom domain, multi-photographer team, priority face rec processing, white-label |
