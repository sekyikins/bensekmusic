"use client";

import { motion } from "framer-motion";
import { AudioLines } from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { itemVariants } from "@/lib/motion";

export default function Hero() {
  const { selectedResult, results } = useHome();
  const compact = Boolean(selectedResult || results);

  if (compact) {
    return (
      <div className="flex gap-2 items-center justify-center p-4">
        <motion.div
          className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/5 border border-white/10 shadow-[0_0_40px_-10px_rgba(236,72,153,0.3)] backdrop-blur-xl"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <AudioLines className="w-10 h-10 text-pink-400" />
        </motion.div>
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter">
          <span className="bg-clip-text text-transparent bg-linear-to-br from-white via-white to-gray-500 drop-shadow-sm">Sek</span>
          <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-400 via-pink-500 to-rose-500 drop-shadow-[0_0_30px_rgba(236,72,153,0.4)]">Music</span>
        </h1>
      </div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="text-center space-y-6 mb-12 w-full">
      <motion.div
        className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/5 border border-white/10 shadow-[0_0_40px_-10px_rgba(236,72,153,0.3)] backdrop-blur-xl mb-4"
        whileHover={{ scale: 1.05, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <AudioLines className="w-10 h-10 text-pink-400" />
      </motion.div>
      <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter">
        <span className="bg-clip-text text-transparent bg-linear-to-br from-white via-white to-gray-500 drop-shadow-sm">Sek</span>
        <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-400 via-pink-500 to-rose-500 drop-shadow-[0_0_30px_rgba(236,72,153,0.4)]">Music</span>
      </h1>
      <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
        Experience the ultimate audio extraction engine. Instantly process streams, analyze files, and retrieve master-quality metadata.
      </p>
    </motion.div>
  );
}
