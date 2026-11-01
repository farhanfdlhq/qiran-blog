"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkPosts } from "@/app/actions/admin";
import { useFeedback } from "@/components/Feedback";

export type Row = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published";
  scheduled: boolean;
  dateLabel: string;
  author: string;
  tags: string;
  views: number;
  pending: number;
};

/** Daftar tulisan dengan pilih banyak dan aksi massal (terbitkan, jadikan draf, hapus). */
export function PostsTable({ rows, showAuthor }: { rows: Row[]; showAuthor: boolean }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const lastClicked = useRef<number | null>(null);
  const { toast, confirm } = useFeedback();
  const router = useRouter();

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allOn = selected.size > 0 && selected.size === rows.length;
  const someOn = selected.size > 0 && !allOn;

  const toggle = (id: number, shift: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const on = !next.has(id);
      // Shift+klik memilih rentang dari pilihan terakhir
      if (shift && lastClicked.current !== null) {
        const a = allIds.indexOf(lastClicked.current), b = allIds.indexOf(id);
        for (const x of allIds.slice(Math.min(a, b), Math.max(a, b) + 1)) on ? next.add(x) : next.delete(x);
      } else on ? next.add(id) : next.delete(id);
      return next;
    });
    lastClicked.current = id;
  };

  const run = async (action: "publish" | "draft" | "delete", ids = [...selected]) => {
    if (!ids.length) return;
    const titles = rows.filter((r) => ids.includes(r.id)).map((r) => r.title || "Tanpa judul");
    if (action === "delete") {
      const res = await confirm({
        title: ids.length === 1 ? `Hapus “${titles[0]}”?` : `Hapus ${ids.length} tulisan?`,
        body: "Tulisan beserta komentar dan statistiknya ikut terhapus. Tidak bisa dibatalkan.",
        confirmLabel: ids.length === 1 ? "Hapus tulisan" : `Hapus ${ids.length} tulisan`,
        danger: true,
      });
      if (res !== "confirm") return;
    }
    if (action === "draft" && rows.some((r) => ids.includes(r.id) && r.status === "published" && !r.scheduled)) {
      const res = await confirm({
        title: "Sembunyikan dari pembaca?",
        body: "Tulisan yang sudah terbit akan ditarik jadi draf dan tidak bisa dibuka pembaca sampai diterbitkan lagi.",
        confirmLabel: "Jadikan draf",
      });
      if (res !== "confirm") return;
    }
    setBusy(true);
    try {
      const r = await bulkPosts(ids, action);
      toast(r.message ?? "Selesai.", r.ok ? "ok" : "err");
      if (r.ok) setSelected(new Set());
      router.refresh();
    } catch {
      toast("Gagal. Periksa koneksi lalu coba lagi.", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="list-tools">
        <label className="check">
          <input type="checkbox" checked={allOn} ref={(el) => { if (el) el.indeterminate = someOn; }}
            onChange={() => setSelected(allOn ? new Set() : new Set(allIds))} aria-label="Pilih semua tulisan" />
          {selected.size ? `${selected.size} dipilih` : "Pilih semua"}
        </label>
      </div>
      <ul className="list">
        {rows.map((p) => {
          const on = selected.has(p.id);
          const status = p.status === "draft" ? ["Draf", "status"] : p.scheduled ? ["Terjadwal", "status status-scheduled"] : ["Terbit", "status status-published"];
          return (
            <li className={`list-item list-item-select${on ? " is-selected" : ""}`} key={p.id}>
              <input type="checkbox" className="row-check" checked={on} aria-label={`Pilih “${p.title || "Tanpa judul"}”`}
                onChange={() => {}} onClick={(e) => toggle(p.id, e.shiftKey)} />
              <a className="list-title" href={`/admin/tulisan/${p.id}/`}>{p.title || "Tanpa judul"}</a>
              <div className="list-meta">
                <span className={status[1]}>{status[0]}</span>
                <span>{p.dateLabel}</span>
                {showAuthor && p.author ? <span>{p.author}</span> : null}
                {p.tags ? <span>{p.tags}</span> : null}
              </div>
              <div className="list-side">
                {p.pending ? <a className="badge" href="/admin/komentar/" title="Komentar menunggu">{p.pending}</a> : null}
                <span>{p.views} pembaca</span>
                {p.status === "published" && !p.scheduled ? <a className="textlink" href={`/${p.slug}/`} target="_blank" rel="noopener">Lihat</a> : null}
                <button type="button" className="textbtn row-delete" disabled={busy} onClick={() => run("delete", [p.id])} aria-label={`Hapus “${p.title || "Tanpa judul"}”`}>Hapus</button>
              </div>
            </li>
          );
        })}
      </ul>

      {selected.size ? (
        <div className="bulk-bar" role="region" aria-label="Aksi untuk tulisan terpilih">
          <span className="bulk-count">{selected.size} tulisan dipilih</span>
          <div className="bulk-actions">
            <button type="button" className="btn btn-small" disabled={busy} onClick={() => run("publish")}>Terbitkan</button>
            <button type="button" className="btn btn-small bulk-quiet" disabled={busy} onClick={() => run("draft")}>Jadikan draf</button>
            <button type="button" className="btn btn-small btn-danger-solid" disabled={busy} onClick={() => run("delete")}>Hapus</button>
            <button type="button" className="textbtn bulk-cancel" disabled={busy} onClick={() => setSelected(new Set())}>Batal pilih</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
