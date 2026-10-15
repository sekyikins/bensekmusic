"""Download cache and background job management.

Behaviour is intentionally identical to the old Node implementation:

* A media file is keyed by ``md5(url + mediaType)``.
* ``/api/download`` starts a background download and returns immediately.
* ``/api/status`` only reports state and never triggers work.
* Failures are remembered per key so the frontend shows a real error instead of
  polling until it times out.
* Audio and video for the same URL are serialised behind a per-URL lock.
* Cached files older than 2 hours are pruned every 30 minutes.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import time
from pathlib import Path

from . import config, ytdlp_client
from .errors import friendly_error

log = logging.getLogger("sekmusic.media")

# Format selection per media type. Audio prefers m4a for the widest browser
# playback support (Chrome/Safari/Firefox), falling back to any audio stream.
_FORMATS = {
    "audio": "bestaudio[ext=m4a]/bestaudio/best",
    "video": "best[height<=480][ext=mp4]/best[height<=720][ext=mp4]/best",
}

_active: dict[str, asyncio.Task] = {}
_failures: dict[str, str] = {}
_locks: dict[str, asyncio.Lock] = {}

CLEANUP_INTERVAL_SECONDS = 30 * 60
MAX_FILE_AGE_SECONDS = 2 * 60 * 60


def hash_for(url: str, media_type: str) -> str:
    return hashlib.md5(f"{url}{media_type}".encode("utf-8")).hexdigest()


def find_completed_file(files: list[str], media_hash: str) -> str | None:
    """Find a finished file for ``media_hash`` (ignoring ``.part``/``.ytdl``).

    Prefers a "clean" single-extension file (``<hash>.mp4``) over split
    download artefacts.
    """
    for name in files:
        if not name.startswith(media_hash) or name.endswith((".part", ".ytdl")):
            continue
        if name[len(media_hash) :].count(".") == 1:
            return name

    for name in files:
        if name.startswith(media_hash) and not name.endswith((".part", ".ytdl")):
            return name
    return None


def media_info(url: str, media_type: str) -> dict[str, str]:
    """Report the current state of a media file without starting any work."""
    media_hash = hash_for(url, media_type)
    files = os.listdir(config.DOWNLOADS_DIR)

    existing = find_completed_file(files, media_hash)
    if existing:
        return {
            "status": "ready",
            "url": f"{config.BASE_URL}/downloads/{existing}",
            "filename": existing,
        }
    if media_hash in _active:
        return {"status": "downloading"}
    if media_hash in _failures:
        return {"status": "error", "error": _failures[media_hash]}
    return {"status": "idle"}


def _download_sync(url: str, media_type: str, media_hash: str) -> None:
    output_template = str(Path(config.DOWNLOADS_DIR) / f"{media_hash}.%(ext)s")
    ytdlp_client.run(
        url,
        {"outtmpl": output_template, "format": _FORMATS[media_type]},
        download=True,
    )


async def _download_task(url: str, media_type: str, media_hash: str) -> None:
    log.info("Starting download for %s: %s", media_type, url)
    lock = _locks.setdefault(url, asyncio.Lock())
    try:
        # Serialise per-URL so audio + video don't hit YouTube at once.
        async with lock:
            await asyncio.to_thread(_download_sync, url, media_type, media_hash)
        log.info("Finished download for %s (%s)", media_hash, media_type)
    except Exception as exc:  # noqa: BLE001 - surfaced through /api/status
        message = friendly_error(exc)
        log.error("Download failed for %s: %s", media_hash, message)
        _failures[media_hash] = message
    finally:
        _active.pop(media_hash, None)


def start_download(url: str, media_type: str) -> None:
    """Kick off a background download (no-op if cached or already running)."""
    media_hash = hash_for(url, media_type)

    if find_completed_file(os.listdir(config.DOWNLOADS_DIR), media_hash):
        return
    if media_hash in _active:
        return

    _failures.pop(media_hash, None)  # this is a fresh attempt
    task = asyncio.create_task(_download_task(url, media_type, media_hash))
    _active[media_hash] = task


async def cleanup_loop() -> None:
    """Periodically delete media older than :data:`MAX_FILE_AGE_SECONDS`."""
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
        try:
            now = time.time()
            for name in os.listdir(config.DOWNLOADS_DIR):
                path = Path(config.DOWNLOADS_DIR) / name
                try:
                    if now - path.stat().st_mtime > MAX_FILE_AGE_SECONDS:
                        path.unlink()
                        log.info("Cleaned up old cached file: %s", name)
                except FileNotFoundError:
                    continue
            # Drop locks that nobody is holding to keep the map from growing.
            for url, lock in list(_locks.items()):
                if not lock.locked():
                    _locks.pop(url, None)
        except Exception as exc:  # noqa: BLE001 - a cleanup failure must not crash the app
            log.error("Cleanup job error: %s", exc)
