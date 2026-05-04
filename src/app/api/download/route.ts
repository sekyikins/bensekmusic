import { NextRequest, NextResponse } from "next/server";
import ytDlp from "yt-dlp-exec";
import { Readable } from "stream";

// This is a simple proxy to stream audio back directly from yt-dlp
// In a full production app, you might download to a temp file and serve it
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

    // Note: Streaming directly from ytDlp in Node.js
    // @ts-ignore - type definitions are missing the exec property which is available at runtime
    const ytDlpProcess = ytDlp.exec(targetUrl, {
      format: format,
      output: "-", // Output to stdout
      quiet: true,
      noWarnings: true,
    });

    if (!ytDlpProcess.stdout) {
      throw new Error("Failed to get stdout from yt-dlp");
    }

    // Note: we can cast it to any to bypass TS complaining about Next.js response body types
    // Next.js allows returning Node.js streams or Web Streams in the NextResponse
    
    // We convert the Node.js stream to a Web Stream for Next.js App Router compatibility
    const webStream = new ReadableStream({
      start(controller) {
        ytDlpProcess.stdout!.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        ytDlpProcess.stdout!.on("end", () => controller.close());
        ytDlpProcess.stdout!.on("error", (err: Error) => controller.error(err));
      },
      cancel() {
        ytDlpProcess.kill();
      }
    });

    const contentType = type === "video" ? "video/mp4" : "audio/mp4";
    const ext = type === "video" ? "mp4" : "m4a";

    const baseFilename = filenameParam || `sekmusic-dl`;
    // Securely encode filename for HTTP header (RFC 5987)
    const encodedFilename = encodeURIComponent(`${baseFilename}.${ext}`);
    const dispositionType = isDownload ? "attachment" : "inline";

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${dispositionType}; filename*=UTF-8''${encodedFilename}`,
      },
    });

  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
