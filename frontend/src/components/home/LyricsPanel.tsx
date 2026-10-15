"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Clock, Copy, FileText, Loader2, Music } from "lucide-react";
import { useHome } from "@/context/HomeContext";

export default function LyricsPanel() {
  const {
    activeTab,
    lyricsContainerRef,
    lyricsLoading,
    lyrics,
    syncedLyrics,
    parsedLyrics,
    activeLineIndex,
    copyDropdownOpen,
    setCopyDropdownOpen,
    copiedState,
    copyLyrics,
    seekTo,
    activeLineRef,
    dropdownRef,
  } = useHome();

  return (
    <AnimatePresence>
      {activeTab === "lyrics" && (
        <motion.div
          key="lyrics-panel"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden mb-8"
        >
          <div
            ref={lyricsContainerRef}
            className="bg-black/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden max-h-100 flex flex-col gap-4"
          >
            {/* Copy toolbar */}
            {!lyricsLoading && (lyrics || syncedLyrics) && (
              <div className="flex items-center justify-end gap-2 mb-1 sticky top-0 z-25" ref={dropdownRef}>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCopyDropdownOpen(!copyDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer backdrop-blur-md shadow-sm"
                  >
                    {copiedState ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${copyDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {copyDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-black/90 border border-white/10 p-1.5 shadow-2xl backdrop-blur-md z-30"
                      >
                        {parsedLyrics && activeLineIndex >= 0 && activeLineIndex < parsedLyrics.length && (
                          <button
                            type="button"
                            onClick={() => {
                              copyLyrics("current");
                              setCopyDropdownOpen(false);
                            }}
                            className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Music className="w-3.5 h-3.5 text-pink-400" />
                              <span>Current Line</span>
                            </div>
                            {copiedState === "current" && <Check className="w-3 h-3 text-green-400" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            copyLyrics("plain");
                            setCopyDropdownOpen(false);
                          }}
                          className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-purple-400" />
                            <span>Plain Lyrics</span>
                          </div>
                          {copiedState === "plain" && <Check className="w-3 h-3 text-green-400" />}
                        </button>
                        {syncedLyrics && (
                          <button
                            type="button"
                            onClick={() => {
                              copyLyrics("timed");
                              setCopyDropdownOpen(false);
                            }}
                            className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-blue-400" />
                              <span>Timed Lyrics</span>
                            </div>
                            {copiedState === "timed" && <Check className="w-3 h-3 text-green-400" />}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {lyricsLoading ? (
              <div className="flex flex-col items-center gap-3 text-gray-400 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                <span className="text-sm font-medium">Finding lyrics...</span>
              </div>
            ) : parsedLyrics && parsedLyrics.length > 0 ? (
              <div className="flex flex-col gap-6 py-12">
                {parsedLyrics.map((line, idx) => {
                  const isActive = idx === activeLineIndex;
                  return (
                    <div
                      key={idx}
                      ref={isActive ? activeLineRef : null}
                      className={`text-center transition-all duration-500 py-1.5 cursor-pointer font-extrabold text-xl sm:text-3xl select-none px-4 ${
                        isActive
                          ? "text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-pink-400 to-rose-400 scale-105 drop-shadow-[0_0_15px_rgba(236,72,153,0.4)] opacity-100"
                          : "text-white/40 hover:text-white/80 opacity-80 hover:opacity-100 scale-95"
                      }`}
                      onClick={() => seekTo(line.time)}
                    >
                      {line.text}
                    </div>
                  );
                })}
              </div>
            ) : lyrics ? (
              <p className="text-gray-300 text-center leading-relaxed whitespace-pre-wrap font-medium text-base sm:text-lg py-4 px-2">
                {lyrics}
              </p>
            ) : (
              <div className="text-center text-gray-500 font-medium py-8">
                No lyrics found for this track.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
