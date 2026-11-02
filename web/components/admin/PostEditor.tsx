"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { editorExtensions } from "@/lib/editor-schema";
import { slugify } from "@/lib/text";
import { saveFromEditor, deletePostAction, type EditorPayload } from "@/app/actions/admin";
import { FormDialog } from "./Dialog";
import { ConfirmButton } from "./ConfirmButton";
import { TagInput } from "./TagInput";
import { useFeedback } from "@/components/Feedback";

type Initial = {
  id: number;
  type: "post" | "page";
  title: string;
  slug: string;
  slugLocked: boolean; // pernah terbit: alamat tidak ikut berubah saat judul diganti
  excerpt: string;
  html: string;
  tags: string[];
  tagSuggestions: { name: string; count: number }[];
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
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 16);
}

function Toolbar({ editor, onLink, onImage }: { editor: Editor; onLink: () => void; onImage: () => void }) {
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
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const btn = (label: React.ReactNode, title: string, on: boolean, run: () => void, disabled = false) => (
    <button type="button" className={`tool${on ? " is-on" : ""}`} title={title} aria-label={title} aria-pressed={on} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={run}>{label}</button>
  );
  return (
    <div className="toolbar" role="toolbar" aria-label="Format tulisan">
      {btn(<b>B</b>, "Tebal (Ctrl+B)", s.bold, () => editor.chain().focus().toggleBold().run())}
      {btn(<i>I</i>, "Miring (Ctrl+I)", s.italic, () => editor.chain().focus().toggleItalic().run())}
      {btn("Stabilo", "Tandai dengan stabilo", s.mark, () => editor.chain().focus().toggleHighlight().run())}
      <span className="tool-sep" aria-hidden="true" />
      {btn("Judul", "Subjudul besar", s.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {btn("Subjudul", "Subjudul kecil", s.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      {btn("Kutipan", "Kutipan", s.quote, () => editor.chain().focus().toggleBlockquote().run())}
      {btn("• Daftar", "Daftar berpoin", s.bullet, () => editor.chain().focus().toggleBulletList().run())}
      {btn("1. Daftar", "Daftar bernomor", s.ordered, () => editor.chain().focus().toggleOrderedList().run())}
      <span className="tool-sep" aria-hidden="true" />
      {btn("Tautan", "Tambah atau ubah tautan", s.link, onLink)}
      {btn("Gambar", "Sisipkan gambar", false, onImage)}
      {btn("* * *", "Garis pemisah", false, () => editor.chain().focus().setHorizontalRule().run())}
      <span className="tool-sep" aria-hidden="true" />
      {btn("Urungkan", "Urungkan (Ctrl+Z)", false, () => editor.chain().focus().undo().run(), !s.canUndo)}
      {btn("Ulangi", "Ulangi (Ctrl+Shift+Z)", false, () => editor.chain().focus().redo().run(), !s.canRedo)}
    </div>
  );
}

export function PostEditor({ initial }: { initial: Initial }) {
  const isPage = initial.type === "page";
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugLocked, setSlugLocked] = useState(initial.slugLocked);
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
  const [saveFailed, setSaveFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [words, setWords] = useState(0);
  const [dialog, setDialog] = useState<null | { kind: "link"; href: string } | { kind: "image"; url: string }>(null);
  const { toast, confirm } = useFeedback();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [...editorExtensions(), Placeholder.configure({ placeholder: isPage ? "Ceritakan tentang blog ini…" : "Mulai menulis di sini…" })],
    content: initial.html || "",
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose", "aria-label": "Isi tulisan", "aria-multiline": "true", role: "textbox" } },
    onCreate: ({ editor: e }) => setWords(e.getText().split(/\s+/).filter(Boolean).length),
    onUpdate: ({ editor: e }) => {
      setDirty(true);
      setSaveFailed(false);
      setWords(e.getText().split(/\s+/).filter(Boolean).length);
    },
  });

  // Alamat mengikuti judul sampai diisi sendiri atau tulisan pernah terbit
  const shownSlug = slugTouched || slugLocked ? slug : slugify(title || "tanpa judul");

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
    setSaveFailed(false);
  };

  const save = useCallback(
    async (intent: EditorPayload["intent"]): Promise<boolean> => {
      if (!editor) return false;
      if (intent === "publish" && editor.isEmpty) {
        toast("Isi tulisan masih kosong.", "err");
        return false;
      }
      if (intent === "publish" && !title.trim()) {
        toast("Judul wajib diisi sebelum terbit.", "err");
        titleRef.current?.focus();
        return false;
      }
      setSaving(true);
      const payload: EditorPayload = {
        id: initial.id,
        title,
        slug: slugTouched ? slug : "",
        excerpt,
        html: editor.isEmpty ? "" : editor.getHTML(),
        tags: isPage ? [] : tags,
        featureImage: cover,
        featureImageAlt: coverAlt,
        featureImageCaption: coverCaption,
        allowComments,
        publishAt,
        intent,
      };
      try {
        const res = await saveFromEditor(payload);
        if (!res.ok) {
          toast(res.message, "err");
          setSaveFailed(true);
          return false;
        }
        setSaveFailed(false);
        if (intent !== "save") toast(res.message);
        if (res.ok) {
          setDirty(false);
          if (res.status) setStatus(res.status);
          if (res.slug) setSlug(res.slug);
          if (res.status === "published") setSlugLocked(true);
          setScheduled(!!(res.status === "published" && res.publishedAt && res.publishedAt > new Date().toISOString()));
        }
      } catch {
        toast("Gagal menyimpan. Periksa koneksi internet lalu coba lagi.", "err");
        setSaveFailed(true);
        return false;
      } finally {
        setSaving(false);
      }
      return true;
    },
    [editor, initial.id, title, slug, slugTouched, excerpt, tags, cover, coverAlt, coverCaption, allowComments, publishAt, isPage, toast],
  );

  // Simpan otomatis untuk draf, 4 detik setelah berhenti mengetik
  useEffect(() => {
    if (!dirty || status !== "draft" || saving || saveFailed) return;
    const t = setTimeout(() => save("save"), 4000);
    return () => clearTimeout(t);
  }, [dirty, status, saving, saveFailed, save, title, excerpt, tags]);

  // Ctrl/Cmd+S untuk menyimpan, dan peringatan kalau keluar sebelum tersimpan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save("save").then((ok) => ok && toast(status === "draft" ? "Draf tersimpan." : "Perubahan disimpan dan sudah tampil di situs."));
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
  }, [dirty, save, toast, status]);

  // Pindah halaman di dalam panel saat belum tersimpan: tanya dulu lewat dialog qiran.
  // (Menutup tab atau refresh tetap memakai peringatan bawaan browser, yang tidak bisa diganti situs mana pun.)
  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      if (!dirty || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || !a.href || a.origin !== location.origin) return;
      e.preventDefault();
      const res = await confirm({
        title: "Perubahan belum tersimpan",
        body: "Simpan dulu sebelum pindah halaman?",
        confirmLabel: "Simpan lalu pindah",
        altLabel: "Pindah tanpa menyimpan",
        cancelLabel: "Tetap di sini",
      });
      if (res === "cancel") return;
      if (res === "confirm" && !(await save("save"))) return;
      setDirty(false);
      location.href = a.href;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, confirm, save]);

  // Tinggi kolom judul mengikuti isi
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
    try {
      const url = await uploadImage(file);
      if (target === "cover") {
        setCover(url);
        setDirty(true);
      } else {
        setDialog({ kind: "image", url });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengunggah gambar.", "err");
    } finally {
      setUploading(false);
    }
  };

  const future = !!publishAt && publishAt > nowWibInput();
  const statusLabel = status === "draft" ? "Draf" : scheduled ? "Terjadwal" : "Terbit";
  const saveState = saving ? "Menyimpan…" : uploading ? "Mengunggah gambar…" : saveFailed ? "Gagal menyimpan" : dirty ? "Belum tersimpan" : "Tersimpan";

  return (
    <div className="editor-shell">
      <div className="editor-bar">
        <a className="textlink editor-back" href="/admin/" aria-label="Kembali ke daftar tulisan">&larr;<span className="editor-back-label"> Kembali</span></a>
        <span className={`status${status === "published" ? (scheduled ? " status-scheduled" : " status-published") : ""}`}>{statusLabel}</span>
        <span className={`save-state${saveFailed ? " is-error" : ""}`} role="status" aria-live="polite">{saveState}</span>
        {saveFailed ? <button type="button" className="textbtn" onClick={() => save("save").then((ok) => ok && toast("Tersimpan."))}>Coba lagi</button> : null}
        <span className="spacer" />
        <a className="btn btn-quiet btn-small" href={`/${shownSlug}/`} target="_blank" rel="noopener"
          onClick={(e) => { if (dirty) { e.preventDefault(); const w = window.open("about:blank", "_blank"); save("save").then((ok) => { if (w) { if (ok) w.location.href = `/${shownSlug}/`; else w.close(); } }); } }}>Pratinjau</a>
        <div className="editor-actions">
        {status === "draft" ? (
          <>
            <button className="btn btn-quiet btn-small" type="button" disabled={saving} onClick={() => save("save").then((ok) => ok && toast("Draf tersimpan."))}>Simpan draf</button>
            <button className="btn btn-small" type="button" disabled={saving} onClick={() => save("publish")}>{future ? "Jadwalkan" : "Terbitkan"}</button>
          </>
        ) : (
          <>
            <button className="btn btn-quiet btn-small" type="button" disabled={saving} onClick={() => save("unpublish")}>{scheduled ? "Batalkan jadwal" : "Tarik jadi draf"}</button>
            <button className="btn btn-small" type="button" disabled={saving} onClick={() => save("publish")}>Perbarui</button>
          </>
        )}
        </div>
      </div>

      <div className="editor-wrap">
        <div className="editor-doc">
          <div className="editor-doc-inner">

            <div className="cover">
              {cover ? <img src={cover} alt={coverAlt || "Gambar sampul"} /> : null}
              <div className="cover-actions">
                <button className="btn btn-quiet btn-small" type="button" onClick={() => coverInput.current?.click()} disabled={uploading}>
                  {uploading ? "Mengunggah…" : cover ? "Ganti gambar sampul" : "Tambah gambar sampul"}
                </button>
                {cover ? <button className="btn btn-quiet btn-small" type="button" onClick={() => touch(setCover)("")}>Hapus sampul</button> : null}
              </div>
              <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" hidden
                onChange={(e) => { onPickImage(e.target.files?.[0], "cover"); e.target.value = ""; }} />
            </div>

            <textarea ref={titleRef} className="editor-title" rows={1} placeholder={isPage ? "Judul halaman" : "Judul tulisan"} value={title} aria-label="Judul" maxLength={160}
              onChange={(e) => touch(setTitle)(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start"); } }} />

            {editor ? (
              <Toolbar editor={editor}
                onLink={() => setDialog({ kind: "link", href: (editor.getAttributes("link").href as string | undefined) ?? "" })}
                onImage={() => imageInput.current?.click()} />
            ) : null}
            <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" hidden
              onChange={(e) => { onPickImage(e.target.files?.[0], "body"); e.target.value = ""; }} />
            {editor ? null : <p className="editor-loading" role="status">Menyiapkan editor…</p>}
            <EditorContent editor={editor} />
            <p className="hint editor-count">{words} kata · sekitar {Math.max(1, Math.ceil(words / 200))} menit baca</p>
          </div>
        </div>

        <aside className="editor-side" aria-label="Pengaturan tulisan">
          <h3>Pengaturan</h3>
          {!isPage ? (
            <div className="field">
              <label htmlFor="tags">Tag</label>
              <TagInput id="tags" value={tags} onChange={touch(setTags)} suggestions={initial.tagSuggestions} describedBy="tags-hint" />
              <p className="hint" id="tags-hint">Ketik lalu tekan Enter, atau pilih dari saran. Maksimal 8. Tag pertama (gelap) adalah tag utama yang tampil di daftar tulisan; klik tag lain untuk menjadikannya utama.</p>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="excerpt">Ringkasan</label>
            <textarea id="excerpt" value={excerpt} maxLength={300} onChange={(e) => touch(setExcerpt)(e.target.value)} aria-describedby="excerpt-hint" style={{ minHeight: 100 }} />
            <p className="hint" id="excerpt-hint">{excerpt.length}/300. Tampil di beranda dan saat dibagikan ke WhatsApp. Kosongkan untuk memakai awal tulisan.</p>
          </div>
          {!isPage ? (
            <div className="field">
              <label htmlFor="publishAt">Tanggal terbit (WIB)</label>
              <input id="publishAt" type="datetime-local" value={publishAt} onChange={(e) => touch(setPublishAt)(e.target.value)} aria-describedby="publish-hint" />
              <p className="hint" id="publish-hint">
                Kosongkan untuk terbit sekarang. Isi waktu yang akan datang untuk menjadwalkan.{" "}
                {publishAt ? <button type="button" className="textbtn" onClick={() => touch(setPublishAt)("")}>Hapus tanggal</button> : null}
              </p>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="slug">Alamat (URL)</label>
            <input id="slug" value={shownSlug} maxLength={80} autoComplete="off" spellCheck={false}
              onChange={(e) => { setSlugTouched(true); touch(setSlug)(e.target.value); }} aria-describedby="slug-hint" />
            <p className="hint" id="slug-hint">qiran.my.id/{slugify(shownSlug)}/{slugLocked && !slugTouched ? " · Mengubah alamat tulisan yang sudah terbit membuat tautan lama tidak berlaku." : ""}</p>
          </div>
          {cover ? (
            <>
              <div className="field">
                <label htmlFor="alt">Teks alternatif gambar sampul</label>
                <input id="alt" value={coverAlt} maxLength={200} onChange={(e) => touch(setCoverAlt)(e.target.value)} placeholder="Misalnya: sepatu di atas rumput kering" aria-describedby="alt-hint" />
                <p className="hint" id="alt-hint">Gambaran singkat isi foto, untuk pembaca yang memakai pembaca layar.</p>
              </div>
              <div className="field">
                <label htmlFor="caption">Keterangan foto</label>
                <input id="caption" value={coverCaption} maxLength={300} onChange={(e) => touch(setCoverCaption)(e.target.value)} placeholder="Foto: nama fotografer / Unsplash" aria-describedby="caption-hint" />
                <p className="hint" id="caption-hint">Tampil kecil di bawah gambar. Boleh dikosongkan.</p>
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
            <form action={deletePostAction} onSubmit={() => setDirty(false)}>
              <input type="hidden" name="id" value={initial.id} />
              <ConfirmButton danger title="Hapus tulisan ini?" message="Tulisan, komentar, dan statistiknya ikut terhapus. Tidak bisa dibatalkan." confirmLabel="Hapus tulisan">Hapus tulisan</ConfirmButton>
            </form>
          ) : null}
        </aside>
      </div>

      <FormDialog
        open={dialog?.kind === "link"}
        title="Tautan"
        submitLabel="Pasang tautan"
        fields={[{ name: "href", label: "Alamat", value: dialog?.kind === "link" ? dialog.href : "", placeholder: "https://", required: true, hint: "Pilih kata di tulisan dulu, lalu tempel alamatnya di sini." }]}
        extraAction={dialog?.kind === "link" && dialog.href ? { label: "Hapus tautan", onClick: () => { editor?.chain().focus().extendMarkRange("link").unsetLink().run(); setDialog(null); } } : undefined}
        onSubmit={({ href }) => {
          const url = /^(https?:|mailto:|\/)/i.test(href) ? href : `https://${href}`;
          const chain = editor?.chain().focus().extendMarkRange("link");
          if (editor?.state.selection.empty && !editor.isActive("link")) editor.chain().focus().insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
          else chain?.setLink({ href: url }).run();
          setDialog(null);
        }}
        onClose={() => setDialog(null)}
      />
      <FormDialog
        open={dialog?.kind === "image"}
        title="Gambar"
        submitLabel="Sisipkan"
        fields={[{ name: "alt", label: "Teks alternatif", placeholder: "Gambaran singkat isi gambar", hint: "Untuk pembaca yang tidak bisa melihat gambar. Boleh dikosongkan kalau gambar hanya hiasan." }]}
        onSubmit={({ alt }) => {
          if (dialog?.kind === "image") editor?.chain().focus().setImage({ src: dialog.url, alt }).run();
          setDialog(null);
        }}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
