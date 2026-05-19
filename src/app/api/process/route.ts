import { NextRequest, NextResponse } from "next/server";

const INVIDIOUS_INSTANCES = [
  "https://inv.thepixora.com",
  "https://invidious.lunar.icu",
  "https://yewtu.be",
  "https://inv.nadeko.net"
];

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const searchString = input.trim();
    const isUrl = /^https?:\/\//i.test(searchString) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(searchString);

    if (isUrl) {
      let videoId = "";
      const ytMatch = searchString.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
      if (ytMatch) {
        videoId = ytMatch[1];
      }

      if (!videoId) {
        return NextResponse.json({ error: "Could not extract video ID from URL." }, { status: 400 });
      }

      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const res = await fetch(oembedUrl);
        if (!res.ok) throw new Error("Failed to fetch oEmbed metadata.");
        const data = await res.json();

        const output = [{
          id: videoId,
          title: data.title,
          artist: data.author_name || "Unknown Artist",
          duration: 0,
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          url: `https://youtube.com/watch?v=${videoId}`,
          extractor: "youtube",
        }];
        return NextResponse.json(output);
      } catch (err: unknown) {
        console.error("oEmbed extraction error:", err);
        return NextResponse.json({ error: "Failed to extract metadata from YouTube URL." }, { status: 400 });
      }
    } else {
      try {
        const winner = await Promise.any(
          INVIDIOUS_INSTANCES.map(async (baseUri) => {
            const searchUrl = `${baseUri}/api/v1/search?q=${encodeURIComponent(searchString)}&type=video`;
            const response = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              return data;
            }
            throw new Error("Empty results");
          })
        );

        const output = winner.slice(0, 5).map((video: any) => ({
          id: video.videoId,
          title: video.title,
          artist: video.author || "Unknown Artist",
          duration: video.lengthSeconds || 0,
          thumbnail: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
          url: `https://youtube.com/watch?v=${video.videoId}`,
          extractor: "youtube",
        }));

        return NextResponse.json(output);
      } catch (poolError) {
        console.error("Invidious search pool failed:", poolError);
        return NextResponse.json({ error: "Failed to fetch search results from resilient search pool. Please try again." }, { status: 500 });
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Process error:", errorMessage);
    return NextResponse.json(
      { error: `Process error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
