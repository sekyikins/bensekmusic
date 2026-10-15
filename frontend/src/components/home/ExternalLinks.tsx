"use client";

import { ExternalLink } from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { getCleanSearchQuery } from "@/lib/format";

const PLATFORMS = [
  {
    name: "YouTube",
    href: (url: string) => url,
    className: "bg-youtube/10 hover:bg-youtube/20 text-youtube border-youtube/20",
  },
  {
    name: "Spotify",
    href: (url: string, term: string) => `https://open.spotify.com/search/${term}`,
    className: "bg-spotify/10 hover:bg-spotify/20 text-spotify border-spotify/20",
  },
  {
    name: "Apple Music",
    href: (_url: string, term: string) => `https://music.apple.com/search?term=${term}`,
    className: "bg-apple/10 hover:bg-apple/20 text-apple border-apple/20",
  },
] as const;

export default function ExternalLinks() {
  const { selectedResult } = useHome();

  if (!selectedResult) return null;

  const searchTerm = getCleanSearchQuery(selectedResult.title, selectedResult.artist);

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      {PLATFORMS.map((platform) => (
        <a
          key={platform.name}
          href={platform.href(selectedResult.url, searchTerm)}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-colors font-medium border text-sm ${platform.className}`}
        >
          {platform.name} <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ))}
    </div>
  );
}
