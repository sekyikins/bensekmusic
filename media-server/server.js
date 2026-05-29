import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ytDlp from "yt-dlp-exec";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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

// Media check and download trigger endpoint
app.get("/api/download", async (req, res) => {
  try {
    const url = req.query.url;
    const type = req.query.type;
    
    if (!url) {
      return res.status(400).json({ error: "Missing video URL" });
    }

    const mediaType = type === "video" ? "video" : "audio";
    
    // Hash the URL + media type to create a unique identifier
    const urlHash = crypto.createHash("md5").update(url + mediaType).digest("hex");

    // Check if the file is already downloaded (any extension matching the hash)
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const existingFile = findCompletedFile(files, urlHash);
    
    if (existingFile) {
      return res.json({
        url: `http://localhost:${PORT}/downloads/${existingFile}`,
        status: "cached",
        filename: existingFile
      });
    }

    // Check if this file is currently being downloaded by another request
    if (activeDownloads.has(urlHash)) {
      console.log(`Waiting for ongoing download of: ${urlHash}`);
      await activeDownloads.get(urlHash);
      
      const updatedFiles = fs.readdirSync(DOWNLOADS_DIR);
      const finishedFile = findCompletedFile(updatedFiles, urlHash);
      if (finishedFile) {
        return res.json({
          url: `http://localhost:${PORT}/downloads/${finishedFile}`,
          status: "downloaded",
          filename: finishedFile
        });
      }
      throw new Error("Download completed but file could not be found.");
    }

    // Start a new download and store the promise in the map
    const outputTemplate = path.join(DOWNLOADS_DIR, `${urlHash}.%(ext)s`);
    
    const downloadPromise = (async () => {
      console.log(`Starting download for ${mediaType}: ${url}`);
      if (mediaType === "audio") {
        await ytDlp(url, {
          output: outputTemplate,
          format: "bestaudio/best",
          noCheckCertificate: true,
          noWarnings: true,
        });
      } else {
        await ytDlp(url, {
          output: outputTemplate,
          format: "best[height<=480][ext=mp4]/best[height<=720][ext=mp4]/best",
          noCheckCertificate: true,
          noWarnings: true,
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

    // Find the downloaded file to return its actual extension/name
    const updatedFiles = fs.readdirSync(DOWNLOADS_DIR);
    const downloadedFile = findCompletedFile(updatedFiles, urlHash);
    
    if (!downloadedFile) {
      throw new Error("File not found on disk after download completion.");
    }

    return res.json({
      url: `http://localhost:${PORT}/downloads/${downloadedFile}`,
      status: "downloaded",
      filename: downloadedFile
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Download endpoint error:", msg);
    return res.status(500).json({ error: msg });
  }
});

// Endpoint to status check or trigger download asynchronously
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
    return res.json({ status: "ready", url: `http://localhost:${PORT}/downloads/${existingFile}` });
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
