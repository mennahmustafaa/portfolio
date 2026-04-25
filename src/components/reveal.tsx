"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, y: 10 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -120px 0px" }}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

