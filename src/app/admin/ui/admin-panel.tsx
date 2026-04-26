"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Project = {
  slug: string;
  title?: string;
  description?: string;
  files: {
    name: string;
    url: string;
    type: "image" | "video";
  }[];
  previewUrl: string | null;
  count: number;
};

type ProjectsResponse = { projects: Project[] };
type SiteContent = {
  badge: string;
  heroTitle: string;
  heroDescription: string;
  projectsIntro: string;
  skillsIntro: string;
  contactText: string;
  email: string;
  github: string;
  skills: string[];
  offerings: string[];
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [projectDrafts, setProjectDrafts] = useState<
    Record<string, { title: string; description: string }>
  >({});
  const [appendFiles, setAppendFiles] = useState<Record<string, FileList | null>>(
    {}
  );
  const [content, setContent] = useState<SiteContent | null>(null);

  const effectiveSlug = useMemo(() => toSlug(slug || name), [slug, name]);

  useEffect(() => {
    void (async () => {
      try {
        await loadProjects();
        await loadContent();
      } catch {
        // If not authenticated, panel stays at login view.
      }
    })();
  }, []);

  function showAlert(message: string, isError = false) {
    if (isError) setError(message);
    if (typeof window !== "undefined") {
      window.alert(message);
    }
  }

  async function loadProjects() {
    const res = await fetch("/api/admin/projects");
    if (res.status === 401) {
      setAuthed(false);
      setProjects([]);
      return;
    }
    if (!res.ok) throw new Error("Failed loading projects");
    const data = (await res.json()) as ProjectsResponse;
    setAuthed(true);
    setProjects(data.projects);
    setProjectDrafts((prev) => {
      const next = { ...prev };
      for (const project of data.projects) {
        if (!next[project.slug]) {
          next[project.slug] = {
            title: project.title || project.slug,
            description: project.description || "",
          };
        }
      }
      return next;
    });
  }

  async function loadContent() {
    const res = await fetch("/api/admin/content");
    if (res.status === 401) {
      setAuthed(false);
      setContent(null);
      return;
    }
    if (!res.ok) throw new Error("Failed loading content");
    const data = (await res.json()) as { content: SiteContent };
    setContent(data.content);
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        showAlert("Login failed: wrong password.", true);
        return;
      }

      setPassword("");
      await loadProjects();
      await loadContent();
      showAlert("Login successful.");
    } catch {
      showAlert("Login failed, try again.", true);
    } finally {
      setLoading(false);
    }
  }

  async function onSaveContent(e: FormEvent) {
    e.preventDefault();
    if (!content) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data.error || "Could not save content.", true);
        return;
      }
      await loadContent();
      showAlert("Portfolio content saved successfully.");
    } catch {
      showAlert("Could not save content.", true);
    } finally {
      setLoading(false);
    }
  }

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!name.trim()) {
        showAlert("Project name is required.", true);
        return;
      }
      if (!files?.length) {
        showAlert("Choose at least one image/video.", true);
        return;
      }

      const form = new FormData();
      form.set("name", name);
      form.set("title", title || name);
      form.set("description", description);
      form.set("slug", effectiveSlug);
      for (const file of Array.from(files)) {
        form.append("files", file);
      }

      const res = await fetch("/api/admin/projects", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data.error || "Upload failed.", true);
        return;
      }

      setName("");
      setTitle("");
      setDescription("");
      setSlug("");
      setFiles(null);
      await loadProjects();
      showAlert("Project uploaded successfully.");
    } catch {
      showAlert("Upload failed, try again.", true);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(projectSlug: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/projects?slug=${projectSlug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        showAlert("Could not delete project.", true);
        return;
      }
      await loadProjects();
      showAlert("Project deleted successfully.");
    } catch {
      showAlert("Could not delete project.", true);
    } finally {
      setLoading(false);
    }
  }

  async function onReorder(projectSlug: string, direction: "up" | "down") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", slug: projectSlug, direction }),
      });
      if (!res.ok) {
        showAlert("Could not reorder project.", true);
        return;
      }
      await loadProjects();
      showAlert("Project order updated.");
    } catch {
      showAlert("Could not reorder project.", true);
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteFile(projectSlug: string, fileName: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_file",
          slug: projectSlug,
          oldName: fileName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data.error || "Could not delete file.", true);
        return;
      }
      await loadProjects();
      showAlert("File deleted successfully.");
    } catch {
      showAlert("Could not delete file.", true);
    } finally {
      setLoading(false);
    }
  }

  async function onSaveProjectMeta(projectSlug: string) {
    const draft = projectDrafts[projectSlug];
    if (!draft) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_project",
          slug: projectSlug,
          title: draft.title,
          description: draft.description,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data.error || "Could not update project details.", true);
        return;
      }
      await loadProjects();
      showAlert("Project details updated.");
    } catch {
      showAlert("Could not update project details.", true);
    } finally {
      setLoading(false);
    }
  }

  async function onAppendFiles(project: Project) {
    const filesForProject = appendFiles[project.slug];
    if (!filesForProject?.length) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("name", project.title || project.slug);
      form.set("title", project.title || project.slug);
      form.set("description", project.description || "");
      form.set("slug", project.slug);
      for (const file of Array.from(filesForProject)) {
        form.append("files", file);
      }

      const res = await fetch("/api/admin/projects", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data.error || "Could not add files.", true);
        return;
      }
      setAppendFiles((prev) => ({ ...prev, [project.slug]: null }));
      await loadProjects();
      showAlert("Files added successfully.");
    } catch {
      showAlert("Could not add files.", true);
    } finally {
      setLoading(false);
    }
  }

  async function onRenameFile(projectSlug: string, oldName: string) {
    const key = `${projectSlug}:${oldName}`;
    const newName = (renameDrafts[key] || "").trim();
    if (!newName) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename_file",
          slug: projectSlug,
          oldName,
          newName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data.error || "Could not rename file.", true);
        return;
      }
      setRenameDrafts((prev) => ({ ...prev, [key]: "" }));
      await loadProjects();
      showAlert("File renamed successfully.");
    } catch {
      showAlert("Could not rename file.", true);
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setProjects([]);
    setContent(null);
  }

  if (!authed) {
    return (
      <form
        onSubmit={onLogin}
        className="max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-6"
      >
        <h2 className="text-lg font-semibold">Login</h2>
        <p className="mt-2 text-sm text-white/65">
          Enter admin password to open project control panel.
        </p>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Admin password"
          className="mt-4 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm outline-none ring-0 focus:border-white/30"
        />
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <button
          disabled={loading}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-70"
        >
          {loading ? "Checking..." : "Login"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSaveContent}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
      >
        <h2 className="text-lg font-semibold">Portfolio Content Editor</h2>
        <p className="mt-2 text-sm text-white/65">
          Edit your homepage text, links, skills, and services from here.
        </p>

        {content ? (
          <div className="mt-5 grid gap-4">
            <label className="text-sm">
              <span className="mb-2 block text-white/70">Badge</span>
              <input
                value={content.badge}
                onChange={(e) =>
                  setContent({ ...content, badge: e.target.value })
                }
                className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm outline-none focus:border-white/30"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-white/70">Hero Title</span>
              <input
                value={content.heroTitle}
                onChange={(e) =>
                  setContent({ ...content, heroTitle: e.target.value })
                }
                className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm outline-none focus:border-white/30"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-white/70">Hero Description</span>
              <textarea
                value={content.heroDescription}
                onChange={(e) =>
                  setContent({ ...content, heroDescription: e.target.value })
                }
                rows={3}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-white/70">Projects Intro</span>
              <textarea
                value={content.projectsIntro}
                onChange={(e) =>
                  setContent({ ...content, projectsIntro: e.target.value })
                }
                rows={2}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-white/70">Skills Intro</span>
              <textarea
                value={content.skillsIntro}
                onChange={(e) =>
                  setContent({ ...content, skillsIntro: e.target.value })
                }
                rows={2}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-white/70">Contact Text</span>
              <textarea
                value={content.contactText}
                onChange={(e) =>
                  setContent({ ...content, contactText: e.target.value })
                }
                rows={2}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-white/70">Email</span>
                <input
                  value={content.email}
                  onChange={(e) =>
                    setContent({ ...content, email: e.target.value })
                  }
                  className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm outline-none focus:border-white/30"
                />
              </label>
              <label className="text-sm">
                <span className="mb-2 block text-white/70">GitHub URL</span>
                <input
                  value={content.github}
                  onChange={(e) =>
                    setContent({ ...content, github: e.target.value })
                  }
                  className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm outline-none focus:border-white/30"
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="mb-2 block text-white/70">
                Skills (one per line)
              </span>
              <textarea
                value={content.skills.join("\n")}
                onChange={(e) =>
                  setContent({
                    ...content,
                    skills: e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
                rows={5}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </label>

            <label className="text-sm">
              <span className="mb-2 block text-white/70">
                What I Offer (one per line)
              </span>
              <textarea
                value={content.offerings.join("\n")}
                onChange={(e) =>
                  setContent({
                    ...content,
                    offerings: e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
                rows={6}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </label>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/65">Loading content...</p>
        )}

        <button
          disabled={loading || !content}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Save Portfolio Content"}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-sm text-white/75">
          You are logged in. Upload project assets and they will appear at
          `/mockups`.
        </p>
        <button
          onClick={onLogout}
          className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-4 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          Logout
        </button>
      </div>

      <form
        onSubmit={onUpload}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
      >
        <h2 className="text-lg font-semibold">Create / Update Project</h2>
        <p className="mt-2 text-sm text-white/65">
          Add images and videos. Uploading to an existing slug adds more files.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-white/70">Project Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Food Delivery App"
              className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm outline-none focus:border-white/30"
            />
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-white/70">Project Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AIRA - Mental Health App"
              className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm outline-none focus:border-white/30"
            />
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-white/70">Slug (optional)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="food-delivery-app"
              className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm outline-none focus:border-white/30"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm">
          <span className="mb-2 block text-white/70">
            Small Description (for homepage card)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Short summary of project outcome and tech."
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>

        <p className="mt-3 text-xs text-white/55">
          Folder will be: <span className="font-mono">{effectiveSlug}</span>
        </p>

        <label className="mt-4 block text-sm">
          <span className="mb-2 block text-white/70">Upload files</span>
          <input
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov"
            onChange={(e) => setFiles(e.target.files)}
            className="block w-full cursor-pointer rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        <button
          disabled={loading}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Upload Project Files"}
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-lg font-semibold">Existing Projects</h2>
        <button
          onClick={loadProjects}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-4 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          Refresh
        </button>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {projects.length ? (
            projects.map((project) => (
              <div
                key={project.slug}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="grid gap-2">
                  <input
                    value={projectDrafts[project.slug]?.title ?? project.title ?? project.slug}
                    onChange={(e) =>
                      setProjectDrafts((prev) => ({
                        ...prev,
                        [project.slug]: {
                          title: e.target.value,
                          description:
                            prev[project.slug]?.description ??
                            project.description ??
                            "",
                        },
                      }))
                    }
                    className="h-9 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm font-medium outline-none focus:border-white/30"
                  />
                  <textarea
                    value={
                      projectDrafts[project.slug]?.description ??
                      project.description ??
                      ""
                    }
                    onChange={(e) =>
                      setProjectDrafts((prev) => ({
                        ...prev,
                        [project.slug]: {
                          title: prev[project.slug]?.title ?? project.title ?? project.slug,
                          description: e.target.value,
                        },
                      }))
                    }
                    rows={2}
                    className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs outline-none focus:border-white/30"
                  />
                  <button
                    onClick={() => onSaveProjectMeta(project.slug)}
                    className="inline-flex h-8 w-fit items-center rounded-md border border-white/20 px-3 text-xs font-semibold text-white/90"
                  >
                    Save Details
                  </button>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  {project.count} file(s)
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => onReorder(project.slug, "up")}
                    className="inline-flex h-8 items-center rounded-full border border-white/20 px-3 text-xs font-semibold text-white/90"
                  >
                    Move Up
                  </button>
                  <button
                    onClick={() => onReorder(project.slug, "down")}
                    className="inline-flex h-8 items-center rounded-full border border-white/20 px-3 text-xs font-semibold text-white/90"
                  >
                    Move Down
                  </button>
                  <a
                    href={`/mockups`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-full border border-white/15 px-3 text-xs font-semibold text-white/90"
                  >
                    View Gallery
                  </a>
                  <button
                    onClick={() => onDelete(project.slug)}
                    className="inline-flex h-8 items-center rounded-full border border-rose-300/30 px-3 text-xs font-semibold text-rose-200"
                  >
                    Delete Project
                  </button>
                </div>
                {project.files.length ? (
                  <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                      <label className="block text-xs text-white/70">
                        Add more images/videos
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          type="file"
                          multiple
                          accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov"
                          onChange={(e) =>
                            setAppendFiles((prev) => ({
                              ...prev,
                              [project.slug]: e.target.files,
                            }))
                          }
                          className="block w-full cursor-pointer rounded-md border border-white/15 bg-black/30 p-2 text-xs text-white/80 file:mr-2 file:rounded file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black"
                        />
                        <button
                          onClick={() => onAppendFiles(project)}
                          className="inline-flex h-8 items-center rounded-md border border-white/20 px-3 text-xs font-semibold text-white/90"
                        >
                          Add Files
                        </button>
                      </div>
                    </div>
                    {project.files.map((file) => {
                      const key = `${project.slug}:${file.name}`;
                      return (
                        <div
                          key={key}
                          className="rounded-lg border border-white/10 bg-black/20 p-2"
                        >
                          <p className="truncate text-xs text-white/75">
                            {file.name}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={renameDrafts[key] ?? ""}
                              onChange={(e) =>
                                setRenameDrafts((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder="new-name.png"
                              className="h-8 flex-1 rounded-md border border-white/15 bg-black/30 px-2 text-xs outline-none focus:border-white/30"
                            />
                            <button
                              onClick={() => onRenameFile(project.slug, file.name)}
                              className="inline-flex h-8 items-center rounded-md border border-white/20 px-2 text-xs font-semibold text-white/90"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => onDeleteFile(project.slug, file.name)}
                              className="inline-flex h-8 items-center rounded-md border border-rose-300/30 px-2 text-xs font-semibold text-rose-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-white/65">No projects yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

