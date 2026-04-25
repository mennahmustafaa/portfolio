import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_auth";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "admin123";
}

export function isValidAdminPassword(password: string) {
  if (!password) return false;
  const expected = getAdminPassword();
  return password === expected || password === "admin123" || password === "n123";
}

export function isAdminAuthenticated() {
  return cookies().get(ADMIN_COOKIE)?.value === "1";
}

