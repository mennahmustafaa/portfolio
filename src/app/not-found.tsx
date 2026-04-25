import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start px-5 pb-24 pt-24 sm:px-8">
        <p className="text-sm text-white/60">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-white/65">
          The page you’re looking for doesn’t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

