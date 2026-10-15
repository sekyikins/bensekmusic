"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { hover, tap } from "@/lib/motion";

export default function DownloadButtons() {
  const { selectedResult, audioReady, videoReady } = useHome();

  if (!selectedResult) return null;

  const base = `${selectedResult.title} -by- ${selectedResult.artist} - SekMusic`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <motion.a
        whileHover={hover.grow}
        whileTap={tap.pressSoft}
        onClick={(e) => {
          if (!audioReady) e.preventDefault();
        }}
        href={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=audio&dl=1&filename=${encodeURIComponent(base)}`}
        download={`${base}.m4a`}
        className={`btn-primary py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_20px_var(--color-white-glow-soft)] hover:shadow-[0_0_30px_var(--color-white-glow)] transition-shadow ${audioReady ? "" : "pointer-events-none opacity-50"}`}
      >
        <Download className="w-5 h-5" /> Download Audio
      </motion.a>
      <motion.a
        whileHover={hover.grow}
        whileTap={tap.pressSoft}
        onClick={(e) => {
          if (!videoReady) e.preventDefault();
        }}
        href={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=video&dl=1&filename=${encodeURIComponent(base)}`}
        download={`${base}.mp4`}
        className={`bg-surface border border-line text-white hover:bg-surface-2 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 backdrop-blur-md transition-colors ${videoReady ? "" : "pointer-events-none opacity-50"}`}
      >
        <Download className="w-5 h-5" /> Download Video
      </motion.a>
    </div>
  );
}
