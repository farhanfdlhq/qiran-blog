import { getSessionUserFromCookie } from "@/lib/auth";
import { storeImage, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUserFromCookie();
  if (!user) return Response.json({ error: "Sesi berakhir. Silakan masuk lagi." }, { status: 401 });
  // Tolak unggahan dari situs lain (perlindungan CSRF tambahan selain cookie SameSite)
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") || h.get("host");
  if (origin && host && new URL(origin).host !== host) return Response.json({ error: "Asal permintaan tidak dikenal." }, { status: 403 });

  const len = Number(h.get("content-length") || 0);
  if (len > MAX_UPLOAD_BYTES + 1024 * 64) return Response.json({ error: "Ukuran gambar maksimal 12 MB." }, { status: 413 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Tidak ada gambar yang dipilih." }, { status: 400 });
    const url = await storeImage(Buffer.from(await file.arrayBuffer()), file.name);
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Gagal mengunggah gambar." }, { status: 422 });
  }
}
