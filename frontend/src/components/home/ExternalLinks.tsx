"use client";

import { ExternalLink } from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { getCleanSearchQuery } from "@/lib/format";

export default function ExternalLinks() {
  const { selectedResult } = useHome();

  if (!selectedResult) return null;

  const searchTerm = getCleanSearchQuery(selectedResult.title, selectedResult.artist);

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <a
        href={selectedResult.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#FF0000]/10 hover:bg-[#FF0000]/20 text-[#FF0000] px-5 py-2.5 rounded-full transition-colors font-medium border border-[#FF0000]/20 text-sm"
      >
        YouTube <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <a
        href={`https://open.spotify.com/search/${searchTerm}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] px-5 py-2.5 rounded-full transition-colors font-medium border border-[#1DB954]/20 text-sm"
      >
        Spotify <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <a
        href={`https://music.apple.com/search?term=${searchTerm}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#FA243C]/10 hover:bg-[#FA243C]/20 text-[#FA243C] px-5 py-2.5 rounded-full transition-colors font-medium border border-[#FA243C]/20 text-sm"
      >
        Apple Music <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
