import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const runtime = "nodejs";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

function ensureAuthed() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function projectsRoot() {
  return path.join(process.cwd(), "public", "mockups");
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET() {
  const unauth = ensureAuthed();
  if (unauth) return unauth;

  const root = projectsRoot();
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  const projects = dirs.map((slug) => {
    const dirAbs = path.join(root, slug);
    const files = fs
      .readdirSync(dirAbs)
      .filter((name) => {
        const ext = path.extname(name).toLowerCase();
        return IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext);
      })
      .sort((a, b) => a.localeCompare(b));

    return {
      slug,
      files,
      previewUrl: files[0] ? `/mockups/${slug}/${files[0]}` : null,
      count: files.length,
    };
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const unauth = ensureAuthed();
  if (unauth) return unauth;

  const form = await request.formData();
  const rawName = String(form.get("name") || "");
  const rawSlug = String(form.get("slug") || "");
  const slug = cleanSlug(rawSlug || rawName);
  const files = form.getAll("files");

  if (!slug) {
    return NextResponse.json(
      { error: "Project name or slug is required" },
      { status: 400 }
    );
  }

  if (!files.length) {
    return NextResponse.json(
      { error: "Please upload at least one file" },
      { status: 400 }
    );
  }

  const root = projectsRoot();
  const projectDir = path.join(root, slug);
  fs.mkdirSync(projectDir, { recursive: true });

  for (const file of files) {
    if (!(file instanceof File)) continue;
    const ext = path.extname(file.name).toLowerCase();
    if (!(IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext))) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = safeFileName(file.name);
    fs.writeFileSync(path.join(projectDir, filename), buffer);
  }

  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(request: Request) {
  const unauth = ensureAuthed();
  if (unauth) return unauth;

  const url = new URL(request.url);
  const rawSlug = url.searchParams.get("slug") || "";
  const slug = cleanSlug(rawSlug);
  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const projectDir = path.join(projectsRoot(), slug);
  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  fs.rmSync(projectDir, { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}

