# SekMusic

Extract audio and video from streaming links, search tracks, and view synced
lyrics. The project is split into a **Next.js frontend** and a standalone
**Express + yt-dlp backend** that does the heavy media processing.

## Structure

```
sekmusic/
├── frontend/                       # Next.js (App Router) + TypeScript web client
│   ├── src/
│   │   ├── app/                    # Routes: pages + API routes (/api/*)
│   │   │   ├── api/                # download, prepare, process, lyrics, recognize
│   │   │   ├── page.tsx            # Home — thin wrapper around the provider
│   │   │   ├── layout.tsx
│   │   │   └── about | contact | privacy | terms
│   │   ├── components/
│   │   │   └── home/               # Hero, SearchBar, HistoryList, SearchResults,
│   │   │                           # PlayerSection, LyricsPanel, Audio/Video,
│   │   │                           # TrackCard, DownloadButtons, ExternalLinks…
│   │   ├── context/
│   │   │   └── HomeContext.tsx     # All home state/logic (useHome provider)
│   │   └── lib/                    # format, lyrics parsing, motion variants, types
│   ├── public/
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                        # Express media server (yt-dlp)
│   ├── server.js                   # /api/process, /api/download, /api/status
│   ├── bin/                        # yt-dlp binary (gitignored)
│   ├── downloads/                  # cached media (gitignored)
│   └── package.json
│
├── .gitignore
└── README.md
```

## Getting Started

Install dependencies once in each app (they are separate packages):

```bash
cd backend && npm install
cd ../frontend && npm install
```

Run each app in its own terminal:

```bash
# Terminal 1 — media backend (defaults to http://localhost:3001)
cd backend
npm run dev        # nodemon server.js  (or: npm start)

# Terminal 2 — web frontend (http://localhost:3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

- `backend/.env.local` — `PORT` (default `3001`) and `BASE_URL` (public URL the
  backend uses to build media links, e.g. `http://localhost:3001`). Optional:
  `YTDLP_COOKIES` / `YTDLP_COOKIES_PATH` / `YTDLP_PROXY` (see *YouTube blocks
  cloud IPs* below).
- `frontend/.env.local` — `NEXT_PUBLIC_MEDIA_SERVER_URL` pointing at the backend
  (defaults to `http://localhost:3001`).

Both `.env*` files are gitignored; see the matching `.env.example` in each app.

## How downloading works

1. The frontend asks `/api/prepare` to start a job on the backend for a track.
2. The backend downloads with `yt-dlp` in the background and returns immediately.
3. The frontend polls `/api/prepare` until the media reports `ready`.
4. The player and download links then point at `/api/download`, which proxies the
   cached file from the backend (supports HTTP Range/seek).

## Who runs yt-dlp

**Only the backend does.** The frontend never installs or executes `yt-dlp`:

- `/api/process` (search + link resolution) → proxied to the backend `/api/process`.
- `/api/prepare` + `/api/download` → proxied to the backend.
- `/api/lyrics` (LRCLIB) and `/api/recognize` (AudD) call external HTTPS APIs directly.

This keeps the Vercel deployment free of native binaries.

## Deploy

The two halves deploy independently from this one repository; each host needs its
**Root Directory** set to its subfolder.

### Backend → Render

| Setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Environment | `BASE_URL=https://<your-service>.onrender.com` *(optional — `RENDER_EXTERNAL_URL` is used automatically)* |

- Do **not** set `PORT` — Render injects it.
- If the build fails on `yt-dlp-exec`'s Python check, use:
  `npm install --ignore-scripts && node node_modules/yt-dlp-exec/scripts/postinstall.js`
- The free instance type spins down after ~15 min idle; point an uptime monitor at
  `/health` (every ~10 min) to keep it warm.

#### YouTube blocks cloud IPs

YouTube commonly rejects datacenter IPs (Render, Railway, Fly, …) with
*"Sign in to confirm you're not a bot"*. The backend tries several player clients,
but if downloads still fail, give yt-dlp credentials via **one** of:

| Env var | What it is |
| --- | --- |
| `YTDLP_COOKIES` | Contents of a Netscape `cookies.txt` (raw or base64) from a browser logged into YouTube |
| `YTDLP_COOKIES_PATH` | Absolute path to a `cookies.txt` on the server |
| `YTDLP_PROXY` | Proxy URL, e.g. `http://user:pass@host:port` (residential proxies work best) |

Exporting cookies:

```bash
# Using yt-dlp itself (writes a Netscape cookies.txt):
yt-dlp --cookies-from-browser chrome --cookies cookies.txt
```

Then set `YTDLP_COOKIES` on Render to the file contents (base64-encoding avoids
newline problems). Cookies expire, so re-export periodically. For a long-term
fix, see the [yt-dlp PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide).

### Frontend → Vercel

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Environment | `NEXT_PUBLIC_MEDIA_SERVER_URL=https://<your-render-service>.onrender.com` |

Deploy the backend first so you know its URL, then set that variable on Vercel.
