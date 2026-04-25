import fs from "node:fs";
import path from "node:path";

export type MediaType = "image" | "video";

export type ProjectMediaFile = {
  name: string;
  url: string;
  type: MediaType;
};

export type ProjectMedia = {
  slug: string;
  files: ProjectMediaFile[];
};

type ProjectMediaStore = {
  projects: ProjectMedia[];
};

const DEFAULT_STORE: ProjectMediaStore = { projects: [] };

function storePath() {
  return path.join(process.cwd(), "data", "project-media.json");
}

function ensureDataDir() {
  const dir = path.dirname(storePath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readProjectMediaStore(): ProjectMediaStore {
  const file = storePath();
  if (!fs.existsSync(file)) return DEFAULT_STORE;

  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as ProjectMediaStore;
    if (!Array.isArray(parsed.projects)) return DEFAULT_STORE;
    return parsed;
  } catch {
    return DEFAULT_STORE;
  }
}

export function writeProjectMediaStore(store: ProjectMediaStore) {
  ensureDataDir();
  fs.writeFileSync(storePath(), JSON.stringify(store, null, 2), "utf8");
}

export function upsertProjectMedia(slug: string, files: ProjectMediaFile[]) {
  const store = readProjectMediaStore();
  const current = store.projects.find((p) => p.slug === slug);
  if (!current) {
    store.projects.push({ slug, files });
  } else {
    const map = new Map(current.files.map((f) => [f.url, f]));
    for (const f of files) map.set(f.url, f);
    current.files = Array.from(map.values());
  }

  store.projects.sort((a, b) => a.slug.localeCompare(b.slug));
  writeProjectMediaStore(store);
}

export function removeProjectMedia(slug: string) {
  const store = readProjectMediaStore();
  const index = store.projects.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  const [removed] = store.projects.splice(index, 1);
  writeProjectMediaStore(store);
  return removed;
}

