"use client";

import { useHome } from "@/context/HomeContext";

export default function VisualizerCanvas() {
  const { canvasRef } = useHome();

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-10 rounded-xl bg-black/40 border border-white/5 mt-4"
    />
  );
}
