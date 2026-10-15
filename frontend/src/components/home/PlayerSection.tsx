"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Music, Pause, Play, RefreshCw } from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { formatDuration } from "@/lib/format";
import AudioPlayer from "./AudioPlayer";
import VisualizerCanvas from "./VisualizerCanvas";
import LyricsPanel from "./LyricsPanel";
import VideoPlayer from "./VideoPlayer";
import DownloadButtons from "./DownloadButtons";
import ExternalLinks from "./ExternalLinks";

export default function PlayerSection() {
  const {
    selectedResult,
    selectSong,
    isPlaying,
    audioReady,
    videoReady,
    togglePlay,
    activeTab,
    setActiveTab,
    refreshLyrics,
    lyricsLoading,
  } = useHome();

  if (!selectedResult) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 30 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-full relative z-10"
    >
      {/* Immersive Player Card */}
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-line bg-panel">
        {/* Ambient blurred background */}
        {selectedResult.thumbnail && (
          <div
            className="absolute inset-0 z-0 opacity-30 mix-blend-screen pointer-events-none"
            style={{
              backgroundImage: `url(${selectedResult.thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(60px)",
            }}
          />
        )}

        <div className="relative z-10 p-6 sm:p-8 backdrop-blur-3xl bg-linear-to-b from-panel-soft to-panel-heavy">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            {/* Back button */}
            <button
              type="button"
              onClick={() => selectSong(null)}
              className="bg-surface-2 hover:bg-surface-4 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 backdrop-blur-md self-end sm:self-auto cursor-pointer"
            >
              Back
            </button>
          </div>

          {/* Always-visible player section */}
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            {/* Thumbnail & Show Lyrics Button */}
            <div className="flex flex-col gap-4">
              <div className="w-full md:w-56 h-56 rounded-3xl overflow-hidden bg-panel-2 shrink-0 shadow-2xl border border-line group relative flex items-center justify-center">
                {selectedResult.thumbnail ? (
                  <Image
                    src={selectedResult.thumbnail}
                    alt={selectedResult.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 224px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <Music className="w-16 h-16 text-fg-ghost" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-panel-heavy via-panel-soft to-transparent opacity-60" />
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!audioReady && !videoReady}
                  className="absolute bottom-4 right-4 bg-surface-4 hover:bg-surface-5 backdrop-blur-md p-3 rounded-full transition-transform hover:scale-110 active:scale-95 text-white shadow-lg z-20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "lyrics" ? "player" : "lyrics")}
                  className={`w-fit px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border backdrop-blur-md ${
                    activeTab === "lyrics"
                      ? "btn-primary border-line-strong shadow-md"
                      : "bg-surface border-line text-fg-muted hover:text-white hover:bg-surface-2"
                  }`}
                >
                  {activeTab === "lyrics" ? "Hide Lyrics" : "Show Lyrics"}
                </button>
                <button
                  type="button"
                  onClick={refreshLyrics}
                  disabled={lyricsLoading}
                  title="Refresh lyrics"
                  className="icon-button p-3 rounded-full text-fg-soft hover:text-white hover:bg-surface-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-md"
                >
                  <RefreshCw className={`w-4.5 h-4.5 ${lyricsLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Info & Audio Player */}
            <div className="flex-1 w-full min-w-0 flex flex-col justify-end py-2">
              <div className="mb-6">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 leading-tight">
                  {selectedResult.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-base font-medium">
                  <span className="text-brand-soft">{selectedResult.artist}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-surface-4" />
                  <span className="text-fg-muted">{formatDuration(selectedResult.duration)}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-surface-4" />
                  <span className="bg-surface-2 text-white/80 px-2.5 py-0.5 rounded-md text-xs tracking-wider uppercase">HQ Audio</span>
                </div>
              </div>

              <AudioPlayer />

              {/* Visualizer Canvas */}
              <VisualizerCanvas />
            </div>
          </div>

          {/* Lyrics Panel — slides open below player */}
          <LyricsPanel />

          {/* Video Player & Downloads — always visible */}
          <div className="space-y-6 pt-6 border-t border-line">
            {/* Video Player */}
            <VideoPlayer />

            <DownloadButtons />
          </div>
        </div>
      </div>

      {/* External Links */}
      <ExternalLinks />
    </motion.div>
  );
}
