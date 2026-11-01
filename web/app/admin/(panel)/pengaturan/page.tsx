import { requireAdmin } from "@/lib/auth";
import { siteSettings } from "@/lib/settings";
import { listTags } from "@/lib/posts";
import { saveSettings, saveTag } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";

export default async function SettingsPage() {
  await requireAdmin();
  const s = siteSettings();
  const tags = listTags();
  return (
    <>
      <div className="admin-head"><h1 className="admin-title">Pengaturan</h1></div>
      <section className="admin-section">
        <h2>Situs</h2>
        <ActionForm action={saveSettings}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="site_title">Nama situs</label>
              <input id="site_title" name="site_title" defaultValue={s.site_title} required maxLength={40} />
            </div>
            <div className="field">
              <label htmlFor="hero_heading">Kalimat besar di beranda</label>
              <input id="hero_heading" name="hero_heading" defaultValue={s.hero_heading} maxLength={40} aria-describedby="hero-hint" />
              <p className="hint" id="hero-hint">Sekitar 30 huruf supaya muat dua baris.</p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="hero_text">Kalimat pendukung di beranda</label>
            <textarea id="hero_text" name="hero_text" defaultValue={s.hero_text} maxLength={300} style={{ minHeight: 90 }} />
          </div>
          <div className="field">
            <label htmlFor="site_description">Deskripsi situs (footer dan Google)</label>
            <textarea id="site_description" name="site_description" defaultValue={s.site_description} maxLength={200} style={{ minHeight: 80 }} />
          </div>
          <label className="check"><input type="checkbox" name="show_latest" defaultChecked={s.show_latest === "1"} /> Tampilkan tulisan terbaru dalam blok hijau di beranda</label>
          <label className="check"><input type="checkbox" name="comments_enabled" defaultChecked={s.comments_enabled === "1"} /> Izinkan komentar pembaca</label>
          <div><button className="btn" type="submit">Simpan pengaturan</button></div>
        </ActionForm>
      </section>
      <section className="admin-section">
        <h2>Topik</h2>
        <p className="hint" style={{ marginBottom: 12 }}>Topik baru dibuat otomatis dari editor tulisan. Di sini kamu bisa mengganti nama, menambah deskripsi, atau menghapusnya.</p>
        {tags.length ? (
          <ul className="list">
            {tags.map((t) => (
              <li className="list-item" key={t.id} style={{ gridTemplateColumns: "1fr" }}>
                <form action={saveTag} className="form" style={{ maxWidth: "none" }}>
                  <input type="hidden" name="id" value={t.id} />
                  <div className="form-row">
                    <div className="field"><label htmlFor={`tn-${t.id}`}>Nama ({t.count} tulisan terbit)</label><input id={`tn-${t.id}`} name="name" defaultValue={t.name} required maxLength={40} /></div>
                    <div className="field"><label htmlFor={`td-${t.id}`}>Deskripsi</label><input id={`td-${t.id}`} name="description" defaultValue={t.description} maxLength={300} /></div>
                  </div>
                  <div className="btn-row">
                    <button className="btn btn-quiet btn-small" type="submit" name="action" value="save">Simpan</button>
                    <button className="btn btn-danger btn-small" type="submit" name="action" value="delete">Hapus topik</button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        ) : <p className="empty">Belum ada topik.</p>}
      </section>
    </>
  );
}
