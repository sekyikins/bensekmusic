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
│   ├── server.js                   # /api/download, /api/status
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
  backend uses to build media links, e.g. `http://localhost:3001`).
- `frontend/.env.local` — `NEXT_PUBLIC_MEDIA_SERVER_URL` pointing at the backend
  (defaults to `http://localhost:3001`).

Both `.env*` files are gitignored; see the matching `.env.example` in each app.

## How downloading works

1. The frontend asks `/api/prepare` to start a job on the backend for a track.
2. The backend downloads with `yt-dlp` in the background and returns immediately.
3. The frontend polls `/api/prepare` until the media reports `ready`.
4. The player and download links then point at `/api/download`, which proxies the
   cached file from the backend (supports HTTP Range/seek).

## Deploy

The web app deploys to Vercel from the `frontend/` directory — set the project
**Root Directory** to `frontend`. The backend must be hosted separately (it needs
`yt-dlp` and persistent disk for the media cache).
