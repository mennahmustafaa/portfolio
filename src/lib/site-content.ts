import fs from "node:fs";
import path from "node:path";

export type SiteContent = {
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

const DEFAULT_CONTENT: SiteContent = {
  badge: "Mobile Developer | Software Engineer",
  heroTitle: "Mennah - building scalable, high-performance mobile apps.",
  heroDescription:
    "I transform Figma and UX/UI designs into clean, user-friendly applications for iOS, Android, and Flutter with strong software engineering best practices.",
  projectsIntro:
    "I build data-driven and production-ready mobile apps with responsive layouts, maintainable code, and reliable communication throughout the project.",
  skillsIntro:
    "Practical stack for scalable, maintainable, and high-performance mobile products.",
  contactText: "Let's build your app with quality, speed, and clear daily updates.",
  email: "mennahmustafaa0@gmail.com",
  github: "https://github.com/mennahmustafaa",
  skills: [
    "Flutter",
    "Dart",
    "React Native",
    "Swift",
    "Kotlin",
    "Java",
    "Firebase",
    "Supabase",
    "MongoDB",
    "SQL",
    "REST APIs",
    "Git",
  ],
  offerings: [
    "iOS / Android / Flutter app development",
    "Static and dynamic app implementation from Figma/UI designs",
    "Backend and API integration with clean architecture",
    "Bug fixing, optimization, and performance improvements",
    "App Store and Play Store submission support",
    "Post-launch maintenance and updates",
  ],
};

function contentPath() {
  return path.join(process.cwd(), "data", "site-content.json");
}

function ensureDataDir() {
  const dir = path.dirname(contentPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalize(input: Partial<SiteContent>): SiteContent {
  return {
    badge: String(input.badge ?? DEFAULT_CONTENT.badge),
    heroTitle: String(input.heroTitle ?? DEFAULT_CONTENT.heroTitle),
    heroDescription: String(
      input.heroDescription ?? DEFAULT_CONTENT.heroDescription
    ),
    projectsIntro: String(input.projectsIntro ?? DEFAULT_CONTENT.projectsIntro),
    skillsIntro: String(input.skillsIntro ?? DEFAULT_CONTENT.skillsIntro),
    contactText: String(input.contactText ?? DEFAULT_CONTENT.contactText),
    email: String(input.email ?? DEFAULT_CONTENT.email),
    github: String(input.github ?? DEFAULT_CONTENT.github),
    skills: Array.isArray(input.skills) ? input.skills.map(String) : DEFAULT_CONTENT.skills,
    offerings: Array.isArray(input.offerings)
      ? input.offerings.map(String)
      : DEFAULT_CONTENT.offerings,
  };
}

export function getSiteContent(): SiteContent {
  const file = contentPath();
  if (!fs.existsSync(file)) {
    ensureDataDir();
    fs.writeFileSync(file, JSON.stringify(DEFAULT_CONTENT, null, 2), "utf8");
    return DEFAULT_CONTENT;
  }

  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    return normalize(parsed);
  } catch {
    return DEFAULT_CONTENT;
  }
}

export function saveSiteContent(input: Partial<SiteContent>) {
  const merged = normalize(input);
  ensureDataDir();
  fs.writeFileSync(contentPath(), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

