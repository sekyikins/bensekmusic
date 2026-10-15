"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Music } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { itemVariants } from "@/lib/motion";

interface TrackCardProps {
  track: SearchResult;
  onSelect: (track: SearchResult) => void;
  size?: "sm" | "lg";
  animate?: boolean;
}

export default function TrackCard({ track, onSelect, size = "sm", animate = false }: TrackCardProps) {
  const isLarge = size === "lg";

  return (
    <motion.div
      variants={animate ? itemVariants : undefined}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(track)}
      className="group bg-white/5 border border-white/10 backdrop-blur-md p-3 rounded-3xl flex items-center gap-4 cursor-pointer transition-colors shadow-lg overflow-hidden relative"
    >
      <div className={`${isLarge ? "w-20 h-20 shadow-inner" : "w-16 h-16"} bg-black/50 rounded-2xl overflow-hidden shrink-0 relative`}>
        {track.thumbnail ? (
          <Image
            src={track.thumbnail}
            alt={track.title}
            fill
            sizes={isLarge ? "80px" : "64px"}
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <Music
            className={`${isLarge ? "w-6 h-6" : "w-5 h-5"} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-600`}
          />
        )}
        {isLarge && <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />}
      </div>

      <div className={`flex-1 min-w-0 pr-2 ${isLarge ? "py-1" : ""}`}>
        <h4 className={`text-white font-bold truncate mb-1 group-hover:text-pink-300 transition-colors ${isLarge ? "text-base" : "text-sm"}`}>
          {track.title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="truncate">{track.artist}</span>
          <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
          <span className={isLarge ? "shrink-0" : ""}>{formatDuration(track.duration)}</span>
        </div>
      </div>
    </motion.div>
  );
}
