"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { MockupItem } from "@/lib/mockups";

export function MockupsGallery({ items }: { items: MockupItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <p className="text-sm text-white/70">
          No files found yet. Add images/videos to{" "}
          <span className="font-mono text-white">public/mockups/</span>.
        </p>
        <p className="mt-2 text-xs text-white/50">
          Supported: png/jpg/webp/gif and mp4/webm/mov.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, idx) => (
        <motion.div
          key={`${item.src}-${idx}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: idx * 0.03 }}
          whileHover={{ y: -3 }}
          className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="relative aspect-[9/16] w-full bg-black/40">
            {item.type === "image" ? (
              <Image
                src={item.src}
                alt={item.name}
                fill
                className="object-contain p-3"
                sizes="(max-width: 1024px) 50vw, 33vw"
                priority={idx < 3}
              />
            ) : (
              <video
                className="h-full w-full object-contain p-3"
                controls
                preload="metadata"
              >
                <source src={item.src} />
              </video>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 p-4">
            <p className="truncate text-sm font-medium text-white/85">
              {item.name}
            </p>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
              {item.type === "image" ? "Image" : "Video"}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

