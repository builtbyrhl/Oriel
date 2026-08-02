"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
};

export default function GlassButton({
  children,
  onClick,
  variant = "primary",
}: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`rounded-full px-6 py-3 backdrop-blur-xl transition-all duration-300 ${
        variant === "primary"
          ? "bg-white/15 border border-white/20 text-white hover:bg-white/25"
          : "bg-black/30 border border-white/10 text-white/80 hover:text-white"
      }`}
    >
      {children}
    </motion.button>
  );
}
