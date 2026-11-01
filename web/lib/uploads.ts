/** Simpan gambar unggahan: diperkecil, dibuang metadata EXIF-nya, plus versi 720px dan 1400px. */
import sharp, { type Metadata } from "sharp";
import path from "node:path";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { uploadsDir } from "./db";
import { IMAGE_WIDTHS } from "./site";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "gif", "heif", "avif"]);

export async function storeImage(input: Buffer, originalName: string): Promise<string> {
  if (input.length > MAX_UPLOAD_BYTES) throw new Error("Ukuran gambar maksimal 12 MB.");
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new Error("File bukan gambar yang bisa dibaca.");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new Error("Format harus JPG, PNG, WebP, GIF, atau HEIC.");

  const now = new Date();
  const sub = path.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
  const dir = path.join(uploadsDir(), sub);
  fs.mkdirSync(dir, { recursive: true });

  const base = (path.parse(originalName).name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "gambar") + "-" + randomBytes(3).toString("hex");
  const keepPng = meta.format === "png" && meta.hasAlpha;
  const ext = keepPng ? "png" : "jpg";
  const pipeline = (width: number) => {
    const img = sharp(input, { animated: false }).rotate().resize({ width, withoutEnlargement: true });
    return keepPng ? img.png({ compressionLevel: 9 }) : img.flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true });
  };

  await pipeline(2000).toFile(path.join(dir, `${base}.${ext}`));
  for (const w of IMAGE_WIDTHS) await pipeline(w).toFile(path.join(dir, `${base}-w${w}.${ext}`));
  return `/uploads/${sub.split(path.sep).join("/")}/${base}.${ext}`;
}
