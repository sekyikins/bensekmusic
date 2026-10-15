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
    <div className="glass-card border-line-soft rounded-2xl p-2 sm:p-3 shadow-inner relative overflow-hidden group">
      <div className="absolute inset-0 bg-linear-to-r from-brand/10 to-brand-purple/10 opacity-0 group-hover:opacity-100 transition-opacity" />
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
        <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 text-xs font-medium text-fg-soft bg-panel-strong backdrop-blur-sm rounded-2xl">
          {mediaError ? (
            <span className="text-danger-soft px-4 text-center">{mediaError}</span>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-brand-soft" />
              <span>Preparing audio…</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
