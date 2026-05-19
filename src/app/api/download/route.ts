import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

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

    // 1. Get the streaming formats from ytdl
    const info = await ytdl.getInfo(targetUrl);
    
    let format;
    if (type === "video") {
      // Find the highest resolution mp4 format that has both video and audio
      format = ytdl.chooseFormat(info.formats, {
        filter: "audioandvideo",
        quality: "highestvideo",
      });
    } else {
      // Find highest quality audio only format
      format = ytdl.chooseFormat(info.formats, {
        filter: "audioonly",
        quality: "highestaudio",
      });
    }

    const directUrl = format?.url;

    if (!directUrl) {
      throw new Error("Could not extract direct stream URL.");
    }

    // 2. Proxy the request to the direct URL, forwarding Range headers
    const proxyHeaders = new Headers();
    const range = req.headers.get("range");
    if (range) {
      proxyHeaders.set("range", range);
    }
    
    proxyHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    const response = await fetch(directUrl, {
      headers: proxyHeaders,
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch media stream. Status: ${response.status}`);
    }

    // 3. Forward the response headers back to the client
    const resHeaders = new Headers();
    
    ["content-length", "content-range", "accept-ranges", "content-type"].forEach(header => {
      if (response.headers.has(header)) {
        resHeaders.set(header, response.headers.get(header)!);
      }
    });

    const contentType = type === "video" ? "video/mp4" : "audio/mp4";
    const ext = type === "video" ? "mp4" : "m4a";

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
