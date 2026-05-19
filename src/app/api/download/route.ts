import { NextRequest, NextResponse } from "next/server";
import ytDlp from "yt-dlp-exec";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");
    const type = url.searchParams.get("type") || "audio";
    const filenameParam = url.searchParams.get("filename");
    const isDownload = url.searchParams.get("dl") === "1";
    
    if (!targetUrl) {
      return new NextResponse("Missing video URL", { status: 400 });
    }
    
    // Choose format: pre-merged mp4 for video, or m4a for audio
    const format = type === "video" ? "best[ext=mp4]/best" : "m4a/bestaudio/best";

    // 1. Get the direct streaming URL from yt-dlp
    const result = await ytDlp(targetUrl, {
      dumpSingleJson: true,
      format: format,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
    } as Record<string, unknown>);

    // Extract the exact streaming URL from the result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directUrl = (result as any).url || ((result as any).requested_downloads && (result as any).requested_downloads[0]?.url);

    if (!directUrl) {
      throw new Error("Could not extract direct stream URL.");
    }

    // 2. Proxy the request to the direct URL, forwarding Range headers
    const proxyHeaders = new Headers();
    const range = req.headers.get("range");
    if (range) {
      proxyHeaders.set("range", range);
    }
    
    // Some servers require a User-Agent
    proxyHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    const response = await fetch(directUrl, {
      headers: proxyHeaders,
      // We don't want to follow redirects if it breaks streaming, but typically fetch handles it fine.
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch media stream. Status: ${response.status}`);
    }

    // 3. Forward the response headers back to the client
    const resHeaders = new Headers();
    
    // Copy essential headers from the proxied response (like Content-Length, Content-Range, Accept-Ranges)
    ["content-length", "content-range", "accept-ranges", "content-type"].forEach(header => {
      if (response.headers.has(header)) {
        resHeaders.set(header, response.headers.get(header)!);
      }
    });

    const contentType = type === "video" ? "video/mp4" : "audio/mp4";
    const ext = type === "video" ? "mp4" : "m4a";

    // Override content-type to ensure browser treats it properly
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
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
