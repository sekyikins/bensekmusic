# SekMusic

Extract audio and video from streaming links, search tracks, and view synced
lyrics. The project is split into a **Next.js frontend** and a standalone
**FastAPI + yt-dlp backend** that does the heavy media processing.

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
├── backend/                        # FastAPI media server (yt-dlp)
│   ├── app/
│   │   ├── main.py                 # FastAPI app + routes (process/download/status/health)
│   │   ├── config.py               # env + cookies/proxy/JS-runtime resolution
│   │   ├── ytdlp_client.py         # yt-dlp wrapper with player-client fallbacks
│   │   ├── search.py               # resilient search pool (yt-dlp/native/Invidious)
│   │   ├── fingerprint.py          # Spotify oEmbed + AudD fingerprinting
│   │   ├── media_store.py          # download cache, background jobs, cleanup
│   │   └── errors.py               # friendly yt-dlp error messages
│   ├── requirements.txt
│   ├── runtime.txt                 # Python version for Render
│   ├── downloads/                  # cached media (gitignored)
│   └── .env.example
│
├── .gitignore
└── README.md
```

## Getting Started

The two apps are separate packages. Install and run each in its own terminal.

### Backend — Python 3.12+

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 3001
```

`pip install` pulls `yt-dlp[default]` (which bundles the EJS challenge solver
scripts), `imageio-ffmpeg` (a static ffmpeg) and `deno` (the JavaScript runtime),
so nothing else is needed. The first run creates `backend/downloads/` for cached
media.

### Frontend — Node 18+

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

- `backend/.env.local` — `PORT` (default `3001`) and `BASE_URL` (public URL the
  backend uses to build media links, e.g. `http://localhost:3001`). Optional:
  `YTDLP_COOKIES` / `YTDLP_COOKIES_PATH` / `YTDLP_PROXY` / `YTDLP_JS_RUNTIMES`
  (see *YouTube blocks cloud IPs* below).
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
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| Environment | `PYTHON_VERSION=3.12.10` and `BASE_URL=https://<your-service>.onrender.com` *(optional — `RENDER_EXTERNAL_URL` is used automatically)* |

- Do **not** set `PORT` — Render injects it.
- `requirements.txt` pins `yt-dlp[default]`, `imageio-ffmpeg` (bundles ffmpeg)
  and `deno` (bundles the JavaScript runtime), so no extra system packages are
  required.
- The free instance type spins down after ~15 min idle; point an uptime monitor at
  `/health` (every ~10 min) to keep it warm.
- `GET /api/ytdlp-check` reports the yt-dlp version, ffmpeg, JS runtime, and
  whether cookies/proxy are configured — handy for debugging.

#### YouTube blocks cloud IPs

YouTube commonly rejects datacenter IPs (Render, Railway, Fly, …) with
*"Sign in to confirm you're not a bot"*. The backend tries several player clients,
but if downloads still fail, give yt-dlp credentials via **one** of:

| Env var | What it is |
| --- | --- |
| `YTDLP_COOKIES` | Contents of a Netscape `cookies.txt` (raw or base64) from a browser logged into YouTube |
| `YTDLP_COOKIES_PATH` | Absolute path to a `cookies.txt` on the server |
| `YTDLP_PROXY` | Proxy URL, e.g. `http://user:pass@host:port` (residential proxies work best) |
| `YTDLP_JS_RUNTIMES` | JavaScript runtime for YouTube's challenges: `deno` (default) or `node` |
| `YTDLP_REMOTE_COMPONENTS` | Optional. Allow runtime JS component downloads, e.g. `ejs:github` (only needed if the bundled `yt-dlp-ejs` is unavailable) |

Three things matter on cloud hosts:

1. **Cookies** clear the bot check.
2. A **JavaScript runtime** (`deno`, bundled by the `deno` package) executes the
   challenge solver.
3. The **EJS challenge solver scripts**, bundled via `yt-dlp[default]` (the
   `yt-dlp-ejs` package). Without them you get *"The page needs to be reloaded"*.

Exporting cookies:

```bash
# Using yt-dlp itself (writes a Netscape cookies.txt):
yt-dlp --cookies-from-browser firefox --cookies cookies.txt
```

Then set `YTDLP_COOKIES` on Render to the file contents (base64-encoding avoids
newline problems), or upload a Render **Secret File** and point `YTDLP_COOKIES_PATH`
at it. Cookies expire, so re-export periodically. For a long-term fix, see the
[yt-dlp PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide).

### Frontend → Vercel

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Environment | `NEXT_PUBLIC_MEDIA_SERVER_URL=https://<your-render-service>.onrender.com` |

Deploy the backend first so you know its URL, then set that variable on Vercel.
