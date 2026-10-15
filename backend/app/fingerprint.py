"""Audio fingerprinting helpers.

* Spotify links are resolved to a plain search query via Spotify's public oEmbed
  endpoint.
* Short clips (<= 3 min) are fingerprinted with AudD so a 30s TikTok/Shorts clip
  resolves to the underlying song instead of the clip itself.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

log = logging.getLogger("sekmusic.fingerprint")

_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


async def spotify_to_query(spotify_url: str) -> str | None:
    """Turn a Spotify URL into a ``"title artist"`` search string."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://open.spotify.com/oembed", params={"url": spotify_url}
            )
        if response.status_code == 200:
            data = response.json()
            query = f"{data.get('title', '')} {data.get('author_name', '')}".strip()
            return query or None
    except Exception as exc:  # noqa: BLE001 - non-fatal fallback
        log.error("Spotify oEmbed fallback failed: %s", exc)
    return None


def _best_audio_url(info: dict[str, Any]) -> str | None:
    formats = info.get("formats") or []
    audio_only = [
        fmt
        for fmt in formats
        if fmt.get("vcodec") == "none" and fmt.get("acodec") not in (None, "none") and fmt.get("url")
    ]
    audio_only.sort(key=lambda fmt: fmt.get("abr") or 0, reverse=True)
    if audio_only:
        return audio_only[0]["url"]
    for fmt in formats:
        if fmt.get("url"):
            return fmt["url"]
    return None


async def recognize_from_info(info: dict[str, Any]) -> str | None:
    """Fingerprint a short clip's audio and return ``"artist title"``."""
    audio_url = _best_audio_url(info)
    if not audio_url:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            sample = await client.get(
                audio_url,
                headers={"User-Agent": _BROWSER_UA, "Range": "bytes=0-204799"},
                timeout=8.0,
            )
            if sample.status_code not in (200, 206):
                return None

            response = await client.post(
                "https://api.audd.io/",
                files={"file": ("sample.mp3", sample.content, "audio/mpeg")},
                data={"api_token": "test"},
            )
        if response.status_code != 200:
            return None

        data = response.json()
        if data.get("status") == "success" and data.get("result"):
            song = data["result"]
            query = f"{song.get('artist', '')} {song.get('title', '')}".strip()
            return query or None
    except Exception as exc:  # noqa: BLE001 - fingerprinting is best-effort
        log.error("AudD fingerprint step failed (non-fatal): %s", exc)
    return None
