import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSiteContent, saveSiteContent } from "@/lib/site-content";

function ensureAuthed() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const unauth = ensureAuthed();
  if (unauth) return unauth;
  return NextResponse.json({ content: getSiteContent() });
}

export async function PUT(request: Request) {
  const unauth = ensureAuthed();
  if (unauth) return unauth;

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const content = saveSiteContent(body);
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true, content });
}

