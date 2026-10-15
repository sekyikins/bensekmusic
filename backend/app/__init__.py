"""SekMusic media engine (FastAPI + yt-dlp).

This package is the Python replacement for the previous Express/`server.js`
implementation. It exposes the same HTTP contract so the Next.js frontend does
not need to change:

    GET  /health                 -> {"status": "ok"}
    GET  /api/ytdlp-check        -> diagnostics (yt-dlp/ffmpeg/deno/cookies)
    POST /api/process            -> resolve a URL or run a search
    GET  /api/download           -> start a background download, report status
    GET  /api/status             -> report status only
    GET  /downloads/{filename}   -> serve cached media (HTTP Range aware)
"""

__all__ = ["__version__"]

__version__ = "2.0.0"
