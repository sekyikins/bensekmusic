"use client";

import { useHome } from "@/context/HomeContext";

export default function VisualizerCanvas() {
  const { canvasRef } = useHome();

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-10 rounded-xl bg-panel border border-line-soft mt-4"
    />
  );
}
