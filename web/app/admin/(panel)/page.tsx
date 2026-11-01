import { requireUser } from "@/lib/auth";
import { listForAdmin, isScheduled, cleanupEmptyDrafts } from "@/lib/posts";
import { formatTanggal, formatWaktu } from "@/lib/time";
import { createDraft } from "@/app/actions/admin";

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
        <ul className="list">
          {posts.map((p) => {
            const scheduled = isScheduled(p);
            const status = p.status === "draft" ? ["Draf", "status"] : scheduled ? ["Terjadwal", "status status-scheduled"] : ["Terbit", "status status-published"];
            return (
              <li className="list-item" key={p.id}>
                <a className="list-title" href={`/admin/tulisan/${p.id}/`}>{p.title || "Tanpa judul"}</a>
                <div className="list-meta">
                  <span className={status[1]}>{status[0]}</span>
                  {p.published_at ? <span>{scheduled ? `Terbit ${formatTanggal(p.published_at)}, ${formatWaktu(p.published_at)}` : formatTanggal(p.published_at)}</span> : <span>Diubah {formatTanggal(p.updated_at)}</span>}
                  {user.role === "admin" && p.author ? <span>{p.author.name}</span> : null}
                  {p.tags[0] ? <span>{p.tags.map((t) => t.name).join(", ")}</span> : null}
                </div>
                <div className="list-side">
                  {p.pending_comments ? <a className="badge" href="/admin/komentar/" title="Komentar menunggu">{p.pending_comments}</a> : null}
                  <span>{p.views} pembaca</span>
                  {p.status === "published" && !scheduled ? <a className="textlink" href={`/${p.slug}/`} target="_blank" rel="noopener">Lihat</a> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty">{filter === "semua" ? "Belum ada tulisan. Klik “Tulis baru” untuk mulai." : "Tidak ada tulisan di bagian ini."}</p>
      )}
    </>
  );
}
