import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  let password = "";
  const raw = await request.text();

  try {
    const parsed = JSON.parse(raw) as { password?: string };
    password = String(parsed?.password || "");
  } catch {
    password = raw.trim();
  }

  if (!isValidAdminPassword(password)) {
    const res = NextResponse.json({ error: "Invalid password" }, { status: 401 });
    res.cookies.set(ADMIN_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

