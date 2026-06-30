import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Base URL for media server from environment variables
const MEDIA_SERVER_URL = process.env.NEXT_PUBLIC_MEDIA_SERVER_URL || "http://localhost:3001";

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

    // First request to media server to get download URL
    const mediaServerRes = await fetch(`${MEDIA_SERVER_URL}/api/download?url=${encodeURIComponent(targetUrl)}&type=${type}`);

    if (!mediaServerRes.ok) {
      const errData = await mediaServerRes.json().catch(() => ({ error: "Media server error" }));
      return NextResponse.json(
        errData,
        { status: mediaServerRes.status }
      );
    }

    const data = await mediaServerRes.json();
    // Now, proxy or redirect to the media server's download URL
    if (data.url) {
      // Build the media file URL
      const mediaFileUrl = data.url;
      const ext = type === "video" ? "mp4" : "m4a";
      const baseFilename = filenameParam || `sekmusic-dl`;
      const encodedFilename = encodeURIComponent(`${baseFilename}.${ext}`);
      const dispositionType = isDownload ? "attachment" : "inline";

      // Now proxy the request from the media server's static file
      const range = req.headers.get("range");
      const proxyHeaders = new Headers();
      if (range) {
        proxyHeaders.set("range", range);
      }
      
      proxyHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

      const mediaFileRes = await fetch(mediaFileUrl, {
        headers: proxyHeaders,
        signal: req.signal,
      });

      if (!mediaFileRes.ok && mediaFileRes.status !== 206) {
        throw new Error(`Failed to fetch media file. Status: ${mediaFileRes.status}`);
      }

      // Forward all relevant headers
      const resHeaders = new Headers();
      
      ["content-length", "content-range", "accept-ranges", "content-type"].forEach(header => {
        if (mediaFileRes.headers.has(header)) {
          resHeaders.set(header, mediaFileRes.headers.get(header)!);
        }
      });
      
      // Override content disposition for download/inline
      resHeaders.set("Content-Disposition", `${dispositionType}; filename*=UTF-8''${encodedFilename}`);

      return new NextResponse(mediaFileRes.body, {
        status: mediaFileRes.status,
        statusText: mediaFileRes.statusText,
        headers: resHeaders,
      });
    } else {
      throw new Error("Media server did not return a valid file URL");
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Download error:", errorMessage);
    return new NextResponse(`Download error: ${errorMessage}`, { status: 500 });
  }
}
