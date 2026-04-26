import fs from "node:fs";
import path from "node:path";
import { list } from "@vercel/blob";

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

function mapBlobToItem(blob: { pathname: string; url: string }) {
  const ext = path.extname(blob.pathname).toLowerCase();
  if (IMAGE_EXT.has(ext)) {
    return {
      type: "image" as const,
      src: blob.url,
      name: path.basename(blob.pathname),
    };
  }
  if (VIDEO_EXT.has(ext)) {
    return {
      type: "video" as const,
      src: blob.url,
      name: path.basename(blob.pathname),
    };
  }
  return null;
}

export async function getMockups(): Promise<MockupItem[]> {
  const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (canUseBlob) {
    const result = await list({ prefix: "mockups/" });
    const blobItems = result.blobs
      .map(mapBlobToItem)
      .filter((item): item is MockupItem => item !== null);
    blobItems.sort((a, b) => a.name.localeCompare(b.name));
    return blobItems;
  }

  const rootAbs = path.join(process.cwd(), "public", "mockups");
  if (!fs.existsSync(rootAbs)) return [];

  const out: MockupItem[] = [];
  walk(rootAbs, rootAbs, out);
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function getProjectMediaBySlug(slug: string): Promise<MockupItem[]> {
  const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (canUseBlob) {
    const result = await list({ prefix: `mockups/${slug}/` });
    const blobItems = result.blobs
      .map(mapBlobToItem)
      .filter((item): item is MockupItem => item !== null);
    blobItems.sort((a, b) => a.name.localeCompare(b.name));
    return blobItems;
  }

  const rootAbs = path.join(process.cwd(), "public", "mockups", slug);
  if (!fs.existsSync(rootAbs)) return [];
  const out: MockupItem[] = [];
  walk(rootAbs, rootAbs, out);
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

