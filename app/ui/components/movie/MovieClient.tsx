"use client";

import { motion } from "framer-motion";
import CastSection from "./CastSection";

type Credit = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type Props = {
  credits: {
    cast: Credit[];
  };
};

export default function MovieClient({
  credits,
}: Props) {
  return (
    <motion.div
  initial={{ opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.55 }}
  className="space-y-16 md:space-y-20">
      <CastSection cast={credits.cast} />
    </motion.div>
  );
}
