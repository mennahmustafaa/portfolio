"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070A12]/70 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Sparkles className="h-4 w-4 text-white/90" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Mennah</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href="#projects"
            className="rounded-full border border-white/15 bg-white/[0.02] px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/5"
          >
            Projects
          </a>
          <a
            href="#skills"
            className="rounded-full border border-white/15 bg-white/[0.02] px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/5"
          >
            Skills
          </a>
          <motion.a
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            href="mailto:mennahmustafaa0@gmail.com"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            <Mail className="h-4 w-4" />
            Contact
          </motion.a>
        </div>
      </div>
    </div>
  );
}

