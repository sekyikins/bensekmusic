"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useHome } from "@/context/HomeContext";
import { containerVariants } from "@/lib/motion";
import Hero from "./Hero";
import SearchBar from "./SearchBar";
import HistoryList from "./HistoryList";
import SearchResults from "./SearchResults";
import PlayerSection from "./PlayerSection";

export default function HomeContent() {
  const { error, results, selectedResult, loading } = useHome();

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center pt-24 pb-20 p-4 selection:bg-pink-500/30 relative">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-linear-to-b from-purple-900/20 to-transparent blur-3xl opacity-50" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-3xl flex flex-col items-center relative z-10"
      >
        <Hero />

        <SearchBar />

        <HistoryList />

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 w-full text-center font-medium shadow-lg backdrop-blur-sm"
            >
              {error}
            </motion.div>
          )}

          {results && !selectedResult && !loading && <SearchResults key="results" />}

          {selectedResult && !loading && <PlayerSection key="selected" />}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
