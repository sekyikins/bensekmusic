import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import https from "node:https";
import http from "node:http";
import { fileURLToPath } from "url";
import ytDlp from "yt-dlp-exec";
import crypto from "crypto";

// Player-client chain that bypasses YouTube's bot check on datacenter IPs.
// `tv` and `ios` rarely trigger the check; `web` is the fallback for non-YT sources.
const YT_EXTRACTOR_ARGS = "youtube:player_client=tv,ios,web";
const YT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.MEDIA_SERVER_BASE_URL || `http://localhost:${PORT}`;

app.use(cors());

// Ensure downloads directory exists
const DOWNLOADS_DIR = path.join(__dirname, "downloads");
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Serve downloads folder as static files (handles Range requests automatically)
app.use("/downloads", express.static(DOWNLOADS_DIR, {
  acceptRanges: true,
  fallthrough: false
}));

// Map to track ongoing downloads to prevent duplicate parallel downloads
const activeDownloads = new Map();

// In-memory cache for extracted format URLs (avoids re-running yt-dlp on every range request)
const formatCache = new Map();
const FORMAT_CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours (YouTube CDN URLs last ~6 hours)

function getCachedFormatUrl(key) {
  const entry = formatCache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.url;
  formatCache.delete(key);
  return null;
}

function setCachedFormatUrl(key, url) {
  formatCache.set(key, { url, expiry: Date.now() + FORMAT_CACHE_TTL });
}

// Helper to find fully completed files matching the hash
function findCompletedFile(files, hash) {
  const completedClean = files.find((f) => {
    if (!f.startsWith(hash)) return false;
    if (f.endsWith(".part") || f.endsWith(".ytdl")) return false;
    const suffix = f.substring(hash.length);
    const dotCount = (suffix.match(/\./g) || []).length;
    return dotCount === 1;
  });

  if (completedClean) return completedClean;

  return files.find((f) => f.startsWith(hash) && !f.endsWith(".part") && !f.endsWith(".ytdl"));
}

// Streaming endpoint — extracts format URL via yt-dlp and proxies the stream.
// Used by the Next.js frontend for both playback (dl omitted) and downloads (dl=1).
// Format URLs are cached per video+type for 5 hours to avoid re-running yt-dlp on range requests.
app.get("/api/stream", async (req, res) => {
  const { url: targetUrl, type = "audio", filename: filenameParam, dl } = req.query;

  if (!targetUrl) {
    return res.status(400).json({ error: "Missing video URL" });
  }

  const cacheKey = `${targetUrl}:${type}`;

  try {
    let directUrl = getCachedFormatUrl(cacheKey);

    if (!directUrl) {
      const info = await ytDlp(targetUrl, {
        dumpSingleJson: true,
        noCheckCertificate: true,
        noWarnings: true,
        noPlaylist: true,
        extractorArgs: YT_EXTRACTOR_ARGS,
        userAgent: YT_UA,
      });

      if (!info || !Array.isArray(info.formats)) {
        throw new Error("Could not retrieve media format info.");
      }

      let format;
      if (type === "video") {
        const videoFormats = info.formats.filter(
          (f) => f.vcodec !== "none" && f.acodec !== "none" && f.url
        );
        if (videoFormats.length > 0) {
          format = videoFormats.reduce(
            (best, f) => (!best || (f.height || 0) > (best.height || 0) ? f : best),
            null
          );
        }
      } else {
        const audioFormats = info.formats.filter(
          (f) => f.vcodec === "none" && f.acodec !== "none" && f.url
        );
        if (audioFormats.length > 0) {
          format = audioFormats.reduce(
            (best, f) => (!best || (f.abr || 0) > (best.abr || 0) ? f : best),
            null
          );
        }
      }

      if (!format && info.formats.length > 0) {
        format = info.formats.find((f) => f.url);
      }

      directUrl = format?.url;
      if (!directUrl) throw new Error("Could not extract direct stream URL.");

      setCachedFormatUrl(cacheKey, directUrl);
    }

    const contentType = type === "video" ? "video/mp4" : "audio/mp4";
    const ext = type === "video" ? "mp4" : "m4a";
    const baseFilename = filenameParam || "sekmusic-dl";
    const encodedFilename = encodeURIComponent(`${baseFilename}.${ext}`);
    const dispositionType = dl === "1" ? "attachment" : "inline";

    const parsedUrl = new URL(directUrl);
    const requester = parsedUrl.protocol === "https:" ? https : http;
    const proxyReqHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    if (req.headers.range) proxyReqHeaders["range"] = req.headers.range;

    const proxyReq = requester.request(
      { hostname: parsedUrl.hostname, path: parsedUrl.pathname + parsedUrl.search, headers: proxyReqHeaders },
      (proxyRes) => {
        if (proxyRes.statusCode !== 200 && proxyRes.statusCode !== 206) {
          formatCache.delete(cacheKey);
          if (!res.headersSent) res.status(proxyRes.statusCode || 502).json({ error: `Upstream returned ${proxyRes.statusCode}` });
          proxyRes.resume();
          return;
        }

        res.status(proxyRes.statusCode);
        res.set("Content-Type", contentType);
        res.set("Content-Disposition", `${dispositionType}; filename*=UTF-8''${encodedFilename}`);
        res.set("Accept-Ranges", "bytes");
        res.set("Cache-Control", "no-cache");
        if (proxyRes.headers["content-length"]) res.set("Content-Length", proxyRes.headers["content-length"]);
        if (proxyRes.headers["content-range"]) res.set("Content-Range", proxyRes.headers["content-range"]);

        proxyRes.pipe(res);
        req.on("close", () => proxyReq.destroy());
      }
    );

    proxyReq.on("error", (err) => {
      console.error("Proxy request error:", err.message);
      if (!res.headersSent) res.status(502).json({ error: err.message });
    });

    proxyReq.end();
  } catch (err) {
    const msg = formatYtDlpError(err);
    console.error("Stream error:", msg);
    if (!res.headersSent) res.status(500).json({ error: msg });
  }
});

// yt-dlp-exec rejects with the child-process result; the real cause lives on
// .stderr, not .message. Surface both so Render logs show the actual failure.
function formatYtDlpError(err) {
  if (!err) return "unknown error";
  const parts = [];
  if (err.message) parts.push(err.message);
  if (err.stderr) parts.push(String(err.stderr).trim());
  if (err.shortMessage) parts.push(err.shortMessage);
  return parts.length ? parts.join(" | ") : String(err);
}

// Media check and download trigger endpoint (caches file to disk)
app.get("/api/download", async (req, res) => {
  try {
    const url = req.query.url;
    const type = req.query.type;

    if (!url) {
      return res.status(400).json({ error: "Missing video URL" });
    }

    const mediaType = type === "video" ? "video" : "audio";

    const urlHash = crypto.createHash("md5").update(url + mediaType).digest("hex");

    const files = fs.readdirSync(DOWNLOADS_DIR);
    const existingFile = findCompletedFile(files, urlHash);

    if (existingFile) {
      return res.json({
        url: `${BASE_URL}/downloads/${existingFile}`,
        status: "cached",
        filename: existingFile
      });
    }

    if (activeDownloads.has(urlHash)) {
      console.log(`Waiting for ongoing download of: ${urlHash}`);
      await activeDownloads.get(urlHash);

      const updatedFiles = fs.readdirSync(DOWNLOADS_DIR);
      const finishedFile = findCompletedFile(updatedFiles, urlHash);
      if (finishedFile) {
        return res.json({
          url: `${BASE_URL}/downloads/${finishedFile}`,
          status: "downloaded",
          filename: finishedFile
        });
      }
      throw new Error("Download completed but file could not be found.");
    }

    const outputTemplate = path.join(DOWNLOADS_DIR, `${urlHash}.%(ext)s`);

    const downloadPromise = (async () => {
      console.log(`Starting download for ${mediaType}: ${url}`);
      if (mediaType === "audio") {
        await ytDlp(url, {
          output: outputTemplate,
          format: "bestaudio/best",
          noCheckCertificate: true,
          noWarnings: true,
          noPlaylist: true,
          extractorArgs: YT_EXTRACTOR_ARGS,
          userAgent: YT_UA,
        });
      } else {
        await ytDlp(url, {
          output: outputTemplate,
          format: "best[height<=480][ext=mp4]/best[height<=720][ext=mp4]/best",
          noCheckCertificate: true,
          noWarnings: true,
          noPlaylist: true,
          extractorArgs: YT_EXTRACTOR_ARGS,
          userAgent: YT_UA,
        });
      }
      console.log(`Finished download for ${mediaType}: ${urlHash}`);
    })();

    activeDownloads.set(urlHash, downloadPromise);

    try {
      await downloadPromise;
    } finally {
      activeDownloads.delete(urlHash);
    }

    const updatedFiles = fs.readdirSync(DOWNLOADS_DIR);
    const downloadedFile = findCompletedFile(updatedFiles, urlHash);

    if (!downloadedFile) {
      throw new Error("File not found on disk after download completion.");
    }

    return res.json({
      url: `${BASE_URL}/downloads/${downloadedFile}`,
      status: "downloaded",
      filename: downloadedFile
    });

  } catch (err) {
    const msg = formatYtDlpError(err);
    console.error("Download endpoint error:", msg);
    return res.status(500).json({ error: msg });
  }
});

// Status check endpoint
app.get("/api/status", (req, res) => {
  const url = req.query.url;
  const type = req.query.type;
  if (!url) {
    return res.status(400).json({ error: "Missing video URL" });
  }
  const mediaType = type === "video" ? "video" : "audio";
  const urlHash = crypto.createHash("md5").update(url + mediaType).digest("hex");

  const files = fs.readdirSync(DOWNLOADS_DIR);
  const existingFile = findCompletedFile(files, urlHash);

  if (existingFile) {
    return res.json({ status: "ready", url: `${BASE_URL}/downloads/${existingFile}` });
  } else if (activeDownloads.has(urlHash)) {
    return res.json({ status: "downloading" });
  } else {
    return res.json({ status: "idle" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Periodic cleanup: delete files older than 2 hours
const CLEANUP_INTERVAL = 30 * 60 * 1000;
const MAX_FILE_AGE = 2 * 60 * 60 * 1000;

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
  console.log(`Media engine running on ${BASE_URL}`);
});
