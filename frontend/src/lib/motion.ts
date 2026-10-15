import type { TargetAndTransition, Variants } from "framer-motion";

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export const hover = {
  grow: { scale: 1.02 } satisfies TargetAndTransition,
  lift: { scale: 1.05 } satisfies TargetAndTransition,
  logo: { scale: 1.05, rotate: 5 } satisfies TargetAndTransition,
};

export const tap = {
  press: { scale: 0.95 } satisfies TargetAndTransition,
  pressSoft: { scale: 0.98 } satisfies TargetAndTransition,
};
