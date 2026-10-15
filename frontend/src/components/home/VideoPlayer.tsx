"use client";

import { Loader2 } from "lucide-react";
import { useHome } from "@/context/HomeContext";

export default function VideoPlayer() {
  const {
    videoRef,
    videoSrc,
    videoReady,
    mediaError,
    selectedResult,
    handleMediaPlay,
    handleMediaPause,
    handleTimeUpdate,
    handleVolumeChange,
  } = useHome();

  return (
    <div className="w-full bg-black/60 rounded-3xl p-3 border border-white/5 shadow-inner relative">
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onVolumeChange={handleVolumeChange}
        onPlay={() => handleMediaPlay("video")}
        onPause={handleMediaPause}
        controls
        controlsList="nodownload"
        preload="metadata"
        poster={selectedResult?.thumbnail}
        className="w-full rounded-2xl aspect-video bg-black outline-none object-cover"
        src={videoSrc ?? undefined}
      >
        Your browser does not support the video element.
      </video>
      {!videoReady && (
        <div className="absolute inset-3 z-20 flex items-center justify-center gap-2 text-sm font-medium text-gray-300 bg-black/60 backdrop-blur-sm rounded-2xl">
          {mediaError ? (
            <span className="text-red-400 px-4 text-center">Video unavailable</span>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
              <span>Preparing video…</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
