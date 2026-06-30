"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Search, Link as LinkIcon, Upload, Music, Loader2, Play, Pause, Download, ExternalLink, Sparkles, AudioLines, History, RefreshCw, Copy, Check, Clock, ChevronDown, FileText } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string | undefined;
  url: string;
  extractor: string;
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastActiveMediaRef = useRef<"audio" | "video">("audio");

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Volume and player settings states
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sekmusic_volume");
      return saved ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sekmusic_muted") === "true";
    }
    return false;
  });

  // History and lyrics states
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"player" | "lyrics">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sekmusic_active_tab");
      return (saved === "player" || saved === "lyrics") ? saved : "player";
    }
    return "player";
  });

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem("sekmusic_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => {
          setHistory(parsed);
        }, 0);
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
  }, []);

  // Clean up visualizer animation on unmount or track change
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [selectedResult]);

  // Sync volume and muted state to media elements
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [selectedResult, volume, muted]);

  // Sync activeTab to localStorage
  useEffect(() => {
    localStorage.setItem("sekmusic_active_tab", activeTab);
  }, [activeTab]);

  // Fetch lyrics when selectedResult changes
  useEffect(() => {
    if (!selectedResult) return;

    const loadLyrics = async () => {
      setLyricsLoading(true);
      try {
        const title = selectedResult.title;
        const artist = selectedResult.artist;
        const duration = selectedResult.duration;

        const res = await fetch(
          `/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&duration=${duration}`
        );
        if (!res.ok) throw new Error("Lyrics not found");

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setLyrics(data.lyrics);
        setSyncedLyrics(data.syncedLyrics);
      } catch (err) {
        console.error("Error loading lyrics:", err);
        setLyrics(null);
        setSyncedLyrics(null);
      } finally {
        setLyricsLoading(false);
      }
    };

    loadLyrics();
  }, [selectedResult]);

  // Copy state: null | "current" | "timed" | "plain"
  const [copiedState, setCopiedState] = useState<null | "current" | "timed" | "plain">(null);

  // Click outside handler for copy dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCopyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const refreshLyrics = async () => {
    if (!selectedResult || lyricsLoading) return;
    setLyrics(null);
    setSyncedLyrics(null);
    setLyricsLoading(true);
    try {
      const res = await fetch(
        `/api/lyrics?title=${encodeURIComponent(selectedResult.title)}&artist=${encodeURIComponent(selectedResult.artist)}&duration=${selectedResult.duration}`
      );
      if (!res.ok) throw new Error("Lyrics not found");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLyrics(data.lyrics);
      setSyncedLyrics(data.syncedLyrics);
    } catch (err) {
      console.error("Error refreshing lyrics:", err);
      setLyrics(null);
      setSyncedLyrics(null);
    } finally {
      setLyricsLoading(false);
    }
  };

  const copyLyrics = (type: "current" | "timed" | "plain") => {
    let text = "";
    if (type === "current") {
      if (parsedLyrics && activeLineIndex >= 0 && activeLineIndex < parsedLyrics.length) {
        text = parsedLyrics[activeLineIndex].text;
      }
    } else if (type === "timed" && syncedLyrics) {
      text = syncedLyrics;
    } else if (type === "plain") {
      if (lyrics) {
        text = lyrics;
      } else if (parsedLyrics) {
        text = parsedLyrics.map((l) => l.text).join("\n");
      }
    }
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedState(type);
      setTimeout(() => setCopiedState(null), 2000);
    });
  };

  const draw = (analyser: AnalyserNode, canvas: HTMLCanvasElement) => {

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.8;
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, "#a855f7"); // purple
        gradient.addColorStop(1, "#ec4899"); // pink

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };

    renderFrame();
  };

  const initVisualizer = () => {
    if (!canvasRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      // Create context if it doesn't exist yet
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const audioCtx = audioContextRef.current;
      if (!analyserRef.current) {
        analyserRef.current = audioCtx.createAnalyser();
        analyserRef.current.fftSize = 64;
      }
      const analyser = analyserRef.current;

      // Connect audio element if present and not yet connected
      if (audioRef.current && !sourceRef.current) {
        sourceRef.current = audioCtx.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyser);
      }
      // Connect video element if present and not yet connected
      if (videoRef.current && !videoSourceRef.current) {
        videoSourceRef.current = audioCtx.createMediaElementSource(videoRef.current);
        videoSourceRef.current.connect(analyser);
      }
      // Ensure analyser feeds destination (needed for playback on some browsers)
      analyser.connect(audioCtx.destination);

      draw(analyser, canvasRef.current);
    } catch (err) {
      console.error("Failed to initialize visualizer:", err);
    }
  };

  const togglePlay = async () => {
    if (!audioContextRef.current) {
      initVisualizer();
    } else if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    const activeMedia = lastActiveMediaRef.current;
    const activeEl = activeMedia === "video" ? videoRef.current : audioRef.current;
    const otherEl = activeMedia === "video" ? audioRef.current : videoRef.current;

    if (!activeEl) return;

    if (!activeEl.paused) {
      activeEl.pause();
      if (otherEl && !otherEl.paused) otherEl.pause();
    } else {
      if (otherEl && !otherEl.paused) otherEl.pause();
      activeEl.play().catch((err) => console.error("Playback error:", err));
    }
  };

  // Spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      // Don't hijack spacebar when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });


  const selectSong = (song: SearchResult | null) => {
    setSelectedResult(song);
    
    // Reset lyrics state on any track change or clear
    setLyrics(null);
    setSyncedLyrics(null);
    setCurrentTime(0);

    if (song) {
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.id !== song.id);
        const updated = [song, ...filtered].slice(0, 8);
        localStorage.setItem("sekmusic_history", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Parse synced lyrics into a structured array
  const parsedLyrics = (() => {
    if (!syncedLyrics) return null;
    const lines = syncedLyrics.split("\n");
    const result: { time: number; text: string }[] = [];
    const timeReg = /^\[(\d+):(\d+)(?:\.(\d+))?\](.*)/;
    
    for (const line of lines) {
      const match = timeReg.exec(line.trim());
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = match[3] ? parseInt(match[3].padEnd(3, "0").substring(0, 3), 10) : 0;
        const time = minutes * 60 + seconds + milliseconds / 1000;
        const text = match[4].trim();
        // Skip metadata lines or empty lines
        if (text) {
          result.push({ time, text });
        }
      }
    }
    return result.sort((a, b) => a.time - b.time);
  })();

  // Find active line index
  const activeLineIndex = (() => {
    if (!parsedLyrics) return -1;
    let index = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  })();

  // Smooth scroll active line to center within the lyrics container only
  useEffect(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeLine = activeLineRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const activeLineRect = activeLine.getBoundingClientRect();
      
      // Calculate the offset of the active line relative to the container's top edge
      const relativeTop = activeLineRect.top - containerRect.top + container.scrollTop;
      
      // Calculate the target scroll position to center the active line
      const targetScrollTop = relativeTop - (containerRect.height / 2) + (activeLineRect.height / 2);
      
      container.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
      });
    }
  }, [activeLineIndex]);



  const handlePasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setQuery(text);
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };



  const getCleanSearchQuery = (title: string, artist: string) => {
    const cleanArtist = artist.replace(/\s*(music|vevo|official|channel|records|productions)$/gi, '').trim();
    let clean = title;
    clean = clean.replace(/[\(\[].*?(official|lyric|audio|video|visualizer|full|hd|4k|remastered|version|prod|explicit).*?[\)\]]/gi, '');
    if (!clean.toLowerCase().includes(cleanArtist.toLowerCase())) {
      clean = `${cleanArtist} ${clean}`;
    }
    return encodeURIComponent(
      clean.replace(/\s*-\s*Topic/gi, '').replace(/\s*\|\s*SekMusic/gi, '').replace(/[-|]/g, ' ').replace(/\s+/g, ' ').trim()
    );
  };

  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    selectSong(null);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: query, type: "text" }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        // Not a JSON response
      }

      if (!res.ok) {
        throw new Error(data?.error || `Failed to process request (Status ${res.status}).`);
      }

      if (Array.isArray(data)) {
        setResults(data);
        if (data.length === 1) selectSong(data[0]);
      } else {
        selectSong(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
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
    selectSong(null);
    setQuery(`Analyzing ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const recRes = await fetch("/api/recognize", { method: "POST", body: formData });
      if (!recRes.ok) throw new Error("Failed to recognize media format.");
      const recData = await recRes.json();

      const identifiedQuery = recData.identifiedQuery;
      setQuery(identifiedQuery);

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
        if (data.length === 1) selectSong(data[0]);
      } else {
        selectSong(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setQuery("");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

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
        {/* Hero Section */}
        {(selectedResult || results) && (
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
        )}
        {!selectedResult && !results && (
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
        )}

        {/* Input Section */}
        <motion.div variants={itemVariants} className={`w-full transition-all duration-700 ${selectedResult || results ? 'mb-10 scale-95 opacity-80 hover:opacity-100 hover:scale-100' : ''}`}>
          <form onSubmit={handleSearch} className="flex flex-col gap-5 w-full relative">
            <div
              className={`relative flex items-center w-full rounded-3xl transition-all duration-500
                ${isFocused ? 'bg-black/60 shadow-[0_0_0_1px_rgba(236,72,153,0.5),0_10px_40px_-10px_rgba(236,72,153,0.2)]' : 'bg-black/40 shadow-xl border border-white/10'}
                backdrop-blur-2xl p-2 sm:p-3 z-20 overflow-hidden
              `}
            >
              {/* Animated subtle gradient border effect internally */}
              {isFocused && (
                <div className="absolute inset-0 bg-linear-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 blur-xl z-0" />
              )}

              <div className="pl-4 pr-3 text-gray-400 relative z-10 transition-colors duration-300">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-pink-400" /> : <Search className={`w-6 h-6 ${isFocused ? 'text-pink-400' : ''}`} />}
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

        {/* Recent History Section */}
        {!selectedResult && !results && history.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="w-full mt-10 space-y-4 animate-fadeIn"
          >
            <div className="flex items-center gap-3">
              <History className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm uppercase tracking-widest font-bold text-gray-400">Recently Processed</h3>
              <div className="h-px bg-linear-to-r from-transparent to-white/10 flex-1" />
              <button 
                type="button"
                onClick={() => {
                  localStorage.removeItem("sekmusic_history");
                  setHistory([]);
                }}
                className="text-xs text-gray-500 hover:text-pink-400 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {history.map((track, idx) => (
                <motion.div
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                  whileTap={{ scale: 0.98 }}
                  key={track.id + "-hist-" + idx}
                  onClick={() => selectSong(track)}
                  className="group bg-white/5 border border-white/10 backdrop-blur-md p-3 rounded-3xl flex items-center gap-4 cursor-pointer transition-colors shadow-lg overflow-hidden"
                >
                  <div className="w-16 h-16 bg-black/50 rounded-2xl overflow-hidden shrink-0 relative">
                    {track.thumbnail ? (
                      <Image src={track.thumbnail} alt={track.title} fill sizes="64px" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Music className="w-5 h-5 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="text-white font-bold truncate text-sm mb-1 group-hover:text-pink-300 transition-colors">{track.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="truncate">{track.artist}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                      <span>{track.duration ? new Date(track.duration * 1000).toISOString().substr(14, 5) : "--:--"}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

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

          {results && !selectedResult && !loading && (
            <motion.div
              key="results"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              className="w-full space-y-4 relative z-10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px bg-linear-to-r from-transparent to-white/20 flex-1" />
                <h3 className="text-sm uppercase tracking-widest font-bold text-gray-400">Search Results</h3>
                <div className="h-px bg-linear-to-l from-transparent to-white/20 flex-1" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((res: SearchResult, index: number) => (
                  <motion.div
                    variants={itemVariants}
                    key={res.id + index}
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectSong(res)}
                    className="group bg-white/5 border border-white/10 backdrop-blur-md p-3 rounded-3xl flex items-center gap-4 cursor-pointer transition-colors shadow-lg overflow-hidden relative"
                  >
                    <div className="w-20 h-20 bg-black/50 rounded-2xl overflow-hidden shrink-0 relative shadow-inner">
                      {res.thumbnail ? (
                        <Image src={res.thumbnail} alt={res.title} fill sizes="80px" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <Music className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-600" />
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0 py-1 pr-2">
                      <h4 className="text-white font-bold truncate text-base mb-1 group-hover:text-pink-300 transition-colors">{res.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="truncate">{res.artist}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                        <span className="shrink-0">{res.duration ? new Date(res.duration * 1000).toISOString().substr(14, 5) : "--:--"}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {selectedResult && !loading && (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full relative z-10"
            >
              {/* Immersive Player Card */}
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 bg-black/40">
                {/* Ambient blurred background */}
                {selectedResult.thumbnail && (
                  <div
                    className="absolute inset-0 z-0 opacity-30 mix-blend-screen pointer-events-none"
                    style={{
                      backgroundImage: `url(${selectedResult.thumbnail})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(60px)',
                    }}
                  />
                )}

                <div className="relative z-10 p-6 sm:p-8 backdrop-blur-3xl bg-linear-to-b from-black/20 to-black/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    {/* Back button */}
                    <button
                      type="button"
                      onClick={() => selectSong(null)}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 backdrop-blur-md self-end sm:self-auto cursor-pointer"
                    >
                      Back
                    </button>
                  </div>

                  {/* Always-visible player section */}
                  <div className="flex flex-col md:flex-row gap-8 mb-8">
                    {/* Thumbnail & Show Lyrics Button */}
                    <div className="flex flex-col gap-4">
                      <div className="w-full md:w-56 h-56 rounded-3xl overflow-hidden bg-black/50 shrink-0 shadow-2xl border border-white/10 group relative flex items-center justify-center">
                        {selectedResult.thumbnail ? (
                          <Image src={selectedResult.thumbnail} alt={selectedResult.title} fill sizes="(max-width: 768px) 100vw, 224px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                          <Music className="w-16 h-16 text-gray-700" />
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-60" />
                        <button 
                          type="button"
                          onClick={togglePlay}
                          className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full transition-transform hover:scale-110 active:scale-95 text-white shadow-lg z-20 cursor-pointer"
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
                              ? "bg-white text-black shadow-md border-white/20"
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {activeTab === "lyrics" ? "Hide Lyrics" : "Show Lyrics"}
                        </button>
                        <button
                          type="button"
                          onClick={refreshLyrics}
                          disabled={lyricsLoading}
                          title="Refresh lyrics"
                          className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-md"
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
                          <span className="text-pink-400">{selectedResult.artist}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                          <span className="text-gray-400">{selectedResult.duration ? new Date(selectedResult.duration * 1000).toISOString().substr(14, 5) : "--:--"}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                          <span className="bg-white/10 text-white/80 px-2.5 py-0.5 rounded-md text-xs tracking-wider uppercase">HQ Audio</span>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-2 sm:p-3 border border-white/5 shadow-inner backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute inset-0 bg-linear-to-r from-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <audio
                          ref={audioRef}
                          onPlay={() => {
                            lastActiveMediaRef.current = "audio";
                            setIsPlaying(true);
                            if (!audioContextRef.current) initVisualizer();
                            // Pause video if it is playing
                            if (videoRef.current && !videoRef.current.paused) {
                              videoRef.current.pause();
                            }
                          }}
                          onPause={() => {
                            // Only set not playing if both media are paused
                            if (videoRef.current?.paused && (videoRef.current.paused ?? true)) {
                              setIsPlaying(false);
                            }
                          }}
                          onEnded={() => setIsPlaying(false)}
                          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                          onVolumeChange={(e) => {
                            const targetVolume = e.currentTarget.volume;
                            const targetMuted = e.currentTarget.muted;
                            setVolume(targetVolume);
                            setMuted(targetMuted);
                            localStorage.setItem("sekmusic_volume", String(targetVolume));
                            localStorage.setItem("sekmusic_muted", String(targetMuted));
                          }}
                          controls
                          controlsList="nodownload"
                          preload="metadata"
                          className="w-full outline-none h-12 relative z-10 filter invert grayscale opacity-90"
                          src={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=audio&filename=${encodeURIComponent(`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic`)}`}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>

                      {/* Visualizer Canvas */}
                      <canvas 
                        ref={canvasRef} 
                        className="w-full h-10 rounded-xl bg-black/40 border border-white/5 mt-4" 
                      />
                    </div>
                  </div>

                  {/* Lyrics Panel — slides open below player */}
                  <AnimatePresence>
                    {activeTab === "lyrics" && (
                      <motion.div
                        key="lyrics-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden mb-8"
                      >                        <div ref={lyricsContainerRef} className="bg-black/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden max-h-100 flex flex-col gap-4">
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
                                    onClick={() => {
                                      if (audioRef.current) audioRef.current.currentTime = line.time;
                                      if (videoRef.current) videoRef.current.currentTime = line.time;
                                      setCurrentTime(line.time);
                                    }}
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

                  {/* Video Player & Downloads — always visible */}
                  <div className="space-y-6 pt-6 border-t border-white/10">
                    {/* Video Player */}
                    <div className="w-full bg-black/60 rounded-3xl p-3 border border-white/5 shadow-inner">
                      <video
                        ref={videoRef}
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onVolumeChange={(e) => {
                          const targetVolume = e.currentTarget.volume;
                          const targetMuted = e.currentTarget.muted;
                          setVolume(targetVolume);
                          setMuted(targetMuted);
                          localStorage.setItem("sekmusic_volume", String(targetVolume));
                          localStorage.setItem("sekmusic_muted", String(targetMuted));
                        }}
                        onPlay={() => {
                          lastActiveMediaRef.current = "video";
                          // Initialize visualizer if not already
                          if (!audioContextRef.current) initVisualizer();
                          // Pause audio if it is playing
                          if (audioRef.current && !audioRef.current.paused) {
                            audioRef.current.pause();
                          }
                          // Indicate media is playing
                          setIsPlaying(true);
                        }}
                        onPause={() => {
                          // If both media are paused, update playing state
                          if (audioRef.current?.paused && videoRef.current?.paused) {
                            setIsPlaying(false);
                          }
                        }}
                        controls
                        controlsList="nodownload"
                        preload="metadata"
                        poster={selectedResult.thumbnail}
                        className="w-full rounded-2xl aspect-video bg-black outline-none object-cover"
                        src={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=video&filename=${encodeURIComponent(`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic`)}`}
                      >
                        Your browser does not support the video element.
                      </video>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=audio&dl=1&filename=${encodeURIComponent(`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic`)}`}
                        download={`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic.m4a`}
                        className="bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-shadow"
                      >
                        <Download className="w-5 h-5" /> Download Audio
                      </motion.a>
                      <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href={`/api/download?url=${encodeURIComponent(selectedResult.url)}&type=video&dl=1&filename=${encodeURIComponent(`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic`)}`}
                        download={`${selectedResult.title} -by- ${selectedResult.artist} - SekMusic.mp4`}
                        className="bg-white/5 border border-white/10 text-white hover:bg-white/10 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 backdrop-blur-md transition-colors"
                      >
                        <Download className="w-5 h-5" /> Download Video
                      </motion.a>
                    </div>
                  </div>
                </div>
              </div>

              {/* External Links */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a href={selectedResult.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#FF0000]/10 hover:bg-[#FF0000]/20 text-[#FF0000] px-5 py-2.5 rounded-full transition-colors font-medium border border-[#FF0000]/20 text-sm">
                  YouTube <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a href={`https://open.spotify.com/search/${getCleanSearchQuery(selectedResult.title, selectedResult.artist)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] px-5 py-2.5 rounded-full transition-colors font-medium border border-[#1DB954]/20 text-sm">
                  Spotify <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a href={`https://music.apple.com/search?term=${getCleanSearchQuery(selectedResult.title, selectedResult.artist)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#FA243C]/10 hover:bg-[#FA243C]/20 text-[#FA243C] px-5 py-2.5 rounded-full transition-colors font-medium border border-[#FA243C]/20 text-sm">
                  Apple Music <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
