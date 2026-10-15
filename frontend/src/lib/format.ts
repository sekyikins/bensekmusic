/** Format a duration in seconds as "mm:ss" (or "--:--" when unknown). */
export function formatDuration(seconds?: number | null): string {
  if (!seconds) return "--:--";
  return new Date(seconds * 1000).toISOString().substr(14, 5);
}

/** Build an encoded search term for external music services from a title/artist pair. */
export function getCleanSearchQuery(title: string, artist: string): string {
  const cleanArtist = artist
    .replace(/\s*(music|vevo|official|channel|records|productions)$/gi, "")
    .trim();

  let clean = title;
  clean = clean.replace(
    /[\(\[].*?(official|lyric|audio|video|visualizer|full|hd|4k|remastered|version|prod|explicit).*?[\)\]]/gi,
    ""
  );

  if (!clean.toLowerCase().includes(cleanArtist.toLowerCase())) {
    clean = `${cleanArtist} ${clean}`;
  }

  return encodeURIComponent(
    clean
      .replace(/\s*-\s*Topic/gi, "")
      .replace(/\s*\|\s*SekMusic/gi, "")
      .replace(/[-|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}
