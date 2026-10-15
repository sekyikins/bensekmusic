"use client";

import { motion } from "framer-motion";
import { useHome } from "@/context/HomeContext";
import { containerVariants } from "@/lib/motion";
import TrackCard from "./TrackCard";

export default function SearchResults() {
  const { results, selectedResult, loading, selectSong } = useHome();

  if (!results || selectedResult || loading) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
      className="w-full space-y-4 relative z-10"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px bg-linear-to-r from-transparent to-surface-4 flex-1" />
        <h3 className="text-sm uppercase tracking-widest font-bold text-fg-muted">Search Results</h3>
        <div className="h-px bg-linear-to-l from-transparent to-surface-4 flex-1" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {results.map((res, index) => (
          <TrackCard key={res.id + index} track={res} onSelect={selectSong} size="lg" animate />
        ))}
      </div>
    </motion.div>
  );
}
