import { Topbar, Footer, SiteScripts } from "@/components/SiteChrome";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#isi">Langsung ke isi</a>
      <div className="page">
        <Topbar />
        <main id="isi" className="main">{children}</main>
      </div>
      <Footer />
      <SiteScripts />
    </>
  );
}
