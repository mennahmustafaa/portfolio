import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  removeProjectMedia,
  readProjectMediaStore,
  upsertProjectMedia,
} from "@/lib/project-media";

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

  const store = readProjectMediaStore();
  if (store.projects.length) {
    const projects = store.projects.map((project) => ({
      slug: project.slug,
      files: project.files.map((f) => f.name),
      previewUrl: project.files[0]?.url ?? null,
      count: project.files.length,
    }));
    return NextResponse.json({ projects });
  }

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

  try {
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

    const uploaded: { name: string; url: string; type: "image" | "video" }[] =
      [];

    const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    if (canUseBlob) {
      for (const file of files) {
        if (!(file instanceof File)) continue;
        const ext = path.extname(file.name).toLowerCase();
        if (!(IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext))) continue;

        const filename = safeFileName(file.name);
        const blob = await put(`mockups/${slug}/${Date.now()}-${filename}`, file, {
          access: "public",
        });
        uploaded.push({
          name: filename,
          url: blob.url,
          type: IMAGE_EXT.has(ext) ? "image" : "video",
        });
      }
    } else {
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
        uploaded.push({
          name: filename,
          url: `/mockups/${slug}/${filename}`,
          type: IMAGE_EXT.has(ext) ? "image" : "video",
        });
      }
    }

    upsertProjectMedia(slug, uploaded);
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    const isVercel = process.env.VERCEL === "1";
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (isVercel || code === "EROFS" || code === "EPERM") {
      return NextResponse.json(
        {
          error:
            "Live upload is disabled on this deployment because Vercel runtime storage is read-only. Use local admin for uploads or switch to cloud storage (Vercel Blob/Cloudinary).",
        },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: "Upload failed due to a server error." },
      { status: 500 }
    );
  }
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

  const removed = removeProjectMedia(slug);
  const shouldDeleteBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (removed?.files?.length && shouldDeleteBlob) {
    const blobUrls = removed.files
      .map((f) => f.url)
      .filter((u) => u.startsWith("http"));
    if (blobUrls.length) {
      await del(blobUrls).catch(() => {
        // Keep delete resilient even if blob cleanup fails.
      });
    }
  }

  const projectDir = path.join(projectsRoot(), slug);
  const hadLocalProject = fs.existsSync(projectDir);
  if (hadLocalProject) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }

  if (!removed && !hadLocalProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

