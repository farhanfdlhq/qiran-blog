"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BULAN_ID, SOURCE_TYPES, formatSource, newSourceId, referencesHtml, type Source, type SourceType } from "@/lib/references";
import { validateForm } from "@/lib/validate";
import { useFeedback } from "@/components/Feedback";
import { Select } from "./Select";
import { DateTimeField } from "./DateTimeField";

/** Satu baris pustaka sebagai HTML aman (teks di-escape, *x* jadi miring). */
function lineHtml(s: Source) {
  return referencesHtml(formatSource(s)).replace(/^<li>|<\/li>$/g, "");
}

/** Kolom yang tampil untuk setiap jenis sumber, mirip dialog "Add New Source" di Word. */
const SHOW: Record<SourceType, { date: "full" | "year"; title: string; container?: string; containerHint?: string; extra?: ("edition" | "volume" | "issue" | "pages")[]; url: string; accessed?: boolean }> = {
  berita: { date: "full", title: "Judul berita", container: "Nama media", containerHint: "Misalnya: RMOL, detikNews, Kompas.com", url: "Alamat (URL)" },
  web: { date: "full", title: "Judul halaman", container: "Nama situs", containerHint: "Kosongkan kalau sama dengan penulis, misalnya WHO di situs WHO.", url: "Alamat (URL)", accessed: true },
  buku: { date: "year", title: "Judul buku", container: "Penerbit", containerHint: "Misalnya: Bentang Pustaka", extra: ["edition"], url: "DOI atau URL (opsional)" },
  jurnal: { date: "year", title: "Judul artikel", container: "Nama jurnal", extra: ["volume", "issue", "pages"], url: "DOI atau URL" },
  foto: { date: "full", title: "Judul atau keterangan foto", container: "Situs atau lembaga", containerHint: "Misalnya: ANTARA Foto. Kosongkan kalau sama dengan penulis.", url: "Alamat (URL)" },
  video: { date: "full", title: "Judul video", container: "Platform", containerHint: "Misalnya: YouTube", url: "Alamat (URL)" },
  manual: { date: "year", title: "", url: "" },
};

const EXTRA_LABEL = { edition: "Edisi", volume: "Volume", issue: "Nomor", pages: "Halaman" } as const;

function SourceDialog({ initial, onSave, onClose }: { initial: Source; onSave: (s: Source) => void; onClose: () => void }) {
  const [s, setS] = useState<Source>(initial);
  const ref = useRef<HTMLDialogElement>(null);
  const set = (patch: Partial<Source>) => setS((x) => ({ ...x, ...patch }));
  const cfg = SHOW[s.type];
  const isNew = !initial.title && !initial.text && !initial.authors;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const text = (key: keyof Source, label: string, opts: { hint?: string; placeholder?: string; required?: boolean; type?: string; inputMode?: "numeric" } = {}) => (
    <div className="field">
      <label htmlFor={`src-${key}`}>{label}</label>
      <input id={`src-${key}`} type={opts.type ?? "text"} value={(s[key] as string) ?? ""} onChange={(e) => set({ [key]: e.target.value })}
        placeholder={opts.placeholder} required={opts.required} inputMode={opts.inputMode} aria-describedby={opts.hint ? `src-${key}-hint` : undefined} />
      {opts.hint ? <p className="hint" id={`src-${key}-hint`}>{opts.hint}</p> : null}
    </div>
  );

  return (
    <dialog ref={ref} className="dialog dialog-wide" onClose={onClose} aria-labelledby="src-dialog-title">
      <form className="form source-form" noValidate onSubmit={(e) => {
        e.preventDefault();
        if (!validateForm(e.currentTarget)) return;
        onSave(s);
      }}>
        <h2 className="dialog-title" id="src-dialog-title">{isNew ? "Tambah sumber" : "Ubah sumber"}</h2>
        <div className="field">
          <label htmlFor="src-type">Jenis sumber</label>
          <Select id="src-type" value={s.type} onChange={(v) => set({ type: v as SourceType })} options={SOURCE_TYPES.map((t) => ({ value: t.value, label: t.label, hint: t.hint }))} />
        </div>

        {s.type === "manual" ? (
          <div className="field">
            <label htmlFor="src-text">Isi lengkap</label>
            <textarea id="src-text" value={s.text ?? ""} onChange={(e) => set({ text: e.target.value })} required style={{ minHeight: 110 }}
              placeholder="Nugroho, A. (2026, 23 Januari). *Judul berita*. RMOL. https://..." aria-describedby="src-text-hint" />
            <p className="hint" id="src-text-hint">Tulis sesuai gaya APA. Apit judul dengan *bintang* supaya miring.</p>
          </div>
        ) : (
          <>
            <div className="field">
              <label htmlFor="src-authors">Penulis</label>
              <textarea id="src-authors" value={s.authors ?? ""} onChange={(e) => set({ authors: e.target.value })} rows={2} style={{ minHeight: 64 }}
                placeholder={s.corporate ? "World Health Organization" : "Agus Nugroho"} aria-describedby="src-authors-hint" />
              <p className="hint" id="src-authors-hint">
                {s.corporate ? "Nama lembaga ditulis lengkap." : "Nama lengkap, satu orang per baris. Otomatis ditulis Nugroho, A."} Kosongkan kalau tidak ada penulis.
              </p>
            </div>
            <label className="check">
              <input type="checkbox" checked={!!s.corporate} onChange={(e) => set({ corporate: e.target.checked })} />
              Penulis berupa lembaga atau organisasi
            </label>
            <div className="form-row source-date">
              {text("year", "Tahun", { placeholder: "2026", inputMode: "numeric", hint: cfg.accessed ? "Kosongkan kalau halaman tidak bertanggal." : undefined })}
              {cfg.date === "full" ? (
                <>
                  <div className="field">
                    <label htmlFor="src-month">Bulan</label>
                    <Select id="src-month" value={s.month ?? ""} onChange={(v) => set({ month: v })} options={[{ value: "", label: "Tidak ada" }, ...BULAN_ID.map((b, i) => ({ value: String(i + 1), label: b }))]} />
                  </div>
                  <div className="field">
                    <label htmlFor="src-day">Tanggal</label>
                    <Select id="src-day" value={s.day ?? ""} onChange={(v) => set({ day: v })} options={[{ value: "", label: "Tidak ada" }, ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))]} />
                  </div>
                </>
              ) : null}
            </div>
            {text("title", cfg.title, { required: true })}
            {cfg.container ? text("container", cfg.container, { hint: cfg.containerHint }) : null}
            {cfg.extra ? <div className="form-row">{cfg.extra.map((k) => <div key={k}>{text(k, EXTRA_LABEL[k], { placeholder: k === "pages" ? "45–67" : k === "edition" ? "2" : "" })}</div>)}</div> : null}
            {text("url", cfg.url, { type: "url", placeholder: "https://" })}
            {cfg.accessed && !s.year ? (
              <div className="field">
                <label htmlFor="src-accessed">Tanggal diakses</label>
                <DateTimeField id="src-accessed" dateOnly value={s.accessed ?? ""} onChange={(v) => set({ accessed: v })} placeholder="Kapan kamu membuka halaman ini" />
              </div>
            ) : null}
          </>
        )}

        <div className="source-preview" aria-live="polite">
          <p className="hint">Hasilnya di Daftar Pustaka:</p>
          <p className="source-preview-text" dangerouslySetInnerHTML={{ __html: formatSource(s) ? lineHtml(s) : "<span class='hint'>Isi kolom di atas untuk melihat hasilnya.</span>" }} />
        </div>

        <div className="btn-row">
          <button className="btn btn-small" type="submit">{isNew ? "Tambahkan" : "Simpan"}</button>
          <button className="btn btn-quiet btn-small" type="button" onClick={onClose}>Batal</button>
        </div>
      </form>
    </dialog>
  );
}

/** Daftar Pustaka di editor: daftar sumber dengan Tambah, Ubah, dan Hapus. */
export function References({ value, onChange }: { value: Source[]; onChange: (v: Source[]) => void }) {
  const [editing, setEditing] = useState<Source | null>(null);
  const { confirm } = useFeedback();
  const sorted = [...value].sort((a, b) => formatSource(a).replace(/\*/g, "").localeCompare(formatSource(b).replace(/\*/g, ""), "id"));

  return (
    <div className="refs-field">
      {sorted.length ? (
        <ol className="refs-items">
          {sorted.map((s) => (
            <li key={s.id} className="refs-item">
              <p className="refs-text" dangerouslySetInnerHTML={{ __html: lineHtml(s) }} />
              <div className="refs-actions">
                <button type="button" className="textbtn" onClick={() => setEditing(s)}>Ubah</button>
                <button type="button" className="textbtn row-delete" onClick={async () => {
                  const r = await confirm({ title: "Hapus sumber ini?", body: formatSource(s).replace(/\*/g, "").slice(0, 140), confirmLabel: "Hapus", danger: true });
                  if (r === "confirm") onChange(value.filter((x) => x.id !== s.id));
                }}>Hapus</button>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="hint">Belum ada sumber.</p>}
      <button type="button" className="btn btn-quiet btn-small" onClick={() => setEditing({ id: newSourceId(), type: "berita" })}>+ Tambah sumber</button>
      {editing ? createPortal(
        <SourceDialog initial={editing} onClose={() => setEditing(null)} onSave={(s) => {
          const exists = value.some((x) => x.id === s.id);
          onChange(exists ? value.map((x) => (x.id === s.id ? s : x)) : [...value, s]);
          setEditing(null);
        }} />,
        document.body,
      ) : null}
    </div>
  );
}
