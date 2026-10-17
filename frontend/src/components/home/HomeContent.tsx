"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useHome } from "@/context/HomeContext";
import { containerVariants } from "@/lib/motion";
import Hero from "./Hero";
import SearchBar from "./SearchBar";
import HistoryList from "./HistoryList";
import SearchResults from "./SearchResults";
import PlayerSection from "./PlayerSection";
import ErrorBanner from "./ErrorBanner";

export default function HomeContent() {
  const { error, results, selectedResult, loading } = useHome();

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center pt-24 pb-20 p-4 selection:bg-brand/30 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] ambient-bg blur-3xl opacity-50" />
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

        <AnimatePresence mode="wait">
          {error && <ErrorBanner key="error" message={error} />}

          {results && !selectedResult && !loading && <SearchResults key="results" />}

          {selectedResult && !loading && <PlayerSection key="selected" />}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
