"""Resilient YouTube search.

Runs several strategies concurrently and returns the first non-empty result,
exactly like the old Node ``Promise.any`` pool:

1. yt-dlp's own ``ytsearch5:`` (5s budget)
2. A direct scrape of the YouTube results page (4s budget)
3. Several public Invidious instances (4s budget each)
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Awaitable

import httpx

from . import ytdlp_client

log = logging.getLogger("sekmusic.search")

INVIDIOUS_INSTANCES = [
    "https://inv.thepixora.com",
    "https://invidious.lunar.icu",
    "https://yewtu.be",
    "https://inv.nadeko.net",
]

_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


# ---------------------------------------------------------------------------
# YouTube results-page scraping
# ---------------------------------------------------------------------------
def _find_video_renderers(node: Any, results: list[dict]) -> list[dict]:
    if isinstance(node, list):
        for item in node:
            _find_video_renderers(item, results)
        return results
    if not isinstance(node, dict):
        return results
    if node.get("videoRenderer"):
        results.append(node["videoRenderer"])
        return results
    for value in node.values():
        _find_video_renderers(value, results)
    return results


def _parse_video_renderer(renderer: dict) -> dict | None:
    try:
        video_id = renderer.get("videoId")
        if not video_id:
            return None

        title = ""
        title_node = renderer.get("title") or {}
        if title_node.get("runs"):
            title = title_node["runs"][0].get("text", "")
        elif title_node.get("simpleText"):
            title = title_node["simpleText"]

        author = "Unknown Artist"
        byline = renderer.get("longBylineText") or renderer.get("ownerText") or {}
        if byline.get("runs"):
            author = byline["runs"][0].get("text") or author

        length_seconds = 0
        duration_text = (renderer.get("lengthText") or {}).get("simpleText")
        if duration_text:
            parts = [int(p) for p in duration_text.split(":") if p.isdigit()]
            if len(parts) == 2:
                length_seconds = parts[0] * 60 + parts[1]
            elif len(parts) == 3:
                length_seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]

        return {
            "videoId": video_id,
            "title": title,
            "author": author,
            "lengthSeconds": length_seconds,
        }
    except Exception:  # noqa: BLE001 - a malformed renderer must not break search
        return None


def _extract_initial_data(html: str) -> str:
    """Pull the ``ytInitialData`` JSON object out of a YouTube results page."""
    index = html.find("ytInitialData =")
    if index == -1:
        index = html.find("ytInitialData")
    if index == -1:
        raise ValueError("ytInitialData not found in page")

    start = html.find("{", index)
    if start == -1:
        raise ValueError("ytInitialData has no object")

    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(html)):
        char = html[i]
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return html[start : i + 1]
    raise ValueError("Unbalanced ytInitialData JSON")


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------
async def _ytsearch(query: str) -> list[dict]:
    info = await asyncio.to_thread(
        ytdlp_client.run_once, f"ytsearch5:{query}", {"extract_flat": True}
    )
    entries = info.get("entries") or []
    results: list[dict] = []
    for entry in entries:
        if not entry or not entry.get("id"):
            continue
        results.append(
            {
                "videoId": entry["id"],
                "title": entry.get("title") or "Unknown Title",
                "author": entry.get("uploader") or "Unknown Artist",
                "lengthSeconds": entry.get("duration") or 0,
            }
        )
    return results


async def _native_search(query: str) -> list[dict]:
    url = "https://www.youtube.com/results"
    params = {"search_query": query, "hl": "en", "gl": "US"}
    async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
        response = await client.get(
            url,
            params=params,
            headers={
                "User-Agent": _BROWSER_UA,
                "Accept": "text/html",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        response.raise_for_status()
        html = response.text

    data = json.loads(_extract_initial_data(html))
    renderers: list[dict] = []
    _find_video_renderers(data, renderers)
    return [parsed for parsed in (_parse_video_renderer(r) for r in renderers) if parsed]


async def _invidious_search(instance: str, query: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
        response = await client.get(
            f"{instance}/api/v1/search",
            params={"q": query, "type": "video"},
            headers={"User-Agent": _BROWSER_UA},
        )
        response.raise_for_status()
        data = response.json()

    if not isinstance(data, list):
        return []
    return [
        {
            "videoId": video.get("videoId"),
            "title": video.get("title") or "Unknown Title",
            "author": video.get("author") or "Unknown Artist",
            "lengthSeconds": video.get("lengthSeconds") or 0,
        }
        for video in data
        if video.get("videoId")
    ]


async def _with_timeout(coro: Awaitable[list[dict]], timeout: float, label: str) -> list[dict]:
    try:
        result = await asyncio.wait_for(coro, timeout)
    except Exception as exc:  # noqa: BLE001 - reported via the pool
        raise RuntimeError(f"{label} failed: {exc}") from exc
    if not result:
        raise RuntimeError(f"{label} returned no results")
    return result


def _retrieve_exception(task: asyncio.Task) -> None:
    """Consume a task's exception so asyncio doesn't warn about it.

    Losing strategies in the race are cancelled or already failed; their
    exceptions are irrelevant once a winner has been returned.
    """
    if task.cancelled():
        return
    try:
        task.exception()
    except Exception:  # noqa: BLE001
        pass


# ---------------------------------------------------------------------------
# Pool
# ---------------------------------------------------------------------------
async def search_pool(query: str) -> list[dict]:
    """Return results from whichever strategy succeeds first."""
    tasks: list[asyncio.Task] = [
        asyncio.create_task(_with_timeout(_ytsearch(query), 5.0, "yt-dlp search")),
        asyncio.create_task(_with_timeout(_native_search(query), 4.0, "native search")),
    ]
    for instance in INVIDIOUS_INSTANCES:
        tasks.append(
            asyncio.create_task(_with_timeout(_invidious_search(instance, query), 4.0, "invidious"))
        )
    for task in tasks:
        task.add_done_callback(_retrieve_exception)

    pending: set[asyncio.Task] = set(tasks)
    last_error: Exception | None = None
    try:
        while pending:
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                error = task.exception()
                if error is None:
                    return task.result()
                last_error = error
        raise last_error or RuntimeError("search pool returned no results")
    finally:
        for task in tasks:
            task.cancel()
