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

// dotenv only reads .env by default; also load .env.local so local overrides apply.
dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

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

const YT_PLAYER_CLIENTS = ["android", "web", "default"];

async function runYtDlp(url, baseOptions) {
  let lastError;
  for (const client of YT_PLAYER_CLIENTS) {
    const options = { ...baseOptions };
    if (client !== "default") {
      options.extractorArgs = `youtube:player_client=${client}`;
    }
    try {
      return await ytDlp(url, options);
    } catch (err) {
      lastError = err;
      console.warn(
        `yt-dlp failed with player client "${client}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  throw lastError;
}

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
  return { status: "idle" };
}

// Start downloading a media file in the background (no-op if cached or already running).
function startDownload(url, mediaType) {
  const urlHash = hashFor(url, mediaType);

  const files = fs.readdirSync(DOWNLOADS_DIR);
  if (findCompletedFile(files, urlHash)) return; // already cached
  if (activeDownloads.has(urlHash)) return; // already in progress

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
  task.catch((err) => {
    console.error(`Download failed for ${urlHash}:`, err instanceof Error ? err.message : err);
  });
  task.finally(() => {
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
