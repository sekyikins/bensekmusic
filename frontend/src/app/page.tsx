"use client";

import { HomeProvider } from "@/context/HomeContext";
import HomeContent from "@/components/home/HomeContent";

export default function Home() {
  return (
    <HomeProvider>
      <HomeContent />
    </HomeProvider>
  );
}
