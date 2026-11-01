import { getPostById } from "@/lib/posts";
import { recordView } from "@/lib/stats";
import { clientIp, userAgent } from "@/lib/auth";
import { nowIso } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { id?: unknown };
    const id = Number(body.id);
    const post = Number.isInteger(id) ? getPostById(id) : null;
    if (post && post.type === "post" && post.status === "published" && post.published_at && post.published_at <= nowIso()) {
      recordView(id, await clientIp(), await userAgent());
    }
  } catch {
    // abaikan permintaan yang rusak
  }
  return new Response(null, { status: 204 });
}
