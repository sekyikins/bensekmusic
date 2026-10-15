"use client";

import { Loader2 } from "lucide-react";
import { useHome } from "@/context/HomeContext";

export default function AudioPlayer() {
  const {
    audioRef,
    audioSrc,
    audioReady,
    mediaError,
    handleMediaPlay,
    handleMediaPause,
    handleEnded,
    handleTimeUpdate,
    handleVolumeChange,
  } = useHome();

  return (
    <div className="bg-white/5 rounded-2xl p-2 sm:p-3 border border-white/5 shadow-inner backdrop-blur-md relative overflow-hidden group">
      <div className="absolute inset-0 bg-linear-to-r from-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <audio
        ref={audioRef}
        onPlay={() => handleMediaPlay("audio")}
        onPause={handleMediaPause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onVolumeChange={handleVolumeChange}
        controls
        controlsList="nodownload"
        preload="metadata"
        className="w-full outline-none h-12 relative z-10 filter invert grayscale opacity-90"
        src={audioSrc ?? undefined}
      >
        Your browser does not support the audio element.
      </audio>
      {!audioReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 text-xs font-medium text-gray-300 bg-black/60 backdrop-blur-sm rounded-2xl">
          {mediaError ? (
            <span className="text-red-400 px-4 text-center">{mediaError}</span>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
              <span>Preparing audio…</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
