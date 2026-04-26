import fs from "node:fs";
import path from "node:path";
import { list, put } from "@vercel/blob";
import { getProjectMediaBySlug } from "@/lib/mockups";

export type FeaturedProject = {
  slug: string;
  title: string;
  description: string;
  coverUrl: string;
  updatedAt: string;
  order: number;
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

function normalizeProject(
  project: Partial<FeaturedProject>,
  fallbackOrder: number
): FeaturedProject | null {
  const slug = String(project.slug || "").trim();
  if (!slug) return null;
  return {
    slug,
    title: String(project.title || slug),
    description: String(project.description || "Mobile app project showcase."),
    coverUrl: String(project.coverUrl || ""),
    updatedAt: String(project.updatedAt || new Date(0).toISOString()),
    order: Number.isFinite(project.order) ? Number(project.order) : fallbackOrder,
  };
}

async function writeProjects(projects: FeaturedProject[]) {
  const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (canUseBlob) {
    await put(BLOB_PATH, JSON.stringify(projects, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  ensureDataDir();
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(projects, null, 2), "utf8");
}

export async function getFeaturedProjects(): Promise<FeaturedProject[]> {
  const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const rawProjects = canUseBlob ? await readFromBlob() : readFromLocal();
  const projects = rawProjects
    .map((p, idx) => normalizeProject(p, idx + 1))
    .filter((p): p is FeaturedProject => p !== null);

  return projects.sort((a, b) => {
    const orderA = Number.isFinite(a.order) ? a.order : 999999;
    const orderB = Number.isFinite(b.order) ? b.order : 999999;
    if (orderA !== orderB) return orderA - orderB;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function getFeaturedProjectBySlug(slug: string) {
  const projects = await getFeaturedProjects();
  return projects.find((project) => project.slug === slug) ?? null;
}

export async function upsertFeaturedProject(
  input: Omit<FeaturedProject, "updatedAt" | "order"> & {
    updatedAt?: string;
    order?: number;
  }
) {
  const projects = await getFeaturedProjects();
  const nextOrder = projects.length ? Math.max(...projects.map((p) => p.order ?? 0)) + 1 : 1;
  const entry: FeaturedProject = {
    ...input,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    order: input.order ?? nextOrder,
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
  next.forEach((project, index) => {
    project.order = index + 1;
  });
  await writeProjects(next);
}

export async function reorderFeaturedProject(
  slug: string,
  direction: "up" | "down"
) {
  const projects = await getFeaturedProjects();
  const index = projects.findIndex((project) => project.slug === slug);
  if (index === -1) return projects;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= projects.length) return projects;

  const temp = projects[index];
  projects[index] = projects[targetIndex];
  projects[targetIndex] = temp;

  projects.forEach((project, i) => {
    project.order = i + 1;
  });

  await writeProjects(projects);
  return projects;
}

export async function getFeaturedProjectsForDisplay() {
  const featured = await getFeaturedProjects();
  if (featured.length) {
    const validProjects: FeaturedProject[] = [];
    for (const project of featured) {
      const media = await getProjectMediaBySlug(project.slug);
      if (!media.length) continue;

      const cover =
        media.find((m) => m.type === "image")?.src ??
        media[0]?.src ??
        project.coverUrl;

      validProjects.push({
        ...project,
        coverUrl: cover,
      });
    }

    if (validProjects.length !== featured.length) {
      // Self-heal stale metadata after project/media deletion.
      await writeProjects(validProjects);
    }

    if (validProjects.length) return validProjects;
  }

  const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (canUseBlob) {
    const result = await list({ prefix: "mockups/" });
    const firstImageBySlug = new Map<string, string>();
    for (const blob of result.blobs) {
      const parts = blob.pathname.split("/");
      if (parts.length < 3 || parts[0] !== "mockups") continue;
      if (parts[1] === "_projects.json") continue;
      const slug = parts[1];
      const ext = path.extname(blob.pathname).toLowerCase();
      const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
      if (!isImage) continue;
      if (!firstImageBySlug.has(slug)) firstImageBySlug.set(slug, blob.url);
    }

    return Array.from(firstImageBySlug.entries()).map(([slug, coverUrl], idx) => ({
      slug,
      title: slug,
      description: "Project details",
      coverUrl,
      updatedAt: new Date(0).toISOString(),
      order: idx + 1,
    }));
  }

  return [];
}

export async function refreshFeaturedProjectCover(slug: string) {
  const existing = await getFeaturedProjectBySlug(slug);
  if (!existing) return;
  const media = await getProjectMediaBySlug(slug);
  const cover = media.find((m) => m.type === "image")?.src ?? media[0]?.src ?? "";
  if (!cover) return;
  await upsertFeaturedProject({
    slug: existing.slug,
    title: existing.title,
    description: existing.description,
    coverUrl: cover,
    updatedAt: existing.updatedAt,
    order: existing.order,
  });
}

