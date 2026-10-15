"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { itemVariants } from "@/lib/motion";
import TrackCard from "./TrackCard";

export default function HistoryList() {
  const { history, clearHistory, selectSong, selectedResult, results } = useHome();

  if (selectedResult || results || history.length === 0) return null;

  return (
    <motion.div variants={itemVariants} className="w-full mt-10 space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <History className="w-4 h-4 text-pink-400" />
        <h3 className="text-sm uppercase tracking-widest font-bold text-gray-400">Recently Processed</h3>
        <div className="h-px bg-linear-to-r from-transparent to-white/10 flex-1" />
        <button
          type="button"
          onClick={clearHistory}
          className="text-xs text-gray-500 hover:text-pink-400 transition-colors cursor-pointer"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {history.map((track, idx) => (
          <TrackCard key={track.id + "-hist-" + idx} track={track} onSelect={selectSong} size="sm" />
        ))}
      </div>
    </motion.div>
  );
}
