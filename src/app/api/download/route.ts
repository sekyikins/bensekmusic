import { NextRequest, NextResponse } from "next/server";
import ytDlp from "yt-dlp-exec";

// Raised timeout for fallback (local dev without media server)
export const maxDuration = 30;

interface YtDlpFormat {
  url?: string;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  height?: number | null;
  abr?: number | null;
}

interface YtDlpInfo {
  formats?: YtDlpFormat[];
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");
  const type = url.searchParams.get("type") || "audio";
  const filenameParam = url.searchParams.get("filename");
  const isDownload = url.searchParams.get("dl") === "1";

  if (!targetUrl) {
    return new NextResponse("Missing video URL", { status: 400 });
  }

  // In production, delegate all yt-dlp work to the long-lived media server
  const mediaServerUrl = process.env.MEDIA_SERVER_URL;
  if (mediaServerUrl) {
    const streamParams = new URLSearchParams({ url: targetUrl, type });
    if (filenameParam) streamParams.set("filename", filenameParam);
    if (isDownload) streamParams.set("dl", "1");
    return NextResponse.redirect(`${mediaServerUrl}/api/stream?${streamParams}`, 302);
  }

  // Local dev fallback: run yt-dlp directly in Next.js
  try {
    const info = (await ytDlp(targetUrl, {
      dumpSingleJson: true,
      noCheckCertificate: true,
      noWarnings: true,
    })) as unknown as YtDlpInfo;

    if (!info || !Array.isArray(info.formats)) {
      throw new Error("Could not retrieve media format info.");
    }

    // Prefer browser-playable formats: AAC/m4a for audio (plays everywhere,
    // incl. Safari/iOS) over Opus/WebM, and mp4/H.264 for video. Otherwise the
    // browser rejects Opus bytes labeled audio/mp4 with NotSupportedError.
    let format: YtDlpFormat | undefined;
    if (type === "video") {
      const progressive = info.formats.filter((f) => f.vcodec !== 'none' && f.acodec !== 'none' && f.url);
      const mp4 = progressive.filter((f) => f.ext === 'mp4' || (f.vcodec || '').startsWith('avc1'));
      const pool = mp4.length > 0 ? mp4 : progressive;
      format = pool.reduce<YtDlpFormat | null>((best, f) => {
        if (!best) return f;
        return (f.height || 0) > (best.height || 0) ? f : best;
      }, null) || undefined;
    } else {
      const audioFormats = info.formats.filter((f) => f.vcodec === 'none' && f.acodec !== 'none' && f.url);
      const aac = audioFormats.filter((f) => f.ext === 'm4a' || (f.acodec || '').startsWith('mp4a'));
      const pool = aac.length > 0 ? aac : audioFormats;
      format = pool.reduce<YtDlpFormat | null>((best, f) => {
        if (!best) return f;
        return (f.abr || 0) > (best.abr || 0) ? f : best;
      }, null) || undefined;
    }

    if (!format && info.formats.length > 0) {
      format = info.formats.find((f) => f.url);
    }

    const directUrl = format?.url;
    if (!directUrl) {
      throw new Error("Could not extract direct stream URL.");
    }

    const isWebm = format?.ext === 'webm' || (format?.acodec || '').includes('opus') || (format?.vcodec || '').includes('vp');

    const proxyHeaders = new Headers();
    const range = req.headers.get("range");
    if (range) proxyHeaders.set("range", range);
    proxyHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    const response = await fetch(directUrl, {
      headers: proxyHeaders,
      signal: req.signal,
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch media stream. Status: ${response.status}`);
    }

    const resHeaders = new Headers();

    ["content-length", "content-range", "accept-ranges", "content-type"].forEach(header => {
      if (response.headers.has(header)) {
        resHeaders.set(header, response.headers.get(header)!);
      }
    });

    const contentType = type === "video"
      ? (isWebm ? "video/webm" : "video/mp4")
      : (isWebm ? "audio/webm" : "audio/mp4");
    const ext = type === "video" ? (isWebm ? "webm" : "mp4") : (isWebm ? "webm" : "m4a");

    resHeaders.set("Content-Type", contentType);

    const baseFilename = filenameParam || `sekmusic-dl`;
    const encodedFilename = encodeURIComponent(`${baseFilename}.${ext}`);
    const dispositionType = isDownload ? "attachment" : "inline";

    resHeaders.set("Content-Disposition", `${dispositionType}; filename*=UTF-8''${encodedFilename}`);

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Download error:", errorMessage);
    return new NextResponse(`Download error: ${errorMessage}`, { status: 500 });
  }
}
