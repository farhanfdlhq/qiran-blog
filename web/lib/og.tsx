/**
 * Gambar pratinjau (Open Graph) 1200x630 untuk tiap tulisan: judul, penulis, tanggal, dan foto sampul.
 * Dirender sekali lalu disimpan di DATA_DIR/cache/og sebagai JPEG kecil (WhatsApp menolak gambar besar).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { dataDir, uploadsDir } from "./db";
import { formatTanggal } from "./time";
import { siteUrl } from "./site";
import type { PostFull } from "./posts";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
const PHOTO_WIDTH = 460;
const BAND = 16;

const C = { bg: "#e3e2da", ink: "#161c1a", muted: "#4d5550", accent: "#9fc7b8" };

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${C.ink}"/><path d="M29 17.5a12.5 12.5 0 0 0 0 25" fill="none" stroke="${C.bg}" stroke-width="7"/><path d="M29 17.5a12.5 12.5 0 0 1 12.5 12.5a12.5 12.5 0 0 1 -12.5 12.5" fill="none" stroke="${C.accent}" stroke-width="7"/><path d="M41.5 18v32" fill="none" stroke="${C.accent}" stroke-width="7" stroke-linecap="round"/></svg>`;
const MARK_URI = "data:image/svg+xml;base64," + Buffer.from(MARK_SVG).toString("base64");

type OgPost = Pick<PostFull, "slug" | "type" | "title" | "feature_image" | "published_at" | "author" | "tags">;

function cardInputs(post: OgPost, siteTitle: string) {
  const isPost = post.type === "post";
  return {
    siteTitle,
    title: post.title.trim() || siteTitle,
    kicker: isPost ? (post.tags[0]?.name ?? "") : "",
    meta: isPost ? [post.author?.name, formatTanggal(post.published_at)].filter(Boolean).join(" · ") : new URL(siteUrl()).host,
    photo: localUpload(post.feature_image),
  };
}

/** Versi gambar: berubah hanya kalau isi kartunya berubah, supaya cache WhatsApp/Facebook ikut diperbarui. */
export function ogVersion(post: OgPost, siteTitle: string): string {
  const i = cardInputs(post, siteTitle);
  return crypto.createHash("sha1").update(JSON.stringify([i, post.feature_image, "v1"])).digest("hex").slice(0, 10);
}

export function ogImagePath(post: OgPost, siteTitle: string): string {
  return `/og/${post.slug}.jpg?v=${ogVersion(post, siteTitle)}`;
}

/** Hanya gambar unggahan sendiri yang dipakai; path di luar folder uploads ditolak. */
function localUpload(url: string): string | null {
  if (!url || !url.startsWith("/uploads/")) return null;
  const root = uploadsDir();
  const file = path.resolve(/*turbopackIgnore: true*/ root, decodeURIComponent(url.slice("/uploads/".length)));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return null;
  return file;
}

/* ---------- Font ---------- */

const g = globalThis as unknown as { __qiranOgFonts?: Promise<{ name: string; data: Buffer; weight: 400 | 500 }[]> };

/** Sentient (font situs) diunduh sekali dari Fontshare lalu disimpan di DATA_DIR/cache/fonts. */
async function loadFonts() {
  g.__qiranOgFonts ??= (async () => {
    const dir = path.join(/*turbopackIgnore: true*/ dataDir(), "cache", "fonts");
    fs.mkdirSync(dir, { recursive: true });
    const weights = [400, 500] as const;
    const files = weights.map((w) => path.join(/*turbopackIgnore: true*/ dir, `sentient-${w}.ttf`));
    if (!files.every((f) => fs.existsSync(f))) {
      const css = await (await fetch("https://api.fontshare.com/v2/css?f[]=sentient@400,500", { signal: AbortSignal.timeout(10_000) })).text();
      for (const [i, w] of weights.entries()) {
        const block = css.split("@font-face").find((b) => b.includes(`font-weight: ${w};`));
        const url = block?.match(/url\('([^']+\.ttf)'\)/)?.[1];
        if (!url) throw new Error(`Font Sentient ${w} tidak ditemukan`);
        const res = await fetch(url.startsWith("//") ? "https:" + url : url, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) throw new Error(`Gagal mengunduh font (${res.status})`);
        fs.writeFileSync(files[i], Buffer.from(await res.arrayBuffer()));
      }
    }
    return weights.map((w, i) => ({ name: "Sentient", data: fs.readFileSync(/*turbopackIgnore: true*/ files[i]), weight: w }));
  })().catch((err) => {
    g.__qiranOgFonts = undefined; // coba lagi di permintaan berikutnya
    throw err;
  });
  return g.__qiranOgFonts;
}

/* ---------- Render ---------- */

function titleSize(title: string, narrow: boolean): number {
  const n = title.length;
  const base = n <= 22 ? 88 : n <= 40 ? 74 : n <= 64 ? 60 : n <= 90 ? 52 : 46;
  return narrow ? Math.round(base * 0.86) : base;
}

async function photoUri(file: string): Promise<string> {
  const buf = await sharp(file).rotate().resize(PHOTO_WIDTH, OG_HEIGHT - BAND, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();
  return "data:image/jpeg;base64," + buf.toString("base64");
}

async function renderCard(post: OgPost, siteTitle: string): Promise<Buffer> {
  const i = cardInputs(post, siteTitle);
  const photo = i.photo ? await photoUri(i.photo) : null;
  const textWidth = photo ? OG_WIDTH - PHOTO_WIDTH : OG_WIDTH;

  const card = (
    <div style={{ width: OG_WIDTH, height: OG_HEIGHT, display: "flex", background: C.bg, color: C.ink, fontFamily: "Sentient", position: "relative" }}>
      <div style={{ width: textWidth, height: OG_HEIGHT - BAND, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 72px 56px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={MARK_URI} width={52} height={52} alt="" />
          <div style={{ marginLeft: 16, fontSize: 34, fontWeight: 500, letterSpacing: "-0.01em" }}>{i.siteTitle}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {i.kicker ? <div style={{ fontSize: 26, color: C.muted, marginBottom: 18 }}>{i.kicker}</div> : null}
          <div style={{ display: "block", fontSize: titleSize(i.title, !!photo), fontWeight: 500, lineHeight: 1.06, letterSpacing: "-0.025em", lineClamp: 4 }}>{i.title}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: C.muted, minHeight: 32 }}>{i.meta}</div>
      </div>
      {photo ? <img src={photo} width={PHOTO_WIDTH} height={OG_HEIGHT - BAND} style={{ objectFit: "cover" }} alt="" /> : null}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: OG_WIDTH, height: BAND, background: C.accent }} />
    </div>
  );

  const png = Buffer.from(await new ImageResponse(card, { width: OG_WIDTH, height: OG_HEIGHT, fonts: await loadFonts() }).arrayBuffer());
  return sharp(png).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/** Ambil dari cache, atau render lalu simpan. Versi lama untuk slug yang sama dihapus. */
export async function ogImageFor(post: OgPost, siteTitle: string): Promise<Buffer> {
  const dir = path.join(/*turbopackIgnore: true*/ dataDir(), "cache", "og");
  fs.mkdirSync(dir, { recursive: true });
  const version = ogVersion(post, siteTitle);
  const file = path.join(/*turbopackIgnore: true*/ dir, `${post.slug}-${version}.jpg`);
  if (fs.existsSync(file)) return fs.promises.readFile(file);

  const jpg = await renderCard(post, siteTitle);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmp, jpg);
  await fs.promises.rename(tmp, file);
  const stale = new RegExp(`^${post.slug.replace(/[^a-z0-9-]/gi, "")}-[0-9a-f]{10}\\.jpg$`);
  for (const name of fs.readdirSync(dir)) {
    if (name !== path.basename(file) && stale.test(name)) fs.rmSync(path.join(dir, name), { force: true });
  }
  return jpg;
}
