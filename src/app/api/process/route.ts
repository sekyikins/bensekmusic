import { NextRequest, NextResponse } from "next/server";
import ytDlp from "yt-dlp-exec";

export const dynamic = 'force-dynamic';

interface YtDlpFormat {
  url?: string;
  vcodec?: string;
  acodec?: string;
  height?: number | null;
  abr?: number | null;
}

interface YtDlpResult {
  id?: string;
  title?: string;
  uploader?: string;
  artist?: string;
  channel?: string;
  duration?: number;
  thumbnail?: string;
  webpage_url?: string;
  extractor?: string;
  formats?: YtDlpFormat[];
  entries?: YtDlpResult[];
}

interface VideoRenderer {
  videoId?: string;
  title?: {
    runs?: Array<{ text?: string }>;
    simpleText?: string;
  };
  longBylineText?: {
    runs?: Array<{ text?: string }>;
  };
  ownerText?: {
    runs?: Array<{ text?: string }>;
  };
  lengthText?: {
    simpleText?: string;
  };
}

interface SearchResult {
  videoId?: string;
  title?: string;
  author?: string;
  lengthSeconds?: number;
}

interface InvidiousVideo {
  videoId?: string;
  title?: string;
  author?: string;
  lengthSeconds?: number;
}

const INVIDIOUS_INSTANCES = [
  "https://inv.thepixora.com",
  "https://invidious.lunar.icu",
  "https://yewtu.be",
  "https://inv.nadeko.net"
];

function findVideoRenderers(obj: unknown, results: unknown[] = []): unknown[] {
  if (!obj || typeof obj !== "object") return results;

  const objAsRecord = obj as Record<string, unknown>;
  if (objAsRecord.videoRenderer) {
    results.push(objAsRecord.videoRenderer);
  } else {
    for (const key of Object.keys(objAsRecord)) {
      findVideoRenderers(objAsRecord[key], results);
    }
  }
  return results;
}

function parseVideoRenderer(renderer: unknown): SearchResult | null {
  try {
    if (!renderer || typeof renderer !== "object") return null;
    const r = renderer as VideoRenderer;
    const videoId = r.videoId;
    if (!videoId) return null;

    let title = "";
    if (r.title?.runs?.[0]?.text) {
      title = r.title.runs[0].text;
    } else if (r.title?.simpleText) {
      title = r.title.simpleText;
    }

    let author = "Unknown Artist";
    if (r.longBylineText?.runs?.[0]?.text) {
      author = r.longBylineText.runs[0].text;
    } else if (r.ownerText?.runs?.[0]?.text) {
      author = r.ownerText.runs[0].text;
    }

    let lengthSeconds = 0;
    const durationText = r.lengthText?.simpleText;
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
  } catch {
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

async function searchYouTubeNative(query: string): Promise<SearchResult[]> {
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
    .filter((v): v is SearchResult => v !== null);
  return videos;
}

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    let searchString = input.trim();
    let isUrl = /^https?:\/\//i.test(searchString) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(searchString);

    // --- Spotify: convert to search query via oEmbed ---
    if (isUrl && searchString.includes("spotify.com")) {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(searchString)}`;
        const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          searchString = `${data.title} ${data.author_name || ""}`.trim();
          isUrl = false; // treat as a search query from here on
        }
      } catch (e) {
        console.error("Spotify oEmbed fallback failed", e);
      }
    }

    if (isUrl) {
      // --- Step 1: Extract metadata + direct stream URL using yt-dlp ---
      let ytdlpResult: YtDlpResult | null = null;
      try {
        ytdlpResult = (await ytDlp(searchString, {
          dumpSingleJson: true,
          noCheckCertificate: true,
          noWarnings: true,
        })) as unknown as YtDlpResult;
      } catch (err) {
        console.error("yt-dlp URL extraction failed:", err);
        return NextResponse.json({ error: "Failed to extract media from this URL. It may be unsupported or private." }, { status: 400 });
      }

      if (!ytdlpResult) {
        return NextResponse.json({ error: "Could not retrieve media info from this URL." }, { status: 400 });
      }

      const duration = ytdlpResult.duration || 0;

      // --- Step 2: Fingerprint short/clip content via AudD to find the real song ---
      // If the content is short (i.e., likely a clip/reel/short), try to fingerprint it
      if (duration > 0 && duration <= 180) {
        try {
          // Get a direct audio stream URL from yt-dlp formats
          const formats = ytdlpResult.formats || [];
          const audioFormat = formats
            .filter((f) => f.vcodec === 'none' && f.acodec !== 'none' && f.url)
            .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0]
            || formats.find((f) => f.url);

          if (audioFormat?.url) {
            // Fetch a short audio sample (first ~200KB) for fingerprinting
            const sampleRes = await fetch(audioFormat.url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Range": "bytes=0-204799",
              },
              signal: AbortSignal.timeout(8000),
            });

            if (sampleRes.ok || sampleRes.status === 206) {
              const audioBuffer = await sampleRes.arrayBuffer();
              const blob = new Blob([audioBuffer], { type: "audio/mpeg" });

              const auddForm = new FormData();
              auddForm.append("file", blob, "sample.mp3");
              auddForm.append("api_token", "test");

              const auddRes = await fetch("https://api.audd.io/", {
                method: "POST",
                body: auddForm,
                signal: AbortSignal.timeout(10000),
              });

              if (auddRes.ok) {
                const auddData = await auddRes.json();
                if (auddData.status === "success" && auddData.result) {
                  const song = auddData.result;
                  // We identified the underlying song — now search for the full version
                  searchString = `${song.artist} ${song.title}`;
                  isUrl = false; // fall through to search pool
                }
              }
            }
          }
        } catch (fingerprintErr) {
          console.error("AudD fingerprint step failed (non-fatal):", fingerprintErr);
          // Non-fatal: fall through to direct extraction
        }
      }

      // If still a URL after fingerprinting (either too long, or fingerprinting didn't identify it)
      if (isUrl) {
        if (duration > 180) {
          return NextResponse.json({ error: "Content must be under 3 minutes long." }, { status: 400 });
        }

        const output = [{
          id: ytdlpResult.id || Math.random().toString(36).substring(7),
          title: ytdlpResult.title || "Unknown Title",
          artist: ytdlpResult.uploader || ytdlpResult.artist || ytdlpResult.channel || "Unknown Artist",
          duration: duration,
          thumbnail: ytdlpResult.thumbnail || undefined,
          url: ytdlpResult.webpage_url || searchString,
          extractor: ytdlpResult.extractor || "generic",
        }];
        return NextResponse.json(output);
      }

      // Fall through to the search pool below with the identified song name
    }

      try {
        const winner = await Promise.any<SearchResult[]>([
          // Try yt-dlp search with a 5-second timeout race
          (async () => {
            const ytdlpPromise = (async () => {
              const results = (await ytDlp(`ytsearch5:${searchString}`, {
                dumpSingleJson: true,
                noCheckCertificate: true,
                noWarnings: true,
                flatPlaylist: true,
              })) as unknown as YtDlpResult;
              if (results && Array.isArray(results.entries) && results.entries.length > 0) {
                return results.entries.map((entry) => ({
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
            const data = (await response.json()) as InvidiousVideo[];
            if (Array.isArray(data) && data.length > 0) {
              return data.map((video) => ({
                videoId: video.videoId,
                title: video.title,
                author: video.author || "Unknown Artist",
                lengthSeconds: video.lengthSeconds || 0,
              }));
            }
            throw new Error("Empty results");
          })
        ]);

        const output = winner.slice(0, 5).map((video) => ({
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Process error:", errorMessage);
    return NextResponse.json(
      { error: `Process error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
