import fs from "node:fs";
import path from "node:path";
import { uploadsDir } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const root = uploadsDir();
  const file = path.resolve(/*turbopackIgnore: true*/ root, ...parts);
  // Cegah path traversal: file harus tetap di dalam folder uploads
  if (!file.startsWith(root + path.sep)) return new Response("Tidak ditemukan", { status: 404 });
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type || !fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response("Tidak ditemukan", { status: 404 });
  const data = await fs.promises.readFile(file);
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
