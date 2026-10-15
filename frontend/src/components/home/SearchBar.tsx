"use client";

import { motion } from "framer-motion";
import { Link as LinkIcon, Loader2, Search, Sparkles, Upload } from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { itemVariants } from "@/lib/motion";

export default function SearchBar() {
  const {
    query,
    setQuery,
    loading,
    isFocused,
    setIsFocused,
    handleSearch,
    handlePasteLink,
    handleFileUpload,
    fileInputRef,
    selectedResult,
    results,
  } = useHome();

  const collapsed = Boolean(selectedResult || results);

  return (
    <motion.div
      variants={itemVariants}
      className={`w-full transition-all duration-700 ${collapsed ? "mb-10 scale-95 opacity-80 hover:opacity-100 hover:scale-100" : ""}`}
    >
      <form onSubmit={handleSearch} className="flex flex-col gap-5 w-full relative">
        <div
          className={`relative flex items-center w-full rounded-3xl transition-all duration-500
            ${isFocused ? "bg-black/60 shadow-[0_0_0_1px_rgba(236,72,153,0.5),0_10px_40px_-10px_rgba(236,72,153,0.2)]" : "bg-black/40 shadow-xl border border-white/10"}
            backdrop-blur-2xl p-2 sm:p-3 z-20 overflow-hidden
          `}
        >
          {/* Animated subtle gradient border effect internally */}
          {isFocused && (
            <div className="absolute inset-0 bg-linear-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 blur-xl z-0" />
          )}

          <div className="pl-4 pr-3 text-gray-400 relative z-10 transition-colors duration-300">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
            ) : (
              <Search className={`w-6 h-6 ${isFocused ? "text-pink-400" : ""}`} />
            )}
          </div>

          <input
            type="text"
            value={query}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste a URL, search a track, or drop an audio file..."
            className="flex-1 bg-transparent border-none outline-none py-3 text-lg text-white placeholder-gray-500 focus:ring-0 min-w-0 relative z-10 font-medium"
            disabled={loading}
          />

          <div className="hidden sm:flex items-center gap-2 pr-2 relative z-10">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handlePasteLink}
              className="flex items-center justify-center p-3 bg-white/5 cursor-pointer rounded-2xl transition-colors text-gray-300"
              title="Paste Link"
            >
              <LinkIcon className="w-5 h-5" />
            </motion.button>
            <input type="file" accept="audio/*,video/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center p-3 bg-white/5 cursor-pointer rounded-2xl transition-colors text-gray-300"
              title="Upload Audio"
            >
              <Upload className="w-5 h-5" />
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-white text-black px-6 sm:px-8 py-3 sm:py-4 ml-2 cursor-pointer rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center relative z-10 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
          >
            <span className="hidden sm:inline">{loading ? "Processing" : "Extract"}</span>
            <span className="sm:hidden"><Sparkles className="w-5 h-5" /></span>
          </motion.button>
        </div>

        {/* Mobile Actions */}
        <div className="flex sm:hidden items-center justify-center gap-3 w-full">
          <button type="button" onClick={handlePasteLink} className="flex-1 flex justify-center items-center gap-2 py-3 bg-white/5 rounded-2xl text-gray-300 border border-white/5 backdrop-blur-md font-medium text-sm">
            <LinkIcon className="w-4 h-4" /> Paste Link
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex justify-center items-center gap-2 py-3 bg-white/5 rounded-2xl text-gray-300 border border-white/5 backdrop-blur-md font-medium text-sm">
            <Upload className="w-4 h-4" /> Upload File
          </button>
        </div>
      </form>
    </motion.div>
  );
}
