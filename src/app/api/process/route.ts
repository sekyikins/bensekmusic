import { NextRequest, NextResponse } from "next/server";

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
      const ddgUrl = `https://html.duckduckgo.com/html/?q=site:youtube.com+${encodeURIComponent(searchString)}`;
      const res = await fetch(ddgUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch search results from DuckDuckGo (Status ${res.status}).`);
      }

      const html = await res.text();
      const matches = [...html.matchAll(/watch\?v=([a-zA-Z0-9_-]{11})/g)].map(m => m[1]);
      const uniqueVideoIds = [...new Set(matches)].slice(0, 5);

      if (uniqueVideoIds.length === 0) {
        return NextResponse.json({ error: "No results found" }, { status: 404 });
      }

      const output = await Promise.all(uniqueVideoIds.map(async (videoId) => {
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
          const oembedRes = await fetch(oembedUrl);
          if (!oembedRes.ok) throw new Error();
          const oembedData = await oembedRes.json();
          return {
            id: videoId,
            title: oembedData.title,
            artist: oembedData.author_name || "Unknown Artist",
            duration: 0,
            thumbnail: oembedData.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            url: `https://youtube.com/watch?v=${videoId}`,
            extractor: "youtube",
          };
        } catch {
          return {
            id: videoId,
            title: "YouTube Video",
            artist: "Unknown Artist",
            duration: 0,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            url: `https://youtube.com/watch?v=${videoId}`,
            extractor: "youtube",
          };
        }
      }));

      return NextResponse.json(output);
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
