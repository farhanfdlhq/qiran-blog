import { requireUser } from "@/lib/auth";
import { listForModeration, type CommentStatus } from "@/lib/comments";
import { formatTanggal, formatWaktu } from "@/lib/time";
import { ModerateButtons } from "@/components/admin/ModerateButtons";

const TABS: [CommentStatus, string][] = [["pending", "Menunggu"], ["approved", "Disetujui"], ["spam", "Spam"]];

export default async function CommentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const raw = (await searchParams).status;
  const status: CommentStatus = TABS.some(([k]) => k === raw) ? (raw as CommentStatus) : "pending";
  const items = listForModeration(user, status);
  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Komentar</h1>
          <p className="admin-sub">Komentar baru tampil di situs setelah kamu setujui.</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Saring komentar">
        {TABS.map(([k, label]) => (
          <a key={k} href={k === "pending" ? "/admin/komentar/" : `/admin/komentar/?status=${k}`} aria-current={status === k ? "page" : undefined}>{label}</a>
        ))}
      </nav>
      {items.length ? (
        <ul className="list">
          {items.map((c) => (
            <li className="list-item" key={c.id} style={{ gridTemplateColumns: "1fr" }}>
              <div className="list-meta">
                <strong style={{ color: "var(--ink)", fontWeight: 500 }}>{c.name}</strong>
                <span>{formatTanggal(c.created_at)}, {formatWaktu(c.created_at)}</span>
                <span>di <a className="textlink" href={`/${c.post_slug}/`} target="_blank" rel="noopener">{c.post_title}</a></span>
              </div>
              <p className="comment-body" style={{ margin: "6px 0 10px" }}>{c.body}</p>
              <ModerateButtons id={c.id} status={status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">{status === "pending" ? "Tidak ada komentar yang menunggu." : "Kosong."}</p>
      )}
    </>
  );
}
