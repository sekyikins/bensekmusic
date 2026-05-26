import { NextRequest, NextResponse } from "next/server";
import ytDlp from "yt-dlp-exec";

const INVIDIOUS_INSTANCES = [
  "https://inv.thepixora.com",
  "https://invidious.lunar.icu",
  "https://yewtu.be",
  "https://inv.nadeko.net"
];

function findVideoRenderers(obj: any, results: any[] = []): any[] {
  if (!obj || typeof obj !== "object") return results;

  if (obj.videoRenderer) {
    results.push(obj.videoRenderer);
  } else {
    for (const key of Object.keys(obj)) {
      findVideoRenderers(obj[key], results);
    }
  }
  return results;
}

function parseVideoRenderer(renderer: any) {
  try {
    const videoId = renderer.videoId;
    if (!videoId) return null;

    let title = "";
    if (renderer.title?.runs?.[0]?.text) {
      title = renderer.title.runs[0].text;
    } else if (renderer.title?.simpleText) {
      title = renderer.title.simpleText;
    }

    let author = "Unknown Artist";
    if (renderer.longBylineText?.runs?.[0]?.text) {
      author = renderer.longBylineText.runs[0].text;
    } else if (renderer.ownerText?.runs?.[0]?.text) {
      author = renderer.ownerText.runs[0].text;
    }

    let lengthSeconds = 0;
    const durationText = renderer.lengthText?.simpleText;
    if (durationText) {
      const parts = durationText.split(":").map(Number);
      if (parts.length === 2) {
        lengthSeconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        lengthSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }

    return {
      videoId,
      title,
      author,
      lengthSeconds,
    };
  } catch (e) {
    return null;
  }
}

function extractJSON(html: string): string {
  let startIdx = html.indexOf('ytInitialData =');
  if (startIdx === -1) {
    startIdx = html.indexOf('ytInitialData');
  }

  if (startIdx !== -1) {
    const jsonStart = html.indexOf('{', startIdx);
    if (jsonStart !== -1) {
      let braceCount = 0;
      let inString = false;
      let escape = false;
      for (let i = jsonStart; i < html.length; i++) {
        const char = html[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              return html.substring(jsonStart, i + 1);
            }
          }
        }
      }
    }
  }
  throw new Error("Could not extract ytInitialData JSON");
}

async function searchYouTubeNative(query: string) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en&gl=US`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube returned status ${response.status}`);
  }

  const html = await response.text();
  const jsonStr = extractJSON(html);
  const data = JSON.parse(jsonStr);
  const renderers = findVideoRenderers(data);
  const videos = renderers
    .map(parseVideoRenderer)
    .filter((v): v is NonNullable<typeof v> => v !== null);
  return videos;
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
        const winner = await Promise.any([
          // Try yt-dlp search with a 5-second timeout race
          (async () => {
            const ytdlpPromise = (async () => {
              const results: any = await ytDlp(`ytsearch5:${searchString}`, {
                dumpSingleJson: true,
                noCheckCertificate: true,
                noWarnings: true,
                flatPlaylist: true,
              });
              if (results && Array.isArray(results.entries) && results.entries.length > 0) {
                return results.entries.map((entry: any) => ({
                  videoId: entry.id,
                  title: entry.title,
                  author: entry.uploader || "Unknown Artist",
                  lengthSeconds: entry.duration || 0,
                }));
              }
              throw new Error("yt-dlp search empty");
            })();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("yt-dlp search timeout")), 5000)
            );
            const r = await Promise.race([ytdlpPromise, timeoutPromise]);
            if (r && r.length > 0) {
              return r;
            }
            throw new Error("yt-dlp search empty");
          })(),
          // Try native YouTube search parser with a 4-second timeout race
          (async () => {
            const ytsPromise = searchYouTubeNative(searchString);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("native search timeout")), 4000)
            );
            const r = await Promise.race([ytsPromise, timeoutPromise]);
            if (r && r.length > 0) {
              return r;
            }
            throw new Error("native search empty");
          })(),
          // Try Invidious instances
          ...INVIDIOUS_INSTANCES.map(async (baseUri) => {
            const searchUrl = `${baseUri}/api/v1/search?q=${encodeURIComponent(searchString)}&type=video`;
            const response = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              return data.map((video: any) => ({
                videoId: video.videoId,
                title: video.title,
                author: video.author || "Unknown Artist",
                lengthSeconds: video.lengthSeconds || 0,
              }));
            }
            throw new Error("Empty results");
          })
        ]);

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
        console.error("Resilient search pool failed:", poolError);
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
