"""Translate raw yt-dlp failures into short, user-facing messages."""

from __future__ import annotations

import re


class YtDlpError(RuntimeError):
    """Raised when every player-client fallback fails for a media URL."""


_ERROR_RE = re.compile(r"ERROR:\s*(.*?)(?:\n\s*\[|$)", re.S)


def friendly_error(exc: object) -> str:
    raw = str(exc) if exc is not None else "yt-dlp failed"
    match = _ERROR_RE.search(raw)
    line = match.group(1).replace("[youtube]", "").strip() if match else raw.strip()

    if re.search(r"not a bot|sign in to confirm", line, re.I):
        return (
            "YouTube blocked this server's IP with a bot check. "
            "Set YTDLP_COOKIES on the server to authenticate."
        )
    if re.search(r"page needs to be reloaded", line, re.I):
        return (
            "YouTube rejected the request. Ensure cookies are set (YTDLP_COOKIES) "
            "and a JavaScript runtime (deno) is available."
        )
    if re.search(r"video unavailable|private video|removed", line, re.I):
        return "This video is unavailable, private, or removed."
    return line or "yt-dlp failed"
