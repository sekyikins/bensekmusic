import { motion } from "framer-motion";

export default function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="p-4 bg-danger/10 border border-danger/30 rounded-2xl text-danger-soft w-full text-center font-medium shadow-lg backdrop-blur-sm"
    >
      {message}
    </motion.div>
  );
}
