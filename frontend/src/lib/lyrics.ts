export interface ParsedLyricLine {
  time: number;
  text: string;
}

/**
 * Parse an LRC-formatted (timestamped) lyrics string into an ordered list of
 * time/text lines. Returns null when there are no timestamps to parse.
 */
export function parseSyncedLyrics(syncedLyrics: string | null): ParsedLyricLine[] | null {
  if (!syncedLyrics) return null;

  const lines = syncedLyrics.split("\n");
  const result: ParsedLyricLine[] = [];
  const timeReg = /^\[(\d+):(\d+)(?:\.(\d+))?\](.*)/;

  for (const line of lines) {
    const match = timeReg.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, "0").substring(0, 3), 10) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();
      // Skip metadata lines or empty lines
      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/** Return the index of the lyric line active at the given playback time. */
export function findActiveLineIndex(lines: ParsedLyricLine[] | null, currentTime: number): number {
  if (!lines) return -1;
  let index = -1;
  for (let i = 0; i < lines.length; i++) {
    if (currentTime >= lines[i].time) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}
