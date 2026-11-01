/** Helper login untuk Next.js: cookie sesi, wajib login, alamat IP. */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, createSession, deleteSession } from "./sessions";
import type { User } from "./users";

export const SESSION_COOKIE = "qiran_session";

export async function getSessionUserFromCookie(): Promise<User | null> {
  const jar = await cookies();
  return getSessionUser(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUserFromCookie();
  if (!user) redirect("/admin/masuk/");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/admin/");
  return user;
}

export async function startSession(userId: number) {
  const token = createSession(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(SESSION_COOKIE);
}

/** IP pengunjung. Di belakang Cloudflare + Nginx, ambil dari header yang diteruskan. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || "0.0.0.0";
}

export async function userAgent(): Promise<string> {
  return (await headers()).get("user-agent") || "";
}
