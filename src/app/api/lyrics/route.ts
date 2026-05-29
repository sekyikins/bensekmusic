import { NextRequest, NextResponse } from "next/server";

interface LrcLibResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

/**
 * Clean title string by removing common YouTube suffixes,
 * parenthetical tags, and other noise so the lyrics search
 * has a better chance of matching.
 */
function cleanTitle(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\s*\(.*?\)\s*/g, " ")       // (Official Video), (Lyrics), etc.
    .replace(/\s*\[.*?\]\s*/g, " ")       // [Official Audio], [HD], etc.
    .replace(/\s*[-|].*?(official|lyric|audio|video|visualizer|full|hd|4k|remastered|version|prod|explicit).*$/gi, "")
    .replace(/\s*[-|]\s*Topic\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse synced LRC lyrics into plain text by stripping timestamps.
 * "[00:12.34] Some line" → "Some line"
 */
function parseSyncedLyrics(synced: string): string {
  return synced
    .split(/\r?\n/)
    .map((line) => line.replace(/^\[[\d:.]+\]\s*/, "").trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Robustly parses the raw title and artist from YouTube metadata
 * to separate the true track title and artist name.
 */
function parseTitleAndArtist(rawTitle: string, rawArtist: string) {
  let artist = cleanTitle(rawArtist);
  let title = cleanTitle(rawTitle);

  // Check if artist is missing/unknown/placeholder
  const isUnknownArtist = !artist || /unknown|various|topic|sekmusic/i.test(artist);

  if (title.includes("-")) {
    const parts = title.split("-");
    const part0 = parts[0].trim();
    const part1 = parts.slice(1).join("-").trim();

    if (isUnknownArtist) {
      artist = part0;
      title = part1;
    } else {
      const artistLower = artist.toLowerCase();
      if (part0.toLowerCase() === artistLower || artistLower.includes(part0.toLowerCase()) || part0.toLowerCase().includes(artistLower)) {
        title = part1;
      } else if (part1.toLowerCase() === artistLower || artistLower.includes(part1.toLowerCase()) || part1.toLowerCase().includes(artistLower)) {
        title = part0;
      }
    }
  } else if (title.includes("|")) {
    const parts = title.split("|");
    const part0 = parts[0].trim();
    const part1 = parts.slice(1).join("|").trim();

    if (isUnknownArtist) {
      artist = part0;
      title = part1;
    } else {
      const artistLower = artist.toLowerCase();
      if (part0.toLowerCase() === artistLower || artistLower.includes(part0.toLowerCase()) || part0.toLowerCase().includes(artistLower)) {
        title = part1;
      } else if (part1.toLowerCase() === artistLower || artistLower.includes(part1.toLowerCase()) || part1.toLowerCase().includes(artistLower)) {
        title = part0;
      }
    }
  }

  artist = cleanTitle(artist);
  title = cleanTitle(title);

  return { artist, title };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rawTitle = url.searchParams.get("title") || "";
    const rawArtist = url.searchParams.get("artist") || "";
    const durationParam = url.searchParams.get("duration");

    if (!rawTitle) {
      return NextResponse.json(
        { lyrics: "No track title provided." },
        { status: 400 }
      );
    }

    const { artist, title } = parseTitleAndArtist(rawTitle, rawArtist);
    const duration = durationParam ? parseInt(durationParam, 10) : undefined;

    // --- Strategy 1: Direct GET (exact match) ---
    if (artist && title) {
      // Strategy 1a: GET with duration if available
      if (duration) {
        try {
          const directParams = new URLSearchParams({
            track_name: title,
            artist_name: artist,
            duration: String(duration),
          });
          const directRes = await fetch(
            `https://lrclib.net/api/get?${directParams.toString()}`,
            {
              headers: { "User-Agent": "SekMusic/1.0 (https://sekmusic.com)" },
              signal: AbortSignal.timeout(5000),
            }
          );
          if (directRes.ok) {
            const data: LrcLibResult = await directRes.json();
            if (data.plainLyrics || data.syncedLyrics) {
              const lyrics = data.plainLyrics || parseSyncedLyrics(data.syncedLyrics!);
              return NextResponse.json({
                lyrics,
                syncedLyrics: data.syncedLyrics,
              });
            }
          }
        } catch {
          // Fall through
        }
      }

      // Strategy 1b: GET without duration
      try {
        const directParams = new URLSearchParams({
          track_name: title,
          artist_name: artist,
        });
        const directRes = await fetch(
          `https://lrclib.net/api/get?${directParams.toString()}`,
          {
            headers: { "User-Agent": "SekMusic/1.0 (https://sekmusic.com)" },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (directRes.ok) {
          const data: LrcLibResult = await directRes.json();
          if (data.plainLyrics || data.syncedLyrics) {
            const lyrics = data.plainLyrics || parseSyncedLyrics(data.syncedLyrics!);
            return NextResponse.json({
              lyrics,
              syncedLyrics: data.syncedLyrics,
            });
          }
        }
      } catch {
        // Fall through
      }
    }

    // --- Strategy 2: Search endpoint (fuzzy match fallback) ---
    const searchQuery = artist ? `${artist} ${title}` : title;
    const searchRes = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: { "User-Agent": "SekMusic/1.0 (https://sekmusic.com)" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!searchRes.ok) {
      const body = await searchRes.text().catch(() => "");
      return NextResponse.json({
        lyrics: `Could not retrieve lyrics.\nDebug: status=${searchRes.status}, title="${title}", artist="${artist}", query="${searchQuery}"\nBody: ${body.slice(0, 200)}`,
      });
    }

    const results: LrcLibResult[] = await searchRes.json();

    if (!results || results.length === 0) {
      return NextResponse.json({
        lyrics: "No lyrics found for this track.",
      });
    }

    // Pick the best result: prefer one with plainLyrics, then syncedLyrics
    const best =
      results.find((r) => r.plainLyrics) ||
      results.find((r) => r.syncedLyrics) ||
      results[0];

    const lyrics = best.plainLyrics || (best.syncedLyrics ? parseSyncedLyrics(best.syncedLyrics) : "No lyrics content.");

    return NextResponse.json({
      lyrics,
      syncedLyrics: best.syncedLyrics || null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("Lyrics error:", errorMessage);
    return NextResponse.json(
      { error: `Failed to fetch lyrics: ${errorMessage}` },
      { status: 500 }
    );
  }
}
