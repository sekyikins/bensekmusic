import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error - yt-search does not provide TypeScript declaration files
import ytSearch from "yt-search";
import ytdl from "@distube/ytdl-core";

interface VideoSearchResult {
  videoId: string;
  title: string;
  author: {
    name: string;
  };
  seconds: number;
  thumbnail: string;
  image?: string;
  url: string;
}

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const searchString = input.trim();
    const isUrl = /^https?:\/\//i.test(searchString) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(searchString);

    if (isUrl) {
      try {
        const info = await ytdl.getBasicInfo(searchString);
        const videoDetails = info.videoDetails;
        
        const output = [{
          id: videoDetails.videoId,
          title: videoDetails.title,
          artist: videoDetails.author.name || "Unknown Artist",
          duration: parseInt(videoDetails.lengthSeconds) || 0,
          thumbnail: videoDetails.thumbnails?.[0]?.url || null,
          url: videoDetails.video_url || searchString,
          extractor: "youtube",
        }];
        return NextResponse.json(output);
      } catch (ytdlError) {
        console.error("Ytdl-core extraction error:", ytdlError);
        return NextResponse.json({ error: "Failed to extract metadata from URL." }, { status: 400 });
      }
    } else {
      const searchResult = await ytSearch(searchString);
      const videos = searchResult.videos.slice(0, 5);

      if (videos.length === 0) {
        return NextResponse.json({ error: "No results found" }, { status: 404 });
      }

      const output = videos.map((video: VideoSearchResult) => ({
        id: video.videoId,
        title: video.title,
        artist: video.author.name || "Unknown Artist",
        duration: video.seconds,
        thumbnail: video.thumbnail || video.image || null,
        url: video.url,
        extractor: "youtube",
      }));

      return NextResponse.json(output);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Process error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to process search. Please try again." },
      { status: 500 }
    );
  }
}
