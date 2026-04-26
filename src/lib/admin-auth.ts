import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin_auth";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "admin123";
}

export function isValidAdminPassword(password: string) {
  if (!password) return false;
  const expected = getAdminPassword();

  const given = Buffer.from(password);
  const stored = Buffer.from(expected);
  if (given.length !== stored.length) return false;
  return timingSafeEqual(given, stored);
}

export function isAdminAuthenticated() {
  return cookies().get(ADMIN_COOKIE)?.value === "1";
}

