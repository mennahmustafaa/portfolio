import { getMockups } from "@/lib/mockups";
import { MockupsGallery } from "./ui/mockups-gallery";

export default async function MockupsPage() {
  const items = await getMockups();

  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-14 sm:px-8">
        <div className="pt-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Mockups & demos
          </h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Upload images/videos into{" "}
            <span className="font-mono text-white">public/mockups/</span>. The
            gallery updates automatically.
          </p>
        </div>

        <div className="mt-10">
          <MockupsGallery items={items} />
        </div>
      </div>
    </div>
  );
}

