"use server";
import { checkComment, addComment, recentCommentsFrom, recentCommentsTotal } from "@/lib/comments";
import { getPostById } from "@/lib/posts";
import { siteSettings } from "@/lib/settings";
import { ipHash } from "@/lib/stats";
import { clientIp } from "@/lib/auth";
import { nowIso } from "@/lib/time";

export type CommentState = { ok?: boolean; message?: string };

export async function submitComment(_prev: CommentState, form: FormData): Promise<CommentState> {
  const postId = Number(form.get("post_id"));
  const post = getPostById(postId);
  const visible = post && post.status === "published" && post.published_at && post.published_at <= nowIso();
  if (!post || !visible || !post.allow_comments || siteSettings().comments_enabled !== "1") {
    return { message: "Komentar untuk tulisan ini sedang ditutup." };
  }
  const input = {
    name: String(form.get("name") ?? ""),
    body: String(form.get("body") ?? ""),
    website: String(form.get("website") ?? ""),
    startedAt: Number(form.get("started_at") ?? 0),
  };
  const problem = checkComment(input);
  // Bot tidak diberi tahu bahwa komentarnya ditolak
  if (problem === "spam") return { ok: true, message: "Terima kasih! Komentarmu akan tampil setelah disetujui penulis." };
  if (problem) return { message: problem };
  const hash = ipHash(await clientIp());
  if (recentCommentsTotal() >= 60) return { message: "Komentar sedang ramai sekali. Coba lagi sekitar satu jam lagi." };
  if (recentCommentsFrom(hash) >= 5) return { message: "Terlalu banyak komentar dalam waktu singkat. Coba lagi beberapa menit lagi." };
  addComment({ postId, name: input.name, body: input.body, ipHash: hash });
  return { ok: true, message: "Terima kasih! Komentarmu akan tampil setelah disetujui penulis." };
}
