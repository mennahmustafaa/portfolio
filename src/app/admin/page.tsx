import { AdminPanel } from "./ui/admin-panel";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      <div className="mx-auto w-full max-w-5xl px-5 pb-24 pt-16 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Panel</h1>
        <p className="mt-3 text-white/65">
          Manage projects and upload images/videos from the browser.
        </p>
        <div className="mt-8">
          <AdminPanel />
        </div>
      </div>
    </div>
  );
}

