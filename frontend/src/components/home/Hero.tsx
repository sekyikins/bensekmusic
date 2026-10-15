"use client";

import { motion } from "framer-motion";
import { AudioLines } from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { hover, itemVariants } from "@/lib/motion";
import BrandWordmark from "@/components/ui/BrandWordmark";

export default function Hero() {
  const { selectedResult, results } = useHome();
  const compact = Boolean(selectedResult || results);

  if (compact) {
    return (
      <div className="flex gap-2 items-center justify-center p-4">
        <motion.div
          className="glass-card glow-brand inline-flex items-center justify-center p-4 rounded-3xl"
          whileHover={hover.logo}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <AudioLines className="w-10 h-10 text-brand-soft" />
        </motion.div>
        <BrandWordmark className="text-5xl sm:text-7xl font-extrabold tracking-tighter" glow />
      </div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="text-center space-y-6 mb-12 w-full">
      <motion.div
        className="glass-card glow-brand inline-flex items-center justify-center p-4 rounded-3xl mb-4"
        whileHover={hover.logo}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <AudioLines className="w-10 h-10 text-brand-soft" />
      </motion.div>
      <BrandWordmark className="text-5xl sm:text-7xl font-extrabold tracking-tighter" glow />
      <p className="text-lg sm:text-xl text-fg-muted max-w-2xl mx-auto font-medium leading-relaxed">
        Experience the ultimate audio extraction engine. Instantly process streams, analyze files, and retrieve master-quality metadata.
      </p>
    </motion.div>
  );
}
