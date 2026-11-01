import type { Metadata } from "next";
import { siteSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site";
import "./site.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = siteSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.site_title, template: `%s · ${s.site_title}` },
    description: s.site_description,
    alternates: { types: { "application/rss+xml": [{ url: "/rss.xml", title: s.site_title }] } },
    openGraph: { siteName: s.site_title, locale: "id_ID", type: "website" },
    icons: { icon: "/favicon.svg" },
  };
}

// Dijalankan sebelum halaman tampil, supaya mode gelap/terang tidak berkedip
const MODE_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');setTimeout(function(){d.classList.add('js-fallback')},3000);try{var m=localStorage.getItem('qiran-mode');if(m==='light'||m==='dark')d.setAttribute('data-mode',m)}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-mode="auto" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=sentient@300,400,401,500,700&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
