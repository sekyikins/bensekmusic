"""Central configuration, resolved once at import time.

Mirrors the environment contract of the old Node server so existing Render/Vercel
configuration keeps working, while adding a couple of conveniences:

* ``.env.local`` wins over ``.env`` (neither overwrites real process env vars).
* ``PORT`` defaults to 3001 for local development; Render injects its own.
* ``BASE_URL`` falls back to Render's ``RENDER_EXTERNAL_URL`` and then to
  ``http://localhost:<PORT>``.
* The virtualenv's ``Scripts``/``bin`` directory is prepended to ``PATH`` so
  yt-dlp can discover a JavaScript runtime (``deno``) installed as a Python
  package.
"""

from __future__ import annotations

import base64
import os
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent

# load_dotenv() does not override already-set variables, so loading .env.local
# first makes it take precedence over .env (matching the old Node behaviour).
load_dotenv(BACKEND_DIR / ".env.local")
load_dotenv(BACKEND_DIR / ".env")

PORT = int(os.environ.get("PORT") or 3001)

BASE_URL = (
    os.environ.get("BASE_URL")
    or os.environ.get("RENDER_EXTERNAL_URL")
    or f"http://localhost:{PORT}"
).rstrip("/")

DOWNLOADS_DIR = BACKEND_DIR / "downloads"
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

COOKIES_TMP = BACKEND_DIR / ".yt-dlp-cookies.txt"

# Ordered roughly by likelihood of working from a cloud/datacenter IP without a
# PO Token. See https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide
YT_PLAYER_CLIENTS: list[str] = [
    "default",
    "android_vr",
    "tv_simply",
    "web_embedded",
    "tv",
    "mweb",
    "android",
]


def _resolve_cookies_file() -> str | None:
    """Locate cookies for yt-dlp from, in order:

    * ``YTDLP_COOKIES_PATH`` / ``YT_DLP_COOKIES_PATH`` -> an existing file
    * ``YTDLP_COOKIES`` -> raw Netscape text or its base64 encoding
    * ``<backend>/cookies.txt`` -> a file placed next to the app
    """
    explicit = os.environ.get("YTDLP_COOKIES_PATH") or os.environ.get("YT_DLP_COOKIES_PATH")
    if explicit:
        if Path(explicit).exists():
            return explicit
        print(f"[yt-dlp] YTDLP_COOKIES_PATH set but file not found: {explicit}")

    inline = (os.environ.get("YTDLP_COOKIES") or "").strip()
    if inline:
        try:
            content = inline
            # If it doesn't look like Netscape cookie text, assume base64.
            if "\t" not in content and "# Netscape" not in content:
                try:
                    decoded = base64.b64decode(content).decode("utf-8", "replace")
                except Exception:
                    decoded = ""
                if "\t" in decoded or "# Netscape" in decoded:
                    content = decoded
            COOKIES_TMP.write_text(content, encoding="utf-8")
            print("[yt-dlp] Wrote cookies from YTDLP_COOKIES env var")
            return str(COOKIES_TMP)
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[yt-dlp] Failed to write cookies from env: {exc}")

    local = BACKEND_DIR / "cookies.txt"
    if local.exists():
        return str(local)

    return None


COOKIES_FILE = _resolve_cookies_file()
PROXY = os.environ.get("YTDLP_PROXY") or os.environ.get("YT_PROXY") or None

# "deno" (default) or "node". yt-dlp needs a JavaScript runtime to solve
# YouTube's player challenges; without one you get "The page needs to be
# reloaded". The pip `deno` package ships a matching binary into the venv.
JS_RUNTIMES = (os.environ.get("YTDLP_JS_RUNTIMES") or "deno").strip().lower()

# Make executables installed into the venv discoverable by yt-dlp / subprocesses.
_VENV_BIN = os.path.dirname(sys.executable)
if _VENV_BIN:
    _path_parts = os.environ.get("PATH", "").split(os.pathsep)
    if _VENV_BIN not in _path_parts:
        os.environ["PATH"] = _VENV_BIN + os.pathsep + os.environ.get("PATH", "")


def _find_executable(name: str) -> str | None:
    found = shutil.which(name)
    if found:
        return found
    candidate = os.path.join(_VENV_BIN, f"{name}.exe" if os.name == "nt" else name)
    return candidate if os.path.exists(candidate) else None


def _resolve_js_runtime() -> dict:
    if JS_RUNTIMES == "node":
        node = _find_executable("node")
        return {"node": ({"path": node} if node else {})}
    if JS_RUNTIMES in ("auto", "any", ""):
        return {}
    deno = _find_executable("deno")
    return {"deno": ({"path": deno} if deno else {})}


JS_RUNTIME_CONFIG = _resolve_js_runtime()

# Optional escape hatch: allow yt-dlp to fetch external JS components at runtime
# (e.g. if the bundled yt-dlp-ejs package is missing or outdated). Comma
# separated, e.g. "ejs:github" or "ejs:npm". Empty by default so the bundled
# scripts are used with no network dependency.
REMOTE_COMPONENTS = {
    part.strip()
    for part in (os.environ.get("YTDLP_REMOTE_COMPONENTS") or "").split(",")
    if part.strip()
}

# imageio-ffmpeg bundles a static ffmpeg binary, so Render needs no apt package.
FFMPEG_PATH: str | None = None
try:
    import imageio_ffmpeg

    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:  # pragma: no cover - optional dependency
    FFMPEG_PATH = None
