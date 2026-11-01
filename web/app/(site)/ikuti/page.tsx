import type { Metadata } from "next";
import { siteSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site";
import { CopyField } from "@/components/CopyField";

export const metadata: Metadata = { title: "Ikuti tulisan baru", alternates: { canonical: "/ikuti/" } };

export default function FollowPage() {
  const s = siteSettings();
  const feed = siteUrl("/rss.xml");
  const enc = encodeURIComponent(feed);
  return (
    <section className="follow" aria-labelledby="follow-title">
      <div className="follow-col">
        <h1 id="follow-title">Ikuti tulisan baru</h1>
        <p className="lead-soft" style={{ margin: 0 }}>Tidak perlu daftar atau memberi email. Pakai aplikasi pembaca RSS, dan tulisan baru dari {s.site_title} akan muncul sendiri di sana.</p>

        <h2>Cara paling cepat</h2>
        <div className="btn-row" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a className="btn" href={`https://feedly.com/i/subscription/feed/${enc}`} target="_blank" rel="noopener noreferrer">Ikuti di Feedly</a>
          <a className="btn btn-ink" href={`https://www.inoreader.com/?add_feed=${enc}`} target="_blank" rel="noopener noreferrer">Ikuti di Inoreader</a>
        </div>
        <p className="form-note" style={{ marginTop: 12 }}>Keduanya gratis dan ada versi HP-nya.</p>

        <h2>Pakai aplikasi lain</h2>
        <p>Salin alamat ini, lalu tempel di aplikasi pembaca RSS yang kamu pakai:</p>
        <CopyField value={feed} />

        <h2>Apa itu RSS?</h2>
        <p>RSS adalah cara lama tapi andal untuk berlangganan situs. Aplikasi pembaca RSS memeriksa blog-blog yang kamu ikuti dan mengumpulkan tulisan barunya di satu tempat, tanpa iklan dan tanpa algoritma.</p>
        <p>Kalau tidak ingin memasang apa pun, mampir saja ke <a className="textlink" href="/">beranda</a>: tulisan terbaru selalu ada paling atas.</p>
      </div>
    </section>
  );
}
