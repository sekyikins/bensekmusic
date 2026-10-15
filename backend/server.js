import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ytDlp from "yt-dlp-exec";
import crypto from "crypto";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

// Never let a stray async error take the whole media engine offline.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason instanceof Error ? reason.stack : reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err instanceof Error ? err.stack : err);
});

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL =
  process.env.BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

const DOWNLOADS_DIR = path.join(__dirname, "downloads");
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}
app.use("/downloads", express.static(DOWNLOADS_DIR, {
  acceptRanges: true,
  fallthrough: false
}));

const activeDownloads = new Map();
// Remembers the last failure per media hash so /api/status can surface a real
// error to the client instead of letting it poll until it times out.
const failedDownloads = new Map();

// Ordered roughly by likelihood of working from a cloud/datacenter IP without
// a PO Token or cookies. See https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide
const YT_PLAYER_CLIENTS = [
  "default",
  "android_vr",
  "tv_simply",
  "web_embedded",
  "tv",
  "mweb",
  "android",
];

// ---------------------------------------------------------------------------
// Optional auth for yt-dlp. YouTube blocks many datacenter/cloud IPs with
// "Sign in to confirm you're not a bot". Provide cookies via ANY of:
//   * YTDLP_COOKIES      -> raw Netscape cookie text OR its base64 encoding
//   * YTDLP_COOKIES_PATH -> absolute path to a cookies.txt file
//   * backend/cookies.txt -> a file placed next to server.js
// Optionally route yt-dlp through a proxy with YTDLP_PROXY.
// ---------------------------------------------------------------------------
const COOKIES_TMP = path.join(__dirname, ".yt-dlp-cookies.txt");

function resolveCookiesFile() {
  const explicit = process.env.YTDLP_COOKIES_PATH || process.env.YT_DLP_COOKIES_PATH;
  if (explicit) {
    if (fs.existsSync(explicit)) return explicit;
    console.warn(`[yt-dlp] YTDLP_COOKIES_PATH set but file not found: ${explicit}`);
  }

  const inline = process.env.YTDLP_COOKIES;
  if (inline && inline.trim()) {
    try {
      let content = inline.trim();
      // If it doesn't look like Netscape cookie text, try base64-decoding it.
      if (!content.includes("\t") && !content.includes("# Netscape")) {
        const decoded = Buffer.from(content, "base64").toString("utf8");
        if (decoded.includes("\t") || decoded.includes("# Netscape")) content = decoded;
      }
      fs.writeFileSync(COOKIES_TMP, content, "utf8");
      console.log("[yt-dlp] Wrote cookies from YTDLP_COOKIES env var");
      return COOKIES_TMP;
    } catch (err) {
      console.error("[yt-dlp] Failed to write cookies from env:", err);
    }
  }

  const local = path.join(__dirname, "cookies.txt");
  if (fs.existsSync(local)) return local;

  return null;
}

const RESOLVED_COOKIES = resolveCookiesFile();
const YTDLP_PROXY = process.env.YTDLP_PROXY || process.env.YT_PROXY || null;

if (RESOLVED_COOKIES) console.log(`[yt-dlp] Using cookies file: ${RESOLVED_COOKIES}`);
if (YTDLP_PROXY) console.log(`[yt-dlp] Using proxy: ${YTDLP_PROXY}`);

// Turn a raw execa/yt-dlp error into a short, user-facing message.
function friendlyYtDlpError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  const match = raw.match(/ERROR:\s*([\s\S]*?)(?:\n\s*\[|$)/);
  const line = match && match[1] ? match[1].replace(/\[youtube\]\s*/g, "").trim() : raw;
  if (/not a bot|sign in to confirm/i.test(line)) {
    return "YouTube blocked this server's IP with a bot check. Set YTDLP_COOKIES on the server to authenticate.";
  }
  if (/video unavailable|private video|removed/i.test(line)) {
    return "This video is unavailable, private, or removed.";
  }
  return line;
}

async function runYtDlp(url, baseOptions) {
  let lastError;
  for (const client of YT_PLAYER_CLIENTS) {
    const options = { ...baseOptions };
    if (client !== "default") {
      options.extractorArgs = `youtube:player_client=${client}`;
    }
    if (RESOLVED_COOKIES) options.cookies = RESOLVED_COOKIES;
    if (YTDLP_PROXY) options.proxy = YTDLP_PROXY;
    try {
      return await ytDlp(url, options);
    } catch (err) {
      lastError = err;
      console.warn(
        `yt-dlp failed with player client "${client}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  throw new Error(friendlyYtDlpError(lastError));
}

const INVIDIOUS_INSTANCES = [
  "https://inv.thepixora.com",
  "https://invidious.lunar.icu",
  "https://yewtu.be",
  "https://inv.nadeko.net"
];

function findVideoRenderers(obj, results = []) {
  if (!obj || typeof obj !== "object") return results;
  if (obj.videoRenderer) {
    results.push(obj.videoRenderer);
  } else {
    for (const key of Object.keys(obj)) {
      findVideoRenderers(obj[key], results);
    }
  }
  return results;
}

function parseVideoRenderer(renderer) {
  try {
    if (!renderer || typeof renderer !== "object") return null;
    const videoId = renderer.videoId;
    if (!videoId) return null;

    let title = "";
    if (renderer.title?.runs?.[0]?.text) title = renderer.title.runs[0].text;
    else if (renderer.title?.simpleText) title = renderer.title.simpleText;

    let author = "Unknown Artist";
    if (renderer.longBylineText?.runs?.[0]?.text) author = renderer.longBylineText.runs[0].text;
    else if (renderer.ownerText?.runs?.[0]?.text) author = renderer.ownerText.runs[0].text;

    let lengthSeconds = 0;
    const durationText = renderer.lengthText?.simpleText;
    if (durationText) {
      const parts = durationText.split(":").map(Number);
      if (parts.length === 2) lengthSeconds = parts[0] * 60 + parts[1];
      else if (parts.length === 3) lengthSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return { videoId, title, author, lengthSeconds };
  } catch {
    return null;
  }
}

function extractJSON(html) {
  let startIdx = html.indexOf("ytInitialData =");
  if (startIdx === -1) startIdx = html.indexOf("ytInitialData");

  if (startIdx !== -1) {
    const jsonStart = html.indexOf("{", startIdx);
    if (jsonStart !== -1) {
      let braceCount = 0;
      let inString = false;
      let escape = false;
      for (let i = jsonStart; i < html.length; i++) {
        const char = html[i];
        if (escape) { escape = false; continue; }
        if (char === "\\") { escape = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (!inString) {
          if (char === "{") braceCount++;
          else if (char === "}") {
            braceCount--;
            if (braceCount === 0) return html.substring(jsonStart, i + 1);
          }
        }
      }
    }
  }
  throw new Error("Could not extract ytInitialData JSON");
}

async function searchYouTubeNative(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en&gl=US`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) throw new Error(`YouTube returned status ${response.status}`);

  const html = await response.text();
  const jsonStr = extractJSON(html);
  const data = JSON.parse(jsonStr);
  const renderers = findVideoRenderers(data);
  return renderers.map(parseVideoRenderer).filter((v) => v !== null);
}

// Resolve a pasted URL or run a resilient web search for a query.
app.post("/api/process", async (req, res) => {
  try {
    const input = req.body?.input;
    if (!input) return res.status(400).json({ error: "Input is required" });

    let searchString = String(input).trim();
    let isUrl =
      /^https?:\/\//i.test(searchString) ||
      /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(searchString);

    // --- Spotify: convert to a search query via oEmbed ---
    if (isUrl && searchString.includes("spotify.com")) {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(searchString)}`;
        const r = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          const d = await r.json();
          searchString = `${d.title} ${d.author_name || ""}`.trim();
          isUrl = false;
        }
      } catch (e) {
        console.error("Spotify oEmbed fallback failed", e);
      }
    }

    if (isUrl) {
      // --- Step 1: Extract metadata using yt-dlp ---
      let ytdlpResult = null;
      try {
        ytdlpResult = await runYtDlp(searchString, {
          dumpSingleJson: true,
          noCheckCertificate: true,
          noWarnings: true,
        });
      } catch (err) {
        console.error("yt-dlp URL extraction failed:", err);
        return res.status(400).json({
          error: "Failed to extract media from this URL. It may be unsupported or private."
        });
      }

      if (!ytdlpResult) {
        return res.status(400).json({ error: "Could not retrieve media info from this URL." });
      }

      const duration = ytdlpResult.duration || 0;

      // --- Step 2: Fingerprint short/clip content via AudD to find the real song ---
      if (duration > 0 && duration <= 180) {
        try {
          const formats = ytdlpResult.formats || [];
          const audioFormat = formats
            .filter((f) => f.vcodec === "none" && f.acodec !== "none" && f.url)
            .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0] || formats.find((f) => f.url);

          if (audioFormat?.url) {
            const sampleRes = await fetch(audioFormat.url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Range": "bytes=0-204799",
              },
              signal: AbortSignal.timeout(8000),
            });

            if (sampleRes.ok || sampleRes.status === 206) {
              const audioBuffer = await sampleRes.arrayBuffer();
              const blob = new Blob([audioBuffer], { type: "audio/mpeg" });

              const auddForm = new FormData();
              auddForm.append("file", blob, "sample.mp3");
              auddForm.append("api_token", "test");

              const auddRes = await fetch("https://api.audd.io/", {
                method: "POST",
                body: auddForm,
                signal: AbortSignal.timeout(10000),
              });

              if (auddRes.ok) {
                const auddData = await auddRes.json();
                if (auddData.status === "success" && auddData.result) {
                  const song = auddData.result;
                  searchString = `${song.artist} ${song.title}`;
                  isUrl = false;
                }
              }
            }
          }
        } catch (fingerprintErr) {
          console.error("AudD fingerprint step failed (non-fatal):", fingerprintErr);
        }
      }

      if (isUrl) {
        if (duration > 180) {
          return res.status(400).json({ error: "Content must be under 3 minutes long." });
        }

        return res.json([{
          id: ytdlpResult.id || Math.random().toString(36).substring(7),
          title: ytdlpResult.title || "Unknown Title",
          artist: ytdlpResult.uploader || ytdlpResult.artist || ytdlpResult.channel || "Unknown Artist",
          duration,
          thumbnail: ytdlpResult.thumbnail || undefined,
          url: ytdlpResult.webpage_url || searchString,
          extractor: ytdlpResult.extractor || "generic",
        }]);
      }
    }

    // --- Resilient search pool ---
    try {
      const winner = await Promise.any([
        (async () => {
          const ytdlpPromise = (async () => {
            const results = await runYtDlp(`ytsearch5:${searchString}`, {
              dumpSingleJson: true,
              noCheckCertificate: true,
              noWarnings: true,
              flatPlaylist: true,
            });
            if (results && Array.isArray(results.entries) && results.entries.length > 0) {
              return results.entries.map((entry) => ({
                videoId: entry.id,
                title: entry.title,
                author: entry.uploader || "Unknown Artist",
                lengthSeconds: entry.duration || 0,
              }));
            }
            throw new Error("yt-dlp search empty");
          })();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("yt-dlp search timeout")), 5000)
          );
          const r = await Promise.race([ytdlpPromise, timeoutPromise]);
          if (r && r.length > 0) return r;
          throw new Error("yt-dlp search empty");
        })(),
        (async () => {
          const ytsPromise = searchYouTubeNative(searchString);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("native search timeout")), 4000)
          );
          const r = await Promise.race([ytsPromise, timeoutPromise]);
          if (r && r.length > 0) return r;
          throw new Error("native search empty");
        })(),
        ...INVIDIOUS_INSTANCES.map(async (baseUri) => {
          const searchUrl = `${baseUri}/api/v1/search?q=${encodeURIComponent(searchString)}&type=video`;
          const response = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
          if (!response.ok) throw new Error(`Status ${response.status}`);
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            return data.map((video) => ({
              videoId: video.videoId,
              title: video.title,
              author: video.author || "Unknown Artist",
              lengthSeconds: video.lengthSeconds || 0,
            }));
          }
          throw new Error("Empty results");
        })
      ]);

      const output = winner.slice(0, 5).map((video) => ({
        id: video.videoId,
        title: video.title,
        artist: video.author || "Unknown Artist",
        duration: video.lengthSeconds || 0,
        thumbnail: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        url: `https://youtube.com/watch?v=${video.videoId}`,
        extractor: "youtube",
      }));

      return res.json(output);
    } catch (poolError) {
      console.error("Resilient search pool failed:", poolError);
      return res.status(500).json({
        error: "Failed to fetch search results from resilient search pool. Please try again."
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Process error:", errorMessage);
    return res.status(500).json({ error: `Process error: ${errorMessage}` });
  }
});

const urlLocks = new Map();

async function acquireUrlLock(url) {
  while (urlLocks.has(url)) {
    await urlLocks.get(url).catch(() => {});
  }
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  urlLocks.set(url, gate);
  return () => {
    urlLocks.delete(url);
    release();
  };
}

// Helper to find fully completed files matching the hash (ignoring .part, .ytdl, and split download components)
function findCompletedFile(files, hash) {
  // First, look for a completed file that matches the hash, has only one dot (clean extension like hash.mp4, hash.webm), and is not a part/temp file
  const completedClean = files.find((f) => {
    if (!f.startsWith(hash)) return false;
    if (f.endsWith(".part") || f.endsWith(".ytdl")) return false;
    const suffix = f.substring(hash.length);
    const dotCount = (suffix.match(/\./g) || []).length;
    return dotCount === 1;
  });

  if (completedClean) return completedClean;

  // Fallback to any completed file matching the hash that is not a part/temp file
  return files.find((f) => f.startsWith(hash) && !f.endsWith(".part") && !f.endsWith(".ytdl"));
}

function hashFor(url, mediaType) {
  return crypto.createHash("md5").update(url + mediaType).digest("hex");
}

// Report the current status of a media file without starting any work.
function mediaInfo(url, mediaType) {
  const urlHash = hashFor(url, mediaType);
  const files = fs.readdirSync(DOWNLOADS_DIR);
  const existingFile = findCompletedFile(files, urlHash);

  if (existingFile) {
    return {
      status: "ready",
      url: `${BASE_URL}/downloads/${existingFile}`,
      filename: existingFile
    };
  }
  if (activeDownloads.has(urlHash)) {
    return { status: "downloading" };
  }
  if (failedDownloads.has(urlHash)) {
    return { status: "error", error: failedDownloads.get(urlHash) };
  }
  return { status: "idle" };
}

// Start downloading a media file in the background (no-op if cached or already running).
function startDownload(url, mediaType) {
  const urlHash = hashFor(url, mediaType);

  const files = fs.readdirSync(DOWNLOADS_DIR);
  if (findCompletedFile(files, urlHash)) return; // already cached
  if (activeDownloads.has(urlHash)) return; // already in progress
  failedDownloads.delete(urlHash); // clear previous failure so this is a fresh attempt

  const outputTemplate = path.join(DOWNLOADS_DIR, `${urlHash}.%(ext)s`);

  const task = (async () => {
    console.log(`Starting download for ${mediaType}: ${url}`);
    // Serialize per-URL so audio + video downloads don't hit YouTube together.
    const release = await acquireUrlLock(url);
    try {
      if (mediaType === "audio") {
        await runYtDlp(url, {
          output: outputTemplate,
          format: "bestaudio/best",
          noCheckCertificate: true,
          noWarnings: true,
        });
      } else {
        await runYtDlp(url, {
          output: outputTemplate,
          format: "best[height<=480][ext=mp4]/best[height<=720][ext=mp4]/best",
          noCheckCertificate: true,
          noWarnings: true,
        });
      }
      console.log(`Finished download for ${mediaType}: ${urlHash}`);
    } finally {
      release();
    }
  })();

  activeDownloads.set(urlHash, task);
  task
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Download failed for ${urlHash}:`, message);
      failedDownloads.set(urlHash, message);
    })
    .finally(() => {
      // Chained onto the *handled* promise: a failed download must never
      // surface an unhandled rejection (that would crash the whole server).
      activeDownloads.delete(urlHash);
    });
}

// Kick off a download and immediately report status (does NOT block until finished).
app.get("/api/download", (req, res) => {
  const url = req.query.url;
  const type = req.query.type;

  if (!url) {
    return res.status(400).json({ error: "Missing video URL" });
  }

  const mediaType = type === "video" ? "video" : "audio";
  startDownload(String(url), mediaType);
  return res.json(mediaInfo(String(url), mediaType));
});

// Read-only status check (never starts a download).
app.get("/api/status", (req, res) => {
  const url = req.query.url;
  const type = req.query.type;
  if (!url) {
    return res.status(400).json({ error: "Missing video URL" });
  }
  const mediaType = type === "video" ? "video" : "audio";
  return res.json(mediaInfo(String(url), mediaType));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Periodic cleanup: delete files older than 2 hours to manage space
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MAX_FILE_AGE = 2 * 60 * 60 * 1000; // 2 hours

setInterval(() => {
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(DOWNLOADS_DIR, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > MAX_FILE_AGE) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old cached file: ${file}`);
      }
    });
  } catch (err) {
    console.error("Cleanup job error:", err);
  }
}, CLEANUP_INTERVAL);

app.listen(PORT, () => {
  console.log(`Media engine running on http://localhost:${PORT}`);
});
