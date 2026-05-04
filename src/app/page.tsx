"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Link as LinkIcon, Upload, Music, Loader2, Play, Download, ExternalLink } from "lucide-react";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  const getCleanSearchQuery = (title: string, artist: string) => {
    // Remove "Music", "VEVO", "Official" from artist name to avoid redundant search terms
    const cleanArtist = artist.replace(/\s*(music|vevo|official|channel|records|productions)$/gi, '').trim();
    
    let clean = title;
    
    // Remove (Official Video), etc.
    clean = clean.replace(/[\(\[].*?(official|lyric|audio|video|visualizer|full|hd|4k|remastered|version|prod|explicit).*?[\)\]]/gi, '');
    
    // If title doesn't seem to contain the cleaned artist name, append it
    if (!clean.toLowerCase().includes(cleanArtist.toLowerCase())) {
      clean = `${cleanArtist} ${clean}`;
    }

    return encodeURIComponent(
      clean
        .replace(/\s*-\s*Topic/gi, '')
        .replace(/\s*\|\s*SekMusic/gi, '')
        .replace(/[-|]/g, ' ') // Replace dashes and bars with spaces
        .replace(/\s+/g, ' ')
        .trim()
    );
  };
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedResult(null);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: query, type: "text" }),
      });

      if (!res.ok) {
        throw new Error("Failed to process request.");
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (Array.isArray(data)) {
        setResults(data);
        if (data.length === 1) setSelectedResult(data[0]);
      } else {
        setSelectedResult(data);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedResult(null);
    setQuery(`Analyzing ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // 1. Recognize the audio
      const recRes = await fetch("/api/recognize", {
        method: "POST",
        body: formData,
      });
      if (!recRes.ok) throw new Error("Failed to recognize media format.");
      const recData = await recRes.json();
      
      const identifiedQuery = recData.identifiedQuery;
      setQuery(identifiedQuery);

      // 2. Fetch the metadata using the identified query
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: identifiedQuery, type: "text" }),
      });

      if (!res.ok) throw new Error("Failed to process identified song data.");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (Array.isArray(data)) {
        setResults(data);
        if (data.length === 1) setSelectedResult(data[0]);
      } else {
        setSelectedResult(data);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setQuery("");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl flex flex-col items-center text-center space-y-6 mb-12"
      >
        <div className="inline-flex items-center justify-center p-3 glass-panel rounded-full mb-4 animate-float">
          <Music className="w-8 h-8 text-pink-500" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          <span className="gradient-text">SekMusic</span> Platform
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl">
          The ultimate media processing system. Drop a link, type a song name, or upload media to extract high-quality audio and video.
        </p>
      </motion.div>

      {/* Input Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-2xl px-4 sm:px-0"
      >
        <div className="w-full relative z-10">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            {/* Search Input Bar */}
            <div className="flex items-center w-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 focus-within:border-primary/50 focus-within:bg-black/60 transition-all p-2 shadow-2xl">
              <div className="pl-4 pr-3 text-gray-400">
                <Search className="w-6 h-6" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a song, artist, or paste a URL..."
                style={{ color: "white" }}
                className="flex-1 bg-transparent border-none outline-none py-3 sm:py-4 text-lg placeholder-gray-500 focus:ring-0 min-w-0"
                disabled={loading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-around w-full mt-2">
              <div className="flex items-center gap-3">
                <button type="button" className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 cursor-pointer rounded-xl transition-colors text-gray-400 hover:text-white border border-white/5 backdrop-blur-sm">
                  <LinkIcon className="w-5 h-5" /> 
                  <span className="hidden sm:inline font-medium">Link</span>
                </button>
                <input 
                  type="file" 
                  accept="audio/*,video/*" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 cursor-pointer rounded-xl transition-colors text-gray-400 hover:text-white border border-white/5 backdrop-blur-sm"
                >
                  <Upload className="w-5 h-5" /> 
                  <span className="hidden sm:inline font-medium">Upload</span>
                </button>
              </div>
              
              <button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="bg-white text-black px-8 py-3.5 cursor-pointer rounded-xl font-bold hover:bg-gray-200 transition-all disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Extract"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Results Section */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mt-8 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-200 w-full max-w-2xl text-center"
          >
            {error}
          </motion.div>
        )}

        {results && !selectedResult && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl mt-12 space-y-4 relative z-10"
          >
            <h3 className="text-xl font-bold text-white mb-4">Search Results</h3>
            {results.map((res: any, index: number) => (
              <div 
                key={res.id + index}
                onClick={() => setSelectedResult(res)}
                className="glass-panel p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors shadow-lg"
              >
                <div className="w-24 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0 relative">
                  {res.thumbnail ? (
                    <img src={res.thumbnail} alt={res.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-bold line-clamp-1">{res.title}</h4>
                  <p className="text-sm text-gray-400 line-clamp-1">
                    {res.artist} • {res.duration ? new Date(res.duration * 1000).toISOString().substr(14, 5) : "Unknown duration"}
                  </p>
                </div>
                <button className="px-4 py-2 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition-colors">
                  Select
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {selectedResult && !loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl mt-12 glass-panel rounded-3xl overflow-hidden shadow-2xl relative z-10"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Media Details</h3>
                <button 
                  onClick={() => setSelectedResult(null)}
                  className="bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors"
                >
                  Back to results
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 bg-black/40 p-5 rounded-2xl border border-white/10 shadow-xl">
                {/* Thumbnail */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden bg-black flex-shrink-0 shadow-2xl border border-white/10 group relative">
                  {selectedResult.thumbnail ? (
                    <img src={selectedResult.thumbnail} alt={selectedResult.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Music className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Info & Audio Player */}
                <div className="flex-1 w-full min-w-0 flex flex-col justify-center">
                  <div className="mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 line-clamp-1 group-hover:text-pink-400 transition-colors">
                      {selectedResult.title}
                    </h2>
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="font-medium text-pink-500/80">{selectedResult.artist}</span>
                      <span>•</span>
                      <span>{selectedResult.duration ? new Date(selectedResult.duration * 1000).toISOString().substr(14, 5) : "Unknown"}</span>
                    </div>
                  </div>
                  
                  <div className="bg-black/40 rounded-xl p-2 border border-white/10 backdrop-blur-sm">
                    <audio 
                      controls 
                      preload="none"
                      className="w-full outline-none h-10" 
                      src={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=audio&filename=${encodeURIComponent(`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic`)}`}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Video Player */}
                <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/10">
                  <p className="text-sm text-gray-400 mb-2 font-medium px-1">Video Stream</p>
                  <video 
                    controls 
                    preload="none"
                    poster={selectedResult.thumbnail}
                    className="w-full rounded-xl aspect-video bg-black outline-none" 
                    src={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=video&filename=${encodeURIComponent(`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic`)}`}
                  >
                    Your browser does not support the video element.
                  </video>
                </div>

                <div className="flex flex-row gap-4">
                  <a 
                    href={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=audio&dl=1&filename=${encodeURIComponent(`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic`)}`}
                    download={`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic.m4a`}
                    className="flex-1 bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all hover:scale-[1.01] active:scale-95 shadow-lg"
                  >
                    <Download className="w-5 h-5" /> Download Audio
                  </a>
                  <a 
                    href={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=video&dl=1&filename=${encodeURIComponent(`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic`)}`}
                    download={`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic.mp4`}
                    className="flex-1 bg-pink-600/20 text-pink-500 border py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-pink-600/30 transition-all hover:scale-[1.01] active:scale-95 shadow-lg"
                  >
                    <Download className="w-5 h-5" /> Download Video
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                <div className="col-span-2 sm:col-span-4 text-sm text-gray-400 font-medium mb-1">Open in External Apps</div>
                <a href={selectedResult.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#FF0000]/20 text-[#FF0000] hover:bg-[#FF0000]/30 py-3 rounded-xl transition-colors font-medium border border-[#FF0000]/20">
                  YouTube <ExternalLink className="w-4 h-4" />
                </a>
                <a href={`https://open.spotify.com/search/${getCleanSearchQuery(selectedResult.title, selectedResult.artist)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30 py-3 rounded-xl transition-colors font-medium border border-[#1DB954]/20">
                  Spotify <ExternalLink className="w-4 h-4" />
                </a>
                <a href={`https://music.apple.com/search?term=${getCleanSearchQuery(selectedResult.title, selectedResult.artist)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#FA243C]/20 text-[#FA243C] hover:bg-[#FA243C]/30 py-3 rounded-xl transition-colors font-medium border border-[#FA243C]/20">
                  Apple <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
