import { NextRequest, NextResponse } from "next/server";

function cleanString(str: string): string {
  if (!str) return "";
  
  let clean = str;
  
  // 1. Remove anything inside brackets/parentheses, e.g. [Official Video], (Remastered)
  clean = clean.replace(/[\(\[].*?[\)\]]/g, " ");
  
  // 2. Remove common video/audio suffix buzzwords
  const buzzwords = [
    /official\s+(music\s+)?video/gi,
    /official\s+audio/gi,
    /official\s+lyric\s+video/gi,
    /lyric\s+video/gi,
    /dance\s+performance\s+video/gi,
    /performance\s+video/gi,
    /live\s+performance/gi,
    /music\s+video/gi,
    /video\s+clip/gi,
    /official\s+visualizer/gi,
    /visualizer/gi,
    /audio\s+only/gi,
    /hq\s+audio/gi,
    /4k/gi,
    /hd/gi,
    /1080p/gi,
    /subtitle(s)?/gi,
    /sub(s)?/gi,
    /lyrics/gi,
    /-\s*Topic/gi,
    /\|\s*SekMusic/gi
  ];
  
  for (const regex of buzzwords) {
    clean = clean.replace(regex, " ");
  }
  
  // 3. Clean up smart quotes and special characters
  clean = clean.replace(/['"‘’“”]/g, "");
  
  // 4. Remove common separators and clean up spaces
  clean = clean.replace(/[-|•–—\/]/g, " ");
  clean = clean.replace(/\s+/g, " ").trim();
  
  return clean;
}

interface LrclibSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  duration: number;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

async function searchLrclib(query: string): Promise<LrclibSearchResult[]> {
  const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(lrclibUrl, {
      headers: {
        "User-Agent": "SekMusic/1.0 (https://github.com/sekyikins/bensekmusic)"
      }
    });

    if (!res.ok) {
      console.warn(`LRCLIB search warning: ${res.statusText} for query: ${query}`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`LRCLIB search error for query: ${query}`, err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const title = url.searchParams.get("title");
    const artist = url.searchParams.get("artist");
    const durationStr = url.searchParams.get("duration");
    const duration = durationStr ? parseFloat(durationStr) : null;

    if (!title || !artist) {
      return NextResponse.json({ error: "Missing title or artist parameter" }, { status: 400 });
    }

    const cleanTitle = cleanString(title);
    const cleanArtist = cleanString(artist);

    // Build the primary query
    let primaryQuery = cleanTitle;
    if (cleanArtist && !cleanTitle.toLowerCase().includes(cleanArtist.toLowerCase())) {
      primaryQuery = `${cleanTitle} ${cleanArtist}`;
    }

    console.log(`Lyrics search primary query: "${primaryQuery}" (Original: "${title}" by "${artist}")`);

    // Tier 1: Try with primary cleaned query
    let results = await searchLrclib(primaryQuery);

    // Tier 2: If no results and cleanTitle is different from primaryQuery, try just cleanTitle
    if (results.length === 0 && cleanTitle && cleanTitle !== primaryQuery) {
      console.log(`Lyrics search Tier 2 query: "${cleanTitle}"`);
      results = await searchLrclib(cleanTitle);
    }

    // Tier 3: Last resort, try original title + artist
    if (results.length === 0) {
      const fallbackQuery = `${title} ${artist}`.trim();
      console.log(`Lyrics search Tier 3 (fallback) query: "${fallbackQuery}"`);
      results = await searchLrclib(fallbackQuery);
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "No lyrics found" }, { status: 404 });
    }

    // Filter results to only those that actually have plain or synced lyrics
    const validResults = results.filter(item => item.plainLyrics || item.syncedLyrics);

    if (validResults.length === 0) {
      return NextResponse.json({ error: "No valid lyrics found in search results" }, { status: 404 });
    }

    // Find the record with the closest duration to the requested duration
    let bestMatch = validResults[0];
    if (duration !== null) {
      let minDiff = Infinity;
      for (const item of validResults) {
        const diff = Math.abs(item.duration - duration);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = item;
        }
      }
    }

    return NextResponse.json({
      id: bestMatch.id,
      trackName: bestMatch.trackName,
      artistName: bestMatch.artistName,
      albumName: bestMatch.albumName,
      duration: bestMatch.duration,
      lyrics: bestMatch.plainLyrics || null,
      syncedLyrics: bestMatch.syncedLyrics || null
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Lyrics API error:", errorMessage);
    return NextResponse.json({ error: `Lyrics fetch error: ${errorMessage}` }, { status: 500 });
  }
}
