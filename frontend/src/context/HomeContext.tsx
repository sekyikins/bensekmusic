"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
  type SyntheticEvent,
} from "react";
import type { SearchResult } from "@/lib/types";
import { findActiveLineIndex, parseSyncedLyrics, type ParsedLyricLine } from "@/lib/lyrics";

export type CopyState = null | "current" | "timed" | "plain";
export type ActiveTab = "player" | "lyrics";
export type MediaKind = "audio" | "video";

function useHomeState() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastActiveMediaRef = useRef<MediaKind>("audio");
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Selection & playback
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sekmusic_active_tab");
      return saved === "player" || saved === "lyrics" ? saved : "player";
    }
    return "player";
  });

  // Media preparation (files are downloaded on the media server first)
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Volume / mute
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

  // History & lyrics
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false);
  const [copiedState, setCopiedState] = useState<CopyState>(null);

  // Derived lyrics
  const parsedLyrics = parseSyncedLyrics(syncedLyrics);
  const activeLineIndex = findActiveLineIndex(parsedLyrics, currentTime);

  /* ------------------------------------------------------------------ */
  /* Visualizer                                                          */
  /* ------------------------------------------------------------------ */

  const draw = useCallback((analyser: AnalyserNode, canvas: HTMLCanvasElement) => {
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
  }, []);

  const initVisualizer = useCallback(() => {
    if (!canvasRef.current) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  }, [draw]);

  /* ------------------------------------------------------------------ */
  /* Playback controls                                                   */
  /* ------------------------------------------------------------------ */

  const togglePlay = useCallback(async () => {
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
  }, [initVisualizer]);

  const handleMediaPlay = useCallback(
    (which: MediaKind) => {
      lastActiveMediaRef.current = which;
      if (!audioContextRef.current) initVisualizer();
      const other = which === "video" ? audioRef.current : videoRef.current;
      if (other && !other.paused) other.pause();
      setIsPlaying(true);
    },
    [initVisualizer]
  );

  const handleMediaPause = useCallback(() => {
    // Only mark as not playing once both elements are paused
    if (audioRef.current?.paused && videoRef.current?.paused) {
      setIsPlaying(false);
    }
  }, []);

  const handleEnded = useCallback(() => setIsPlaying(false), []);

  const handleTimeUpdate = useCallback((e: SyntheticEvent<HTMLMediaElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  }, []);

  const handleVolumeChange = useCallback((e: SyntheticEvent<HTMLMediaElement>) => {
    const targetVolume = e.currentTarget.volume;
    const targetMuted = e.currentTarget.muted;
    setVolume(targetVolume);
    setMuted(targetMuted);
    localStorage.setItem("sekmusic_volume", String(targetVolume));
    localStorage.setItem("sekmusic_muted", String(targetMuted));
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Selection & history                                                 */
  /* ------------------------------------------------------------------ */

  const selectSong = useCallback((song: SearchResult | null) => {
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
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem("sekmusic_history");
    setHistory([]);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Lyrics                                                              */
  /* ------------------------------------------------------------------ */

  const refreshLyrics = useCallback(async () => {
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
  }, [selectedResult, lyricsLoading]);

  const copyLyrics = useCallback(
    (type: "current" | "timed" | "plain") => {
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
    },
    [parsedLyrics, activeLineIndex, syncedLyrics, lyrics]
  );

  /* ------------------------------------------------------------------ */
  /* Search & upload                                                     */
  /* ------------------------------------------------------------------ */

  const handlePasteLink = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setQuery(text);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  }, []);

  const handleSearch = useCallback(
    async (e: FormEvent) => {
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

        let data: unknown;
        try {
          data = await res.json();
        } catch {
          // Not a JSON response
        }

        const payload = data as { error?: string } | SearchResult[] | SearchResult | undefined;

        if (!res.ok) {
          const message = (payload as { error?: string } | undefined)?.error;
          throw new Error(message || `Failed to process request (Status ${res.status}).`);
        }

        if (Array.isArray(payload)) {
          setResults(payload);
          if (payload.length === 1) selectSong(payload[0]);
        } else if (payload) {
          selectSong(payload as SearchResult);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    },
    [query, selectSong]
  );

  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
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

        const identifiedQuery = recData.identifiedQuery as string;
        setQuery(identifiedQuery);

        const res = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: identifiedQuery, type: "text" }),
        });

        if (!res.ok) throw new Error("Failed to process identified song data.");
        const data = (await res.json()) as SearchResult[] | SearchResult | { error?: string };
        if ((data as { error?: string }).error) throw new Error((data as { error: string }).error);

        if (Array.isArray(data)) {
          setResults(data);
          if (data.length === 1) selectSong(data[0]);
        } else {
          selectSong(data as SearchResult);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        setQuery("");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [selectSong]
  );

  /* ------------------------------------------------------------------ */
  /* Effects                                                             */
  /* ------------------------------------------------------------------ */

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

        // A 404 just means LRCLIB has no lyrics for this track — that's a normal
        // outcome, not an error, so don't log it as one.
        if (res.status === 404) {
          setLyrics(null);
          setSyncedLyrics(null);
          return;
        }

        if (!res.ok) throw new Error(`Lyrics request failed (${res.status})`);

        const data = await res.json();

        setLyrics(data.lyrics ?? null);
        setSyncedLyrics(data.syncedLyrics ?? null);
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

  // Prepare media (download on the media server) when the selection changes
  useEffect(() => {
    if (!selectedResult) return;

    const target = selectedResult;
    let cancelled = false;

    const prepare = async (type: MediaKind) => {
      // Reset this media's state while the new file is prepared.
      if (type === "audio") {
        setAudioReady(false);
        setAudioSrc(null);
      } else {
        setVideoReady(false);
        setVideoSrc(null);
      }
      setMediaError(null);

      await fetch("/api/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target.url, type }),
      });

      for (let attempt = 0; attempt < 120; attempt++) {
        if (cancelled) return false;
        const res = await fetch(`/api/prepare?url=${encodeURIComponent(target.url)}&type=${type}`);
        const data = await res.json().catch(() => ({}));
        if (data.status === "ready") return true;
        if (data.error) throw new Error(data.error);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      throw new Error("Timed out preparing media");
    };

    const filenameBase = `${target.title} -by- ${target.artist} - SekMusic`;
    const srcFor = (type: MediaKind) =>
      `/api/download?url=${encodeURIComponent(target.url)}&type=${type}&filename=${encodeURIComponent(filenameBase)}`;

    prepare("audio")
      .then((ok) => {
        if (!cancelled && ok) {
          setAudioSrc(srcFor("audio"));
          setAudioReady(true);
        }
      })
      .catch((err) => {
        console.error("Audio preparation failed:", err);
        if (!cancelled) {
          setMediaError(err instanceof Error ? err.message : "Failed to prepare audio");
        }
      });

    prepare("video")
      .then((ok) => {
        if (!cancelled && ok) {
          setVideoSrc(srcFor("video"));
          setVideoReady(true);
        }
      })
      .catch((err) => {
        console.error("Video preparation failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedResult]);

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
      const targetScrollTop = relativeTop - containerRect.height / 2 + activeLineRect.height / 2;

      container.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
      });
    }
  }, [activeLineIndex]);

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

  return {
    // refs
    fileInputRef,
    audioRef,
    videoRef,
    canvasRef,
    lastActiveMediaRef,
    activeLineRef,
    lyricsContainerRef,
    dropdownRef,
    // search
    query,
    setQuery,
    loading,
    error,
    results,
    isFocused,
    setIsFocused,
    handleSearch,
    handlePasteLink,
    handleFileUpload,
    // selection
    selectedResult,
    selectSong,
    isPlaying,
    togglePlay,
    activeTab,
    setActiveTab,
    // media elements
    audioSrc,
    videoSrc,
    audioReady,
    videoReady,
    mediaError,
    handleMediaPlay,
    handleMediaPause,
    handleEnded,
    handleTimeUpdate,
    handleVolumeChange,
    // lyrics
    lyrics,
    syncedLyrics,
    lyricsLoading,
    parsedLyrics: parsedLyrics as ParsedLyricLine[] | null,
    activeLineIndex,
    refreshLyrics,
    copyLyrics,
    copiedState,
    copyDropdownOpen,
    setCopyDropdownOpen,
    seekTo,
    // history
    history,
    clearHistory,
  };
}

type HomeContextValue = ReturnType<typeof useHomeState>;

const HomeContext = createContext<HomeContextValue | null>(null);

export function HomeProvider({ children }: { children: React.ReactNode }) {
  const value = useHomeState();
  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome(): HomeContextValue {
  const ctx = useContext(HomeContext);
  if (!ctx) {
    throw new Error("useHome must be used within a HomeProvider");
  }
  return ctx;
}

export type { RefObject };
