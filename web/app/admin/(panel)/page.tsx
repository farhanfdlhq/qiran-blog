import { requireUser } from "@/lib/auth";
import { listForAdmin, isScheduled, cleanupEmptyDrafts } from "@/lib/posts";
import { formatTanggal, formatWaktu } from "@/lib/time";
import { createDraft } from "@/app/actions/admin";
import { PostsTable, type Row } from "@/components/admin/PostsTable";

type Filter = "semua" | "draft" | "terbit" | "terjadwal";
const TABS: [Filter, string][] = [["semua", "Semua"], ["draft", "Draf"], ["terbit", "Terbit"], ["terjadwal", "Terjadwal"]];

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const raw = (await searchParams).status;
  const filter: Filter = TABS.some(([k]) => k === raw) ? (raw as Filter) : "semua";
  cleanupEmptyDrafts(user.id);
  const posts = listForAdmin(user, filter);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Tulisan</h1>
          <p className="admin-sub">{user.role === "admin" ? "Semua tulisan di blog." : "Tulisan milikmu."}</p>
        </div>
        <form action={createDraft}><button className="btn" type="submit">Tulis baru</button></form>
      </div>
      <nav className="tabs" aria-label="Saring tulisan">
        {TABS.map(([key, label]) => (
          <a key={key} href={key === "semua" ? "/admin/" : `/admin/?status=${key}`} aria-current={filter === key ? "page" : undefined}>{label}</a>
        ))}
      </nav>
      {posts.length ? (
        <PostsTable showAuthor={user.role === "admin"} rows={posts.map((p): Row => {
          const scheduled = isScheduled(p);
          return {
            id: p.id,
            title: p.title === "Tanpa judul" ? "" : p.title,
            slug: p.slug,
            status: p.status,
            scheduled,
            dateLabel: p.published_at ? (scheduled ? `Terbit ${formatTanggal(p.published_at)}, ${formatWaktu(p.published_at)}` : formatTanggal(p.published_at)) : `Diubah ${formatTanggal(p.updated_at)}`,
            author: p.author?.name ?? "",
            tags: p.tags.map((t) => t.name).join(", "),
            views: p.views,
            pending: p.pending_comments,
          };
        })} />
      ) : (
        <p className="empty">{filter === "semua" ? "Belum ada tulisan. Klik “Tulis baru” untuk mulai." : "Tidak ada tulisan di bagian ini."}</p>
      )}
    </>
  );
}
