import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { del, list, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getFeaturedProjects,
  getFeaturedProjectBySlug,
  reorderFeaturedProject,
  refreshFeaturedProjectCover,
  removeFeaturedProject,
  upsertFeaturedProject,
} from "@/lib/featured-projects";

export const runtime = "nodejs";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);
type AdminProjectSummary = {
  slug: string;
  title: string;
  description: string;
  files: {
    name: string;
    url: string;
    type: "image" | "video";
  }[];
  previewUrl: string | null;
  count: number;
};

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

function parseBlobPathname(pathname: string) {
  // Expected: mockups/<slug>/<file>
  const parts = pathname.split("/");
  if (parts.length < 3 || parts[0] !== "mockups") return null;
  const slug = parts[1];
  const filename = parts.slice(2).join("/");
  return { slug, filename };
}

export async function GET() {
  const unauth = ensureAuthed();
  if (unauth) return unauth;

  const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (canUseBlob) {
    const featured = await getFeaturedProjects();
    const featuredMap = new Map(featured.map((p) => [p.slug, p]));
    const orderMap = new Map(featured.map((p, index) => [p.slug, index]));
    const result = await list({ prefix: "mockups/" });
    const bySlug = new Map<string, AdminProjectSummary>();

    for (const blob of result.blobs) {
      const parsed = parseBlobPathname(blob.pathname);
      if (!parsed) continue;
      const current: AdminProjectSummary = bySlug.get(parsed.slug) ?? {
        slug: parsed.slug,
        title: featuredMap.get(parsed.slug)?.title ?? parsed.slug,
        description: featuredMap.get(parsed.slug)?.description ?? "",
        files: [],
        previewUrl: null,
        count: 0,
      };
      const ext = path.extname(parsed.filename).toLowerCase();
      const type: "image" | "video" = IMAGE_EXT.has(ext) ? "image" : "video";
      current.files.push({ name: parsed.filename, url: blob.url, type });
      current.count += 1;
      if (!current.previewUrl) current.previewUrl = blob.url;
      bySlug.set(parsed.slug, current);
    }

    const projects = Array.from(bySlug.values()).sort((a, b) => {
      const aOrder = orderMap.get(a.slug);
      const bOrder = orderMap.get(b.slug);
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return a.slug.localeCompare(b.slug);
    });
    return NextResponse.json({ projects });
  }

  const root = projectsRoot();
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  const featured = await getFeaturedProjects();
  const featuredMap = new Map(featured.map((p) => [p.slug, p]));
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
      title: featuredMap.get(slug)?.title ?? slug,
      description: featuredMap.get(slug)?.description ?? "",
      files: files.map((name) => {
        const ext = path.extname(name).toLowerCase();
        const type: "image" | "video" = IMAGE_EXT.has(ext) ? "image" : "video";
        return { name, url: `/mockups/${slug}/${name}`, type };
      }),
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
    const rawTitle = String(form.get("title") || "");
    const rawDescription = String(form.get("description") || "");
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

    const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    const uploadedUrls: { url: string; type: "image" | "video" }[] = [];
    if (canUseBlob) {
      for (const file of files) {
        if (!(file instanceof File)) continue;
        const ext = path.extname(file.name).toLowerCase();
        if (!(IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext))) continue;

        const filename = safeFileName(file.name);
        const blob = await put(`mockups/${slug}/${Date.now()}-${filename}`, file, {
          access: "public",
        });
        uploadedUrls.push({
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
        uploadedUrls.push({
          url: `/mockups/${slug}/${filename}`,
          type: IMAGE_EXT.has(ext) ? "image" : "video",
        });
      }
    }

    if (!uploadedUrls.length) {
      return NextResponse.json(
        { error: "No supported image/video files were uploaded." },
        { status: 400 }
      );
    }

    const cover =
      uploadedUrls.find((f) => f.type === "image")?.url ?? uploadedUrls[0].url;
    await upsertFeaturedProject({
      slug,
      title: rawTitle.trim() || rawName.trim() || slug,
      description: rawDescription.trim() || "Mobile app project showcase.",
      coverUrl: cover,
    });
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/mockups");
    revalidatePath(`/projects/${slug}`);

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    const message =
      (error as { message?: string } | undefined)?.message ?? "Unknown error";
    const isReadOnly = code === "EROFS" || code === "EPERM";
    const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

    if (isReadOnly && !hasBlob) {
      return NextResponse.json(
        {
          error:
            "Upload failed because server filesystem is read-only and Blob storage is not configured.",
        },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: `Upload failed: ${message}` },
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

  const shouldDeleteBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (shouldDeleteBlob) {
    const result = await list({ prefix: `mockups/${slug}/` });
    const blobUrls = result.blobs.map((b) => b.url);
    if (blobUrls.length) {
      await del(blobUrls).catch(() => {
        // Keep delete resilient even if blob cleanup fails.
      });
    }
  }
  await removeFeaturedProject(slug);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/mockups");
  revalidatePath(`/projects/${slug}`);

  const projectDir = path.join(projectsRoot(), slug);
  const hadLocalProject = fs.existsSync(projectDir);
  if (hadLocalProject) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }

  if (!shouldDeleteBlob && !hadLocalProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const unauth = ensureAuthed();
  if (unauth) return unauth;

  const body = (await request.json().catch(() => null)) as
    | {
        action?:
          | "reorder"
          | "delete_file"
          | "rename_file"
          | "update_project";
        slug?: string;
        direction?: "up" | "down";
        oldName?: string;
        newName?: string;
        title?: string;
        description?: string;
      }
    | null;
  const slug = cleanSlug(String(body?.slug || ""));
  if (!slug || !body?.action) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.action === "reorder") {
    const direction = body.direction;
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Invalid reorder request." }, { status: 400 });
    }
    await reorderFeaturedProject(slug, direction);
    revalidatePath("/");
    revalidatePath("/admin");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_file") {
    const oldName = String(body.oldName || "");
    if (!oldName) {
      return NextResponse.json({ error: "File name is required." }, { status: 400 });
    }
    const shouldDeleteBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    if (shouldDeleteBlob) {
      const result = await list({ prefix: `mockups/${slug}/` });
      const target = result.blobs.find((b) => path.basename(b.pathname) === oldName);
      if (target) await del(target.url);
    } else {
      const filePath = path.join(projectsRoot(), slug, oldName);
      if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    }
    await refreshFeaturedProjectCover(slug);
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/mockups");
    revalidatePath(`/projects/${slug}`);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "rename_file") {
    const oldName = String(body.oldName || "");
    const newName = safeFileName(String(body.newName || ""));
    if (!oldName || !newName) {
      return NextResponse.json(
        { error: "Old and new file names are required." },
        { status: 400 }
      );
    }

    const shouldUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    if (shouldUseBlob) {
      const result = await list({ prefix: `mockups/${slug}/` });
      const target = result.blobs.find((b) => path.basename(b.pathname) === oldName);
      if (!target) {
        return NextResponse.json({ error: "File not found." }, { status: 404 });
      }
      const content = await fetch(target.url).then((r) => r.arrayBuffer());
      await put(`mockups/${slug}/${Date.now()}-${newName}`, content, {
        access: "public",
      });
      await del(target.url);
    } else {
      const fromPath = path.join(projectsRoot(), slug, oldName);
      const toPath = path.join(projectsRoot(), slug, newName);
      if (!fs.existsSync(fromPath)) {
        return NextResponse.json({ error: "File not found." }, { status: 404 });
      }
      fs.renameSync(fromPath, toPath);
    }
    await refreshFeaturedProjectCover(slug);
    const currentProject = await getFeaturedProjectBySlug(slug);
    if (currentProject && oldName === path.basename(currentProject.coverUrl)) {
      await refreshFeaturedProjectCover(slug);
    }
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/mockups");
    revalidatePath(`/projects/${slug}`);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_project") {
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    if (!title && !description) {
      return NextResponse.json(
        { error: "Title or description is required." },
        { status: 400 }
      );
    }

    const existing = await getFeaturedProjectBySlug(slug);
    if (!existing) {
      const canUseBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
      let coverUrl = "";
      if (canUseBlob) {
        const result = await list({ prefix: `mockups/${slug}/` });
        coverUrl = result.blobs[0]?.url ?? "";
      } else {
        const localDir = path.join(projectsRoot(), slug);
        if (fs.existsSync(localDir)) {
          const localFiles = fs.readdirSync(localDir);
          coverUrl = localFiles[0] ? `/mockups/${slug}/${localFiles[0]}` : "";
        }
      }
      if (!coverUrl) {
        return NextResponse.json(
          { error: "Project media not found for this slug." },
          { status: 404 }
        );
      }

      await upsertFeaturedProject({
        slug,
        title: title || slug,
        description: description || "Mobile app project showcase.",
        coverUrl,
      });
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath(`/projects/${slug}`);
      return NextResponse.json({ ok: true });
    }

    await upsertFeaturedProject({
      slug: existing.slug,
      title: title || existing.title,
      description: description || existing.description,
      coverUrl: existing.coverUrl,
      updatedAt: existing.updatedAt,
      order: existing.order,
    });
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/projects/${slug}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

