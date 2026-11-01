"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authenticate, createUser, deleteUser, getUser, setPassword, setRole, updateProfile, countAdmins, type Role } from "@/lib/users";
import { tooManyAttempts, recordFailure, clearFailures } from "@/lib/sessions";
import { startSession, endSession, requireUser, requireAdmin, clientIp } from "@/lib/auth";
import { savePost, getPostById, canEdit, deletePost as removePost, updateTag, deleteTag, getAnyBySlug } from "@/lib/posts";
import { setStatus, deleteComment, getComment, type CommentStatus } from "@/lib/comments";
import { setSetting, DEFAULTS, type SettingKey } from "@/lib/settings";
import { wibInputToIso } from "@/lib/time";
import { randomBytes } from "node:crypto";

export type FormState = { ok?: boolean; message?: string; secret?: string; secretLabel?: string };

/* ---------- Masuk / keluar ---------- */

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const ip = await clientIp();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  // Dibatasi per IP dan per akun: header IP bisa dipalsukan, batas per akun tetap mencegah tebak-tebakan password
  const keys = [`ip:${ip}`, `akun:${email}`];
  if (keys.some((k) => tooManyAttempts(k))) return { message: "Terlalu banyak percobaan gagal. Tunggu 15 menit lalu coba lagi." };
  const user = await authenticate(email, String(form.get("password") ?? ""));
  if (!user) {
    keys.forEach((k) => recordFailure(k));
    return { message: "Email atau password salah." };
  }
  keys.forEach((k) => clearFailures(k));
  await startSession(user.id);
  const next = String(form.get("next") ?? "");
  const safeNext = /^\/admin\/[a-z0-9/_-]*$/i.test(next) ? next : "/admin/";
  redirect(safeNext);
}

export async function logout() {
  await endSession();
  redirect("/admin/masuk/");
}

/* ---------- Tulisan ---------- */

export async function createDraft() {
  const user = await requireUser();
  const post = savePost({ title: "Tanpa judul", authorId: user.id, status: "draft", html: "", tags: [] });
  redirect(`/admin/tulisan/${post.id}/`);
}

export type EditorPayload = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  html: string;
  tags: string[];
  featureImage: string;
  featureImageAlt: string;
  featureImageCaption: string;
  allowComments: boolean;
  publishAt: string; // datetime-local dalam WIB, boleh kosong
  intent: "save" | "publish" | "unpublish";
};

export type SaveResult = { ok: boolean; message: string; status?: "draft" | "published"; publishedAt?: string | null; slug?: string };

export async function saveFromEditor(payload: EditorPayload): Promise<SaveResult> {
  const user = await requireUser();
  const existing = getPostById(Number(payload.id));
  if (!existing || !canEdit(user, existing)) return { ok: false, message: "Kamu tidak punya akses ke tulisan ini." };
  if (typeof payload.title !== "string" || !Array.isArray(payload.tags)) return { ok: false, message: "Data tidak valid." };
  if (typeof payload.html !== "string") return { ok: false, message: "Data tidak valid." };
  if (payload.html.length > 1_000_000) return { ok: false, message: "Tulisan terlalu panjang. Coba bagi menjadi dua tulisan." };
  const featureImage = typeof payload.featureImage === "string" && /^(\/uploads\/|https:\/\/)/.test(payload.featureImage) ? payload.featureImage : "";

  let status = existing.status;
  let publishedAt = existing.published_at;
  if (payload.publishAt) {
    const iso = wibInputToIso(payload.publishAt);
    if (!iso) return { ok: false, message: "Format tanggal terbit tidak dikenali." };
    publishedAt = iso;
  }
  if (payload.intent === "publish") {
    status = "published";
    if (!payload.publishAt && !existing.published_at) publishedAt = null; // savePost mengisi waktu sekarang
  }
  if (payload.intent === "unpublish") status = "draft";
  if (status === "published" && !payload.title.trim()) return { ok: false, message: "Judul wajib diisi sebelum terbit." };
  if (payload.intent === "publish" && !payload.html.replace(/<[^>]*>/g, "").trim() && !/<img/i.test(payload.html)) return { ok: false, message: "Isi tulisan masih kosong." };

  try {
    const saved = savePost({
      id: existing.id,
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      html: payload.html,
      featureImage,
      featureImageAlt: String(payload.featureImageAlt ?? ""),
      featureImageCaption: String(payload.featureImageCaption ?? ""),
      status,
      publishedAt,
      allowComments: payload.allowComments !== false,
      authorId: user.id,
      tags: payload.tags.map(String),
    });
    revalidatePath("/", "layout");
    const scheduled = saved.status === "published" && saved.published_at && saved.published_at > new Date().toISOString();
    const message =
      payload.intent === "publish" ? (scheduled ? "Tulisan dijadwalkan." : "Tulisan diterbitkan!") :
      payload.intent === "unpublish" ? "Tulisan ditarik jadi draf." : "Tersimpan.";
    return { ok: true, message, status: saved.status, publishedAt: saved.published_at, slug: saved.slug };
  } catch (e) {
    // Detail kesalahan hanya dicatat di log server, pengguna mendapat pesan yang bisa dipahami
    console.error("[simpan tulisan]", e);
    return { ok: false, message: "Gagal menyimpan. Coba lagi sebentar. Kalau masih gagal, beri tahu admin." };
  }
}

export async function deletePostAction(form: FormData) {
  const user = await requireUser();
  const post = getPostById(Number(form.get("id")));
  if (post && canEdit(user, post) && post.type === "post") removePost(post.id);
  revalidatePath("/", "layout");
  redirect("/admin/");
}

export async function openAboutPage() {
  const user = await requireUser();
  const existing = getAnyBySlug("tentang");
  const page = existing ?? savePost({ type: "page", title: "Tentang", slug: "tentang", authorId: user.id, status: "draft", html: "", tags: [] });
  redirect(`/admin/tulisan/${page.id}/`);
}

/* ---------- Komentar ---------- */

export async function moderateComment(form: FormData): Promise<FormState> {
  const user = await requireUser();
  const comment = getComment(Number(form.get("id")));
  if (!comment) return { message: "Komentar tidak ditemukan. Mungkin sudah dihapus." };
  if (user.role !== "admin" && comment.author_id !== user.id) return { message: "Kamu tidak punya akses ke komentar ini." };
  const action = String(form.get("action"));
  const done: Record<string, string> = { approved: "Komentar disetujui dan sekarang tampil.", pending: "Komentar disembunyikan.", spam: "Komentar ditandai spam.", delete: "Komentar dihapus." };
  if (action === "delete") deleteComment(comment.id);
  else if (["approved", "pending", "spam"].includes(action)) setStatus(comment.id, action as CommentStatus);
  else return { message: "Aksi tidak dikenal." };
  revalidatePath("/", "layout");
  return { ok: true, message: done[action] };
}

/* ---------- Akun sendiri ---------- */

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { message: "Nama wajib diisi." };
  const avatar = String(form.get("avatar") ?? "");
  updateProfile(user.id, {
    name: name.slice(0, 60),
    bio: String(form.get("bio") ?? "").slice(0, 300),
    avatar: avatar === "" || avatar.startsWith("/uploads/") ? avatar : undefined,
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil disimpan." };
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("confirm") ?? "")) return { message: "Konfirmasi password tidak sama." };
  const full = getUser(user.id)!;
  if (!(await authenticate(full.email, current))) return { message: "Password lama salah." };
  try {
    await setPassword(user.id, next);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal mengganti password." };
  }
  await startSession(user.id); // sesi lama dicabut, buat sesi baru untuk perangkat ini
  return { ok: true, message: "Password diganti. Perangkat lain otomatis keluar." };
}

/* ---------- Khusus admin ---------- */

function tempPassword() {
  return randomBytes(9).toString("base64url");
}

export async function addUser(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const email = String(form.get("email") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const role = (String(form.get("role")) === "admin" ? "admin" : "author") as Role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: "Email tidak valid." };
  if (!name) return { message: "Nama wajib diisi." };
  const password = tempPassword();
  try {
    await createUser({ email, name, role, password });
  } catch (e) {
    const msg = e instanceof Error && /UNIQUE/.test(e.message) ? "Email itu sudah terdaftar." : "Gagal menambah akun.";
    return { message: msg };
  }
  revalidatePath("/admin/pengguna/");
  return { ok: true, message: `Akun ${name} dibuat. Password sementara: ${password} (sampaikan langsung, lalu minta diganti di menu Akun).` };
}

export async function manageUser(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const target = getUser(Number(form.get("id")));
  if (!target) return { message: "Akun tidak ditemukan." };
  const action = String(form.get("action"));
  if (action === "reset") {
    const password = tempPassword();
    await setPassword(target.id, password);
    return { ok: true, message: `Password baru untuk ${target.name} dibuat.`, secret: password, secretLabel: `Password baru untuk ${target.name}` };
  }
  if (target.id === admin.id) return { message: "Tidak bisa mengubah peran atau menghapus akunmu sendiri." };
  if (action === "make-admin") setRole(target.id, "admin");
  if (action === "make-author") {
    if (target.role === "admin" && countAdmins() <= 1) return { message: "Harus ada minimal satu admin." };
    setRole(target.id, "author");
  }
  if (action === "delete") deleteUser(target.id);
  revalidatePath("/admin/pengguna/");
  return { ok: true, message: "Perubahan disimpan." };
}

export async function saveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  for (const key of Object.keys(DEFAULTS) as SettingKey[]) {
    if (key === "show_latest" || key === "comments_enabled") setSetting(key, form.get(key) ? "1" : "0");
    else setSetting(key, String(form.get(key) ?? "").trim().slice(0, 400));
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Pengaturan disimpan." };
}

export async function saveTag(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (form.get("action") === "delete") {
    deleteTag(id);
    revalidatePath("/", "layout");
    return { ok: true, message: "Tag dihapus. Tulisannya tetap ada." };
  }
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { message: "Nama tag wajib diisi." };
  try {
    updateTag(id, { name, description: String(form.get("description") ?? "") });
  } catch {
    return { message: "Nama tag itu sudah dipakai." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Tag disimpan." };
}
