import { NextRequest, NextResponse } from "next/server";
import ytDlp from "yt-dlp-exec";

export async function POST(req: NextRequest) {
  try {
    const { input, type } = await req.json();

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    let searchString = input.trim();
    // If it's a text search without a URL, format it for yt search
    const isUrl = /^https?:\/\//i.test(searchString) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(searchString);
    if (type === "text" && !isUrl) {
      searchString = `ytsearch5:${searchString}`;
    }

    // Use yt-dlp to extract metadata
    const result: any = await ytDlp(searchString, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      playlistEnd: 5,
    } as any);

    // If it's a search, yt-dlp returns an entries array. Sometimes it returns multiple lines of JSON,
    // so ytDlp-exec handles it. If it's a playlist or search, `result` might be an array or have `.entries`.
    let entries = [];
    if (Array.isArray(result)) {
      entries = result;
    } else if (result && result.entries) {
      entries = result.entries;
    } else if (result && result.id) {
      entries = [result];
    }

    const validEntries = entries.filter((entry: any) => entry && entry.id && entry.title);

    if (validEntries.length === 0) {
      return NextResponse.json({ error: "No results found" }, { status: 404 });
    }

    const output = validEntries.map((videoData: any) => ({
      id: videoData.id,
      title: videoData.title,
      artist: videoData.uploader || videoData.artist || "Unknown Artist",
      duration: videoData.duration,
      thumbnail: videoData.thumbnail || (videoData.thumbnails && videoData.thumbnails[0]?.url) || null,
      url: videoData.webpage_url || videoData.original_url || `https://www.youtube.com/watch?v=${videoData.id}`,
      extractor: videoData.extractor,
    }));

    return NextResponse.json(output);
  } catch (error: any) {
    console.error("Process error:", error);
    return NextResponse.json(
      { error: "Failed to process request. Ensure yt-dlp is available or try again later." },
      { status: 500 }
    );
  }
}
