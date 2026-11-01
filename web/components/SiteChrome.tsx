import Script from "next/script";
import { siteSettings } from "@/lib/settings";
import { getSessionUserFromCookie } from "@/lib/auth";
import { Wordmark, LogoMark } from "@/components/Logo";

export async function Topbar() {
  const s = siteSettings();
  return (
    <header className="topbar">
      <a className="wordmark" href="/" aria-label={`${s.site_title}, ke beranda`}><Wordmark name={s.site_title} /></a>
      <nav className="topnav" id="menu" aria-label="Menu utama">
        <ul className="nav">
          <li><a href="/#tulisan">Tulisan</a></li>
          <li><a href="/tentang/">Tentang</a></li>
        </ul>
      </nav>
      <div className="topactions">
        <a className="textbtn" href="/cari/">Cari</a>
        <button className="textbtn js-mode" type="button" aria-label="Ganti ke mode gelap"><span className="mode-label">Gelap</span></button>
        <button className="textbtn menu-btn js-menu" type="button" aria-controls="menu" aria-expanded="false">Menu</button>
      </div>
    </header>
  );
}

export async function Footer() {
  const s = siteSettings();
  const user = await getSessionUserFromCookie();
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-cols">
        <div className="footer-col">
          <p className="footer-head">{s.site_title}</p>
          <p>{s.site_description}</p>
        </div>
        <div className="footer-col">
          <p className="footer-head">Halaman</p>
          <ul className="plain">
            <li><a href="/tentang/">Tentang</a></li>
            <li><a href="/cari/">Cari</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <p className="footer-head">Ikuti tulisan baru</p>
          <ul className="plain">
            <li><a href="/ikuti/">Cara mengikuti</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <p className="footer-head">Penulis</p>
          <ul className="plain">
            <li><a href="/admin/">{user ? `Panel (${user.name})` : "Masuk ke panel"}</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-base">
        <a className="footer-brand" href="/" aria-label={`${s.site_title}, ke beranda`}>
          <LogoMark size={56} className="logo-mark" tile={false} />
          <span>{s.site_title}</span>
        </a>
        <p className="legal">&copy; {year} {s.site_title}. Semua tulisan milik penulisnya.</p>
      </div>
    </footer>
  );
}

export function SiteScripts() {
  return <Script src="/assets/main.js" strategy="afterInteractive" />;
}
