import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Code2, Database, Rocket, Wrench } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Reveal } from "@/components/reveal";
import { getFeaturedProjects } from "@/lib/featured-projects";
import { getSiteContent } from "@/lib/site-content";

export default async function Home() {
  const content = getSiteContent();
  const featuredProjects = await getFeaturedProjects();
  const skills = content.skills;
  const offerings = content.offerings;

  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-20 sm:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] px-6 py-12 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
          </div>

          <div className="relative grid items-center gap-10 md:grid-cols-[0.85fr_1.15fr]">
            <Reveal delay={0.1}>
              <div className="hover-lift mx-auto w-full max-w-sm rounded-[2rem] border border-white/15 bg-white/[0.03] p-4">
                <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/40">
                  <Image
                    src="/profile.png"
                    alt="Mennah profile photo"
                    width={900}
                    height={900}
                    className="h-auto w-full object-cover"
                    priority
                  />
                </div>
              </div>
            </Reveal>

            <div className="flex flex-col gap-7">
              <Reveal>
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {content.badge}
                </p>
              </Reveal>

              <Reveal delay={0.05}>
                <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                  {content.heroTitle}
                </h1>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="max-w-2xl text-pretty text-base leading-7 text-white/70 sm:text-lg">
                  {content.heroDescription}
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/mockups"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    View Projects <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#contact"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.02] px-6 text-sm font-semibold text-white transition hover:bg-white/5"
                  >
                    Contact Me
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="projects" className="mt-20">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Projects
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-3 max-w-2xl text-white/65">
              {content.projectsIntro}
            </p>
          </Reveal>

          {featuredProjects.length ? (
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {featuredProjects.map((project, idx) => (
                <Reveal key={project.slug} delay={idx * 0.04}>
                  <article className="hover-lift overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                    <div className="relative aspect-[16/10] w-full bg-black/30">
                      <Image
                        src={project.coverUrl}
                        alt={project.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-white">
                        {project.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/70">
                        {project.description}
                      </p>
                      <p className="mt-3 text-xs text-white/45">{project.slug}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          ) : null}

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Reveal>
              <div className="hover-lift rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <Code2 className="h-5 w-5 text-cyan-300" />
                <h3 className="mt-4 text-lg font-semibold">Design to App</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Convert your Figma or UI/UX screens into polished mobile apps.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="hover-lift rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <Database className="h-5 w-5 text-fuchsia-300" />
                <h3 className="mt-4 text-lg font-semibold">Backend & Database</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Firebase, Supabase, MongoDB, SQL, and API integration.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="hover-lift rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <Rocket className="h-5 w-5 text-indigo-300" />
                <h3 className="mt-4 text-lg font-semibold">Launch Support</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Testing, optimization, store submission, and post-launch
                  updates.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="hover-lift mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <p className="text-sm text-white/70">
                Upload your real project screenshots and videos in{" "}
                <span className="font-mono text-white">public/mockups/</span> then
                open <span className="font-mono text-white">/mockups</span>.
              </p>
            </div>
          </Reveal>
        </section>

        <section id="skills" className="mt-20">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Technical Skills
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-3 max-w-2xl text-white/65">
              {content.skillsIntro}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-3">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/90"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="mt-20">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              What I Offer
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {offerings.map((item, idx) => (
              <Reveal key={item} delay={0.04 * idx}>
                <div className="hover-lift rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="flex items-start gap-3">
                    <Wrench className="mt-0.5 h-4 w-4 text-white/70" />
                    <p className="text-sm leading-6 text-white/80">{item}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="contact" className="mt-20">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Contact
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-3 max-w-2xl text-white/65">
              {content.contactText}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`mailto:${content.email}`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Email Me
              </a>
              <a
                href={content.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-5 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                GitHub
              </a>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
