"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { editorExtensions } from "@/lib/editor-schema";
import { saveFromEditor, deletePostAction, type EditorPayload } from "@/app/actions/admin";

type Initial = {
  id: number;
  type: "post" | "page";
  title: string;
  slug: string;
  excerpt: string;
  json: unknown;
  html: string;
  tags: string;
  featureImage: string;
  featureImageAlt: string;
  featureImageCaption: string;
  allowComments: boolean;
  publishAt: string;
  status: "draft" | "published";
  scheduled: boolean;
  authorName: string;
};

async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/upload/", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "Gagal mengunggah gambar.");
  return data.url;
}

function nowWibInput() {
  const t = new Date(Date.now() + 7 * 3600_000);
  return t.toISOString().slice(0, 16);
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      quote: e.isActive("blockquote"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      mark: e.isActive("highlight"),
      link: e.isActive("link"),
    }),
  });
  const btn = (label: string, title: string, on: boolean, run: () => void) => (
    <button type="button" className={`tool${on ? " is-on" : ""}`} title={title} aria-label={title} aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={run}>{label}</button>
  );
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Alamat tautan (kosongkan untuk menghapus):", prev ?? "https://");
    if (url === null) return;
    if (!url || url === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  return (
    <div className="toolbar" role="toolbar" aria-label="Format tulisan">
      {btn("B", "Tebal (Ctrl+B)", s.bold, () => editor.chain().focus().toggleBold().run())}
      {btn("I", "Miring (Ctrl+I)", s.italic, () => editor.chain().focus().toggleItalic().run())}
      {btn("Stabilo", "Tandai dengan stabilo", s.mark, () => editor.chain().focus().toggleHighlight().run())}
      <span className="tool-sep" />
      {btn("Judul", "Subjudul besar", s.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {btn("Subjudul", "Subjudul kecil", s.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      {btn("Kutipan", "Kutipan", s.quote, () => editor.chain().focus().toggleBlockquote().run())}
      {btn("• Daftar", "Daftar berpoin", s.bullet, () => editor.chain().focus().toggleBulletList().run())}
      {btn("1. Daftar", "Daftar bernomor", s.ordered, () => editor.chain().focus().toggleOrderedList().run())}
      <span className="tool-sep" />
      {btn("Tautan", "Tautan", s.link, setLink)}
      {btn("Gambar", "Sisipkan gambar", false, onImage)}
      {btn("* * *", "Garis pemisah", false, () => editor.chain().focus().setHorizontalRule().run())}
      <span className="tool-sep" />
      {btn("Urungkan", "Urungkan (Ctrl+Z)", false, () => editor.chain().focus().undo().run())}
      {btn("Ulangi", "Ulangi (Ctrl+Shift+Z)", false, () => editor.chain().focus().redo().run())}
    </div>
  );
}

export function PostEditor({ initial }: { initial: Initial }) {
  const isPage = initial.type === "page";
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [tags, setTags] = useState(initial.tags);
  const [cover, setCover] = useState(initial.featureImage);
  const [coverAlt, setCoverAlt] = useState(initial.featureImageAlt);
  const [coverCaption, setCoverCaption] = useState(initial.featureImageCaption);
  const [allowComments, setAllowComments] = useState(initial.allowComments);
  const [publishAt, setPublishAt] = useState(initial.publishAt);
  const [status, setStatus] = useState(initial.status);
  const [scheduled, setScheduled] = useState(initial.scheduled);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [...editorExtensions(), Placeholder.configure({ placeholder: "Mulai menulis di sini…" })],
    content: (initial.json as object) ?? initial.html ?? "",
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose", "aria-label": "Isi tulisan" } },
    onUpdate: () => setDirty(true),
  });

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const save = useCallback(
    async (intent: EditorPayload["intent"]) => {
      if (!editor) return;
      setSaving(true);
      setMessage(null);
      const payload: EditorPayload = {
        id: initial.id,
        title,
        slug: slugTouched ? slug : "",
        excerpt,
        json: editor.getJSON(),
        tags: isPage ? [] : tags.split(",").map((t) => t.trim()).filter(Boolean),
        featureImage: cover,
        featureImageAlt: coverAlt,
        featureImageCaption: coverCaption,
        allowComments,
        publishAt,
        intent,
      };
      try {
        const res = await saveFromEditor(payload);
        setMessage({ ok: res.ok, text: res.message });
        if (res.ok) {
          setDirty(false);
          if (res.status) setStatus(res.status);
          if (res.slug) setSlug(res.slug);
          setScheduled(!!(res.status === "published" && res.publishedAt && res.publishedAt > new Date().toISOString()));
        }
      } catch {
        setMessage({ ok: false, text: "Gagal menyimpan. Periksa koneksi internet lalu coba lagi." });
      } finally {
        setSaving(false);
      }
    },
    [editor, initial.id, title, slug, slugTouched, excerpt, tags, cover, coverAlt, coverCaption, allowComments, publishAt, isPage],
  );

  // Simpan otomatis untuk draf, 4 detik setelah berhenti mengetik
  useEffect(() => {
    if (!dirty || status !== "draft" || saving) return;
    const t = setTimeout(() => save("save"), 4000);
    return () => clearTimeout(t);
  }, [dirty, status, saving, save, title, excerpt, tags]);

  // Ctrl/Cmd+S untuk menyimpan, dan peringatan kalau keluar sebelum tersimpan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save("save");
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [dirty, save]);

  // Tinggi kolom judul mengikuti isi (dihitung ulang setelah huruf dimuat dan saat layar berubah)
  useEffect(() => {
    const fit = () => {
      const el = titleRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [title]);

  const onPickImage = async (file: File | undefined, target: "body" | "cover") => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const url = await uploadImage(file);
      if (target === "cover") {
        setCover(url);
        setDirty(true);
      } else {
        const alt = window.prompt("Deskripsi singkat gambar (untuk pembaca yang tidak bisa melihat gambar):", "") ?? "";
        editor?.chain().focus().setImage({ src: url, alt }).run();
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Gagal mengunggah gambar." });
    } finally {
      setUploading(false);
    }
  };

  const future = publishAt && publishAt > nowWibInput();
  const statusLabel = status === "draft" ? "Draf" : scheduled ? "Terjadwal" : "Terbit";
  const saveState = saving ? "Menyimpan…" : uploading ? "Mengunggah gambar…" : dirty ? "Belum tersimpan" : "Tersimpan";

  return (
    <div style={{ margin: "-36px calc(-1 * clamp(20px, 4vw, 56px)) -80px" }}>
      <div className="editor-bar">
        <a className="textlink" href={isPage ? "/admin/" : "/admin/"}>&larr; Kembali</a>
        <span className={`status${status === "published" ? (scheduled ? " status-scheduled" : " status-published") : ""}`}>{statusLabel}</span>
        <span className="save-state" role="status" aria-live="polite">{saveState}</span>
        <span className="spacer" />
        <a className="btn btn-quiet btn-small" href={`/${slug}/`} target="_blank" rel="noopener">Pratinjau</a>
        {status === "draft" ? (
          <>
            <button className="btn btn-quiet btn-small" type="button" disabled={saving} onClick={() => save("save")}>Simpan draf</button>
            <button className="btn btn-small" type="button" disabled={saving} onClick={() => save("publish")}>{future ? "Jadwalkan" : "Terbitkan"}</button>
          </>
        ) : (
          <>
            <button className="btn btn-quiet btn-small" type="button" disabled={saving} onClick={() => save("unpublish")}>{scheduled ? "Batalkan jadwal" : "Tarik jadi draf"}</button>
            <button className="btn btn-small" type="button" disabled={saving} onClick={() => save("publish")}>Perbarui</button>
          </>
        )}
      </div>

      <div className="editor-wrap">
        <div className="editor-doc">
          <div className="editor-doc-inner">
            {message ? <p className={`form-msg ${message.ok ? "ok" : "err"}`} role="status" style={{ marginBottom: 20 }}>{message.text}</p> : null}

            <div className="cover">
              {cover ? <img src={cover} alt={coverAlt || "Gambar sampul"} /> : null}
              <div className="cover-actions">
                <button className="btn btn-quiet btn-small" type="button" onClick={() => coverInput.current?.click()} disabled={uploading}>
                  {cover ? "Ganti gambar sampul" : "Tambah gambar sampul"}
                </button>
                {cover ? <button className="btn btn-quiet btn-small" type="button" onClick={() => touch(setCover)("")}>Hapus sampul</button> : null}
              </div>
              <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => { onPickImage(e.target.files?.[0], "cover"); e.target.value = ""; }} />
            </div>

            <textarea ref={titleRef} className="editor-title" rows={1} placeholder="Judul tulisan" value={title} aria-label="Judul"
              onChange={(e) => touch(setTitle)(e.target.value.replace(/\n/g, " "))} />

            {editor ? <Toolbar editor={editor} onImage={() => imageInput.current?.click()} /> : null}
            <input ref={imageInput} type="file" accept="image/*" hidden onChange={(e) => { onPickImage(e.target.files?.[0], "body"); e.target.value = ""; }} />
            <EditorContent editor={editor} />
          </div>
        </div>

        <aside className="editor-side" aria-label="Pengaturan tulisan">
          <h3>Pengaturan</h3>
          {!isPage ? (
            <div className="field">
              <label htmlFor="tags">Topik</label>
              <input id="tags" value={tags} onChange={(e) => touch(setTags)(e.target.value)} placeholder="Opini, Cerita" aria-describedby="tags-hint" />
              <p className="hint" id="tags-hint">Pisahkan dengan koma. Topik pertama tampil di daftar tulisan.</p>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="excerpt">Ringkasan</label>
            <textarea id="excerpt" value={excerpt} maxLength={300} onChange={(e) => touch(setExcerpt)(e.target.value)} aria-describedby="excerpt-hint" style={{ minHeight: 100 }} />
            <p className="hint" id="excerpt-hint">Satu atau dua kalimat. Tampil di beranda dan saat dibagikan ke WhatsApp. Kosongkan untuk memakai awal tulisan.</p>
          </div>
          {!isPage ? (
            <div className="field">
              <label htmlFor="publishAt">Tanggal terbit (WIB)</label>
              <input id="publishAt" type="datetime-local" value={publishAt} onChange={(e) => touch(setPublishAt)(e.target.value)} aria-describedby="publish-hint" />
              <p className="hint" id="publish-hint">Kosongkan untuk terbit sekarang. Isi tanggal yang akan datang untuk menjadwalkan.</p>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="slug">Alamat (URL)</label>
            <input id="slug" value={slug} onChange={(e) => { setSlugTouched(true); touch(setSlug)(e.target.value); }} aria-describedby="slug-hint" />
            <p className="hint" id="slug-hint">qiran.my.id/{slug || "…"}/</p>
          </div>
          {cover ? (
            <>
              <div className="field">
                <label htmlFor="alt">Deskripsi gambar sampul</label>
                <input id="alt" value={coverAlt} maxLength={200} onChange={(e) => touch(setCoverAlt)(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="caption">Keterangan di bawah gambar</label>
                <input id="caption" value={coverCaption} maxLength={300} onChange={(e) => touch(setCoverCaption)(e.target.value)} placeholder="Foto: nama fotografer" />
              </div>
            </>
          ) : null}
          {!isPage ? (
            <label className="check">
              <input type="checkbox" checked={allowComments} onChange={(e) => touch(setAllowComments)(e.target.checked)} />
              Izinkan komentar
            </label>
          ) : null}
          {initial.authorName ? <p className="hint">Penulis: {initial.authorName}</p> : null}
          {!isPage ? (
            <form action={deletePostAction} onSubmit={(e) => { if (!window.confirm("Hapus tulisan ini? Tidak bisa dibatalkan.")) e.preventDefault(); }}>
              <input type="hidden" name="id" value={initial.id} />
              <button className="btn btn-danger btn-small" type="submit">Hapus tulisan</button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
