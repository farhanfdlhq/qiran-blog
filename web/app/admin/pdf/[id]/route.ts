import fs from "node:fs";
import path from "node:path";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getFullById, canEdit } from "@/lib/posts";
import { getIdentity } from "@/lib/users";
import { dataDir, uploadsDir } from "@/lib/db";
import { pdfHtml, pdfCoverHtml, pdfFileName, pdfCacheKey } from "@/lib/pdf/template";
import { renderPdf, PdfUnavailableError, PdfBusyError } from "@/lib/pdf/render";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response("Tidak ditemukan", { status: 404 });
const err = (status: number, error: string) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

// Batas sederhana per akun: 10 PDF baru per 10 menit (hasil dari cache tidak dihitung)
const RATE = { max: 10, windowMs: 10 * 60_000 };
const recent = new Map<number, number[]>();
function limited(userId: number): boolean {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < RATE.windowMs);
  recent.set(userId, list);
  return list.length >= RATE.max;
}

/** /admin/pdf/<id>/: PDF tugas dan lomba, hanya untuk yang boleh mengedit tulisan itu. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUserFromCookie();
  const id = Number((await params).id);
  if (!user || !Number.isInteger(id)) return NOT_FOUND();
  const post = getFullById(id);
  if (!post || post.type !== "post" || !canEdit(user, post)) return NOT_FOUND();
  if (!post.title.trim() || post.title === "Tanpa judul" || !post.plain_text.trim()) return err(422, "Isi judul dan tulisan dulu sebelum membuat PDF.");

  // Identitas yang dicetak selalu milik penulis tulisan, bukan milik yang mengunduh
  const authorId = post.author_id ?? user.id;
  const identity = getIdentity(authorId);
  const authorName = post.author?.name ?? user.name;
  const fileName = pdfFileName(post.title, identity.full_name || authorName);

  const dir = path.join(dataDir(), "cache", "pdf");
  fs.mkdirSync(dir, { recursive: true });
  const key = pdfCacheKey(post, identity, authorName);
  const file = path.join(dir, `${post.id}-${key}.pdf`);

  let pdf: Buffer;
  if (fs.existsSync(file)) {
    pdf = await fs.promises.readFile(file);
  } else {
    if (limited(user.id)) return err(429, "Terlalu banyak membuat PDF. Tunggu beberapa menit lalu coba lagi.");
    try {
      const opts = { uploadsDir: uploadsDir() };
      pdf = await renderPdf(pdfHtml(post, identity, authorName, opts), pdfCoverHtml(post, identity, authorName, opts));
    } catch (e) {
      if (e instanceof PdfUnavailableError) return err(503, "PDF belum bisa dibuat di server ini. Minta kakak menjalankan langkah pemasangan PDF.");
      if (e instanceof PdfBusyError) return err(503, e.message);
      console.error("[pdf] gagal membuat PDF untuk tulisan", post.id, e);
      return err(500, "PDF gagal dibuat. Coba lagi sebentar lagi.");
    }
    recent.get(user.id)?.push(Date.now());
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, pdf);
    await fs.promises.rename(tmp, file);
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(`${post.id}-`) && name !== path.basename(file)) fs.rmSync(path.join(dir, name), { force: true });
    }
  }

  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
