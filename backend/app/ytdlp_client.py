"""Thin wrapper around the Python ``yt_dlp`` library.

Two entry points:

* :func:`run_once` -- a single extraction attempt with the shared base options.
* :func:`run`      -- tries each YouTube player client in turn, which is how the
  old Node server worked around per-client bot checks / format restrictions.

The library is synchronous, so callers should wrap it in ``asyncio.to_thread``.
"""

from __future__ import annotations

import logging
from typing import Any

import yt_dlp

from . import config
from .errors import YtDlpError, friendly_error

log = logging.getLogger("sekmusic.ytdlp")


def _base_options() -> dict[str, Any]:
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "nocheckcertificate": True,
    }
    if config.FFMPEG_PATH:
        opts["ffmpeg_location"] = config.FFMPEG_PATH
    if config.COOKIES_FILE:
        opts["cookiefile"] = config.COOKIES_FILE
    if config.PROXY:
        opts["proxy"] = config.PROXY
    if config.JS_RUNTIME_CONFIG:
        opts["js_runtimes"] = config.JS_RUNTIME_CONFIG
    if config.REMOTE_COMPONENTS:
        opts["remote_components"] = config.REMOTE_COMPONENTS
    return opts


def run_once(
    url: str,
    extra_options: dict[str, Any] | None = None,
    *,
    download: bool = False,
) -> dict[str, Any]:
    """Run yt-dlp a single time and return the extracted info dict."""
    options = _base_options()
    if extra_options:
        options.update(extra_options)
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=download)
    return info or {}


def run(
    url: str,
    extra_options: dict[str, Any] | None = None,
    *,
    download: bool = False,
) -> dict[str, Any]:
    """Try every player client until one succeeds.

    Raises :class:`YtDlpError` (with a friendly message) if all of them fail.
    """
    last_error: Exception | None = None
    for client in config.YT_PLAYER_CLIENTS:
        options = dict(extra_options or {})
        if client != "default":
            options["extractor_args"] = {"youtube": {"player_client": [client]}}
        try:
            return run_once(url, options, download=download)
        except Exception as exc:  # noqa: BLE001 - we intentionally try the next client
            last_error = exc
            log.warning('yt-dlp failed with player client "%s": %s', client, exc)

    raise YtDlpError(friendly_error(last_error))
