import fs from "node:fs";
import path from "node:path";

export type MockupItem = {
  type: "image" | "video";
  src: string;
  name: string;
};

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

function walk(dirAbs: string, rootAbs: string, out: MockupItem[]) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      walk(abs, rootAbs, out);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    const rel = path.relative(rootAbs, abs).replaceAll(path.sep, "/");
    const webSrc = `/mockups/${rel}`;

    if (IMAGE_EXT.has(ext)) {
      out.push({ type: "image", src: webSrc, name: entry.name });
    } else if (VIDEO_EXT.has(ext)) {
      out.push({ type: "video", src: webSrc, name: entry.name });
    }
  }
}

export function getMockups(): MockupItem[] {
  const rootAbs = path.join(process.cwd(), "public", "mockups");
  if (!fs.existsSync(rootAbs)) return [];

  const out: MockupItem[] = [];
  walk(rootAbs, rootAbs, out);
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

