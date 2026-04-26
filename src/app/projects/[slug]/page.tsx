import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { getFeaturedProjectBySlug } from "@/lib/featured-projects";
import { getProjectMediaBySlug } from "@/lib/mockups";

export const dynamic = "force-dynamic";

export default async function ProjectDetailsPage({
  params,
}: {
  params: { slug: string };
}) {
  const project = await getFeaturedProjectBySlug(params.slug);
  if (!project) notFound();

  const media = await getProjectMediaBySlug(params.slug);
  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");

  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:px-8">
        <Link
          href="/#projects"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <section className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            {project.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:text-base">
            {project.description}
          </p>
        </section>

        {videos.length ? (
          <section className="mt-10">
            <h2 className="inline-flex items-center gap-2 text-xl font-semibold">
              <PlayCircle className="h-5 w-5 text-cyan-300" />
              Demo Videos
            </h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {videos.map((video) => (
                <div
                  key={video.src}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-3"
                >
                  <video
                    className="h-auto w-full rounded-xl bg-black"
                    controls
                    preload="metadata"
                  >
                    <source src={video.src} />
                  </video>
                  <p className="mt-3 truncate text-xs text-white/60">{video.name}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {images.length ? (
          <section className="mt-10">
            <div className="grid max-w-6xl gap-6 md:grid-cols-2">
              {images.map((image) => (
                <article
                  key={image.src}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
                >
                  <div className="relative aspect-[5/4] w-full bg-black/30">
                    <Image
                      src={image.src}
                      alt={image.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                  <p className="truncate px-4 py-3 text-xs text-white/60">
                    {image.name}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

