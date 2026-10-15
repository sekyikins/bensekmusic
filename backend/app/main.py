"""FastAPI application exposing the media engine HTTP contract."""

from __future__ import annotations

import asyncio
import logging
import mimetypes
import os
import random
import re
import string
from contextlib import asynccontextmanager
from pathlib import Path

import yt_dlp
from fastapi import Body, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse

from . import config, fingerprint, media_store, search, ytdlp_client
from .errors import friendly_error

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("sekmusic")

_URL_RE = re.compile(r"^https?://", re.I)
_DOMAIN_RE = re.compile(r"^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(/.*)?$")
_RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)$")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    log.info("[yt-dlp] Using cookies file: %s", config.COOKIES_FILE or "(none)")
    log.info("[yt-dlp] Using proxy: %s", config.PROXY or "(none)")
    log.info("[yt-dlp] Using JS runtime config: %s", config.JS_RUNTIME_CONFIG or "(auto)")
    log.info("[yt-dlp] Using ffmpeg: %s", config.FFMPEG_PATH or "(not found)")
    cleanup_task = asyncio.create_task(media_store.cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()


app = FastAPI(title="SekMusic media engine", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _random_id() -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def _normalize_type(value: str | None) -> str:
    return "video" if value == "video" else "audio"


# ---------------------------------------------------------------------------
# Search / resolve
# ---------------------------------------------------------------------------
@app.post("/api/process")
async def process(body: dict | None = Body(default=None)):
    try:
        raw_input = (body or {}).get("input")
        if not raw_input:
            return JSONResponse({"error": "Input is required"}, status_code=400)

        search_string = str(raw_input).strip()
        is_url = bool(_URL_RE.match(search_string) or _DOMAIN_RE.match(search_string))

        # Spotify links become a plain search query via oEmbed.
        if is_url and "spotify.com" in search_string:
            resolved = await fingerprint.spotify_to_query(search_string)
            if resolved:
                search_string = resolved
                is_url = False

        if is_url:
            try:
                info = await asyncio.to_thread(ytdlp_client.run, search_string)
            except Exception as exc:  # noqa: BLE001
                log.error("yt-dlp URL extraction failed: %s", exc)
                return JSONResponse(
                    {
                        "error": "Failed to extract media from this URL. "
                        "It may be unsupported or private."
                    },
                    status_code=400,
                )

            if not info:
                return JSONResponse(
                    {"error": "Could not retrieve media info from this URL."}, status_code=400
                )

            duration = info.get("duration") or 0

            # Short clips: fingerprint via AudD to find the real song.
            if 0 < duration <= 180:
                resolved = await fingerprint.recognize_from_info(info)
                if resolved:
                    search_string = resolved
                    is_url = False

            if is_url:
                if duration > 180:
                    return JSONResponse(
                        {"error": "Content must be under 3 minutes long."}, status_code=400
                    )

                track = {
                    "id": info.get("id") or _random_id(),
                    "title": info.get("title") or "Unknown Title",
                    "artist": info.get("uploader")
                    or info.get("artist")
                    or info.get("channel")
                    or "Unknown Artist",
                    "duration": duration,
                    "url": info.get("webpage_url") or search_string,
                    "extractor": info.get("extractor") or "generic",
                }
                if info.get("thumbnail"):
                    track["thumbnail"] = info["thumbnail"]
                return JSONResponse([track])

        # Resilient search pool for text queries (and resolved Spotify/clips).
        try:
            videos = await search.search_pool(search_string)
        except Exception as exc:  # noqa: BLE001
            log.error("Resilient search pool failed: %s", exc)
            return JSONResponse(
                {
                    "error": "Failed to fetch search results from resilient search pool. "
                    "Please try again."
                },
                status_code=500,
            )

        results = []
        for video in videos[:5]:
            video_id = video["videoId"]
            results.append(
                {
                    "id": video_id,
                    "title": video.get("title") or "Unknown Title",
                    "artist": video.get("author") or "Unknown Artist",
                    "duration": video.get("lengthSeconds") or 0,
                    "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                    "url": f"https://youtube.com/watch?v={video_id}",
                    "extractor": "youtube",
                }
            )
        return JSONResponse(results)
    except Exception as exc:  # noqa: BLE001 - never let /api/process 500 without a body
        log.exception("Process error")
        return JSONResponse({"error": f"Process error: {exc}"}, status_code=500)


# ---------------------------------------------------------------------------
# Downloads
# ---------------------------------------------------------------------------
@app.get("/api/download")
async def download(
    url: str | None = Query(default=None),
    media_type: str | None = Query(default=None, alias="type"),
):
    if not url:
        return JSONResponse({"error": "Missing video URL"}, status_code=400)
    normalized = _normalize_type(media_type)
    media_store.start_download(url, normalized)
    return JSONResponse(media_store.media_info(url, normalized))


@app.get("/api/status")
async def status(
    url: str | None = Query(default=None),
    media_type: str | None = Query(default=None, alias="type"),
):
    if not url:
        return JSONResponse({"error": "Missing video URL"}, status_code=400)
    normalized = _normalize_type(media_type)
    return JSONResponse(media_store.media_info(url, normalized))


# ---------------------------------------------------------------------------
# Health & diagnostics
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"service": "sekmusic-media-engine", "status": "ok", "version": app.version}


@app.get("/api/ytdlp-check")
async def ytdlp_check(url: str | None = Query(default=None)):
    """Report yt-dlp / ffmpeg / runtime / cookie status for easier debugging."""
    report: dict = {
        "ok": True,
        "yt_dlp": yt_dlp.version.__version__,
        "ffmpeg": config.FFMPEG_PATH,
        "js_runtime": config.JS_RUNTIME_CONFIG or "auto",
        "cookies_configured": bool(config.COOKIES_FILE),
        "cookies_file": config.COOKIES_FILE,
        "proxy_configured": bool(config.PROXY),
        "player_clients": config.YT_PLAYER_CLIENTS,
    }
    if url:
        try:
            info = await asyncio.to_thread(ytdlp_client.run, url)
            report["url_check"] = {
                "ok": True,
                "id": info.get("id"),
                "title": info.get("title"),
                "duration": info.get("duration"),
            }
        except Exception as exc:  # noqa: BLE001
            report["ok"] = False
            report["url_check"] = {"ok": False, "error": friendly_error(exc)}
    return report


# ---------------------------------------------------------------------------
# Cached media (HTTP Range aware)
# ---------------------------------------------------------------------------
def _file_chunks(path: Path, start: int, length: int, chunk_size: int = 256 * 1024):
    with open(path, "rb") as handle:
        handle.seek(start)
        remaining = length
        while remaining > 0:
            data = handle.read(min(chunk_size, remaining))
            if not data:
                break
            remaining -= len(data)
            yield data


@app.get("/downloads/{filename}")
async def serve_download(filename: str, request: Request):
    safe_name = os.path.basename(filename)
    path = Path(config.DOWNLOADS_DIR) / safe_name
    if not safe_name or not path.is_file():
        return JSONResponse({"error": "Not found"}, status_code=404)

    size = path.stat().st_size
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"

    start, end, status_code = 0, size - 1, 200
    range_header = request.headers.get("range")
    if range_header:
        match = _RANGE_RE.match(range_header.strip())
        if match:
            first, last = match.group(1), match.group(2)
            if first:
                start = int(first)
                end = int(last) if last else size - 1
            elif last:
                start = max(0, size - int(last))
                end = size - 1

            if start > end or start >= size:
                return Response(
                    status_code=416,
                    headers={"Content-Range": f"bytes */{size}"},
                )
            end = min(end, size - 1)
            status_code = 206

    length = end - start + 1
    headers = {
        "Content-Length": str(length),
        "Accept-Ranges": "bytes",
        "Content-Type": content_type,
    }
    if status_code == 206:
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"

    return StreamingResponse(
        _file_chunks(path, start, length),
        status_code=status_code,
        headers=headers,
    )
