import fs from "node:fs";
import path from "node:path";
import { list, put } from "@vercel/blob";

export type FeaturedProject = {
  slug: string;
  title: string;
  description: string;
  coverUrl: string;
  updatedAt: string;
};

const LOCAL_FILE = path.join(process.cwd(), "data", "featured-projects.json");
const BLOB_PATH = "mockups/_projects.json";

function ensureDataDir() {
  const dir = path.dirname(LOCAL_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function readFromBlob() {
  const result = await list({ prefix: BLOB_PATH });
  const file = result.blobs.find((b) => b.pathname === BLOB_PATH);
  if (!file) return [] as FeaturedProject[];

  const res = await fetch(file.url, { cache: "no-store" });
  if (!res.ok) return [] as FeaturedProject[];
  const data = (await res.json()) as FeaturedProject[];
  return Array.isArray(data) ? data : [];
}

function readFromLocal() {
  if (!fs.existsSync(LOCAL_FILE)) return [] as FeaturedProject[];
  try {
    const raw = fs.readFileSync(LOCAL_FILE, "utf8");
    const data = JSON.parse(raw) as FeaturedProject[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [] as FeaturedProject[];
  }
}

async function writeProjects(projects: FeaturedProject[]) {
  const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (canUseBlob) {
    await put(BLOB_PATH, JSON.stringify(projects, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }

  ensureDataDir();
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(projects, null, 2), "utf8");
}

export async function getFeaturedProjects(): Promise<FeaturedProject[]> {
  const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const projects = canUseBlob ? await readFromBlob() : readFromLocal();
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertFeaturedProject(
  input: Omit<FeaturedProject, "updatedAt"> & { updatedAt?: string }
) {
  const projects = await getFeaturedProjects();
  const entry: FeaturedProject = {
    ...input,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };

  const idx = projects.findIndex((p) => p.slug === entry.slug);
  if (idx === -1) {
    projects.push(entry);
  } else {
    projects[idx] = { ...projects[idx], ...entry, updatedAt: entry.updatedAt };
  }

  await writeProjects(projects);
}

export async function removeFeaturedProject(slug: string) {
  const projects = await getFeaturedProjects();
  const next = projects.filter((p) => p.slug !== slug);
  if (next.length === projects.length) return;
  await writeProjects(next);
}

