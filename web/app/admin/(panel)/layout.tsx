import { requireUser } from "@/lib/auth";
import { countPending } from "@/lib/comments";
import { siteSettings } from "@/lib/settings";
import { logout } from "@/app/actions/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { Wordmark } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const s = siteSettings();
  const items = [
    { href: "/admin/", label: "Tulisan" },
    { href: "/admin/tentang/", label: "Halaman Tentang" },
    { href: "/admin/komentar/", label: "Komentar", badge: countPending(user) },
    { href: "/admin/statistik/", label: "Statistik" },
    { href: "/admin/akun/", label: "Akun saya" },
    ...(user.role === "admin"
      ? [{ href: "/admin/pengguna/", label: "Pengguna" }, { href: "/admin/pengaturan/", label: "Pengaturan" }]
      : []),
  ];
  return (
    <div className="admin">
      <aside className="admin-side">
        <a className="admin-brand" href="/admin/"><Wordmark name={s.site_title} size={30} /></a>
        <AdminNav items={items} />
        <div className="admin-side-foot">
          <span>{user.name}</span>
          <a className="textlink" href="/" target="_blank" rel="noopener">Lihat situs</a>
          <form action={logout}><button className="textbtn" type="submit">Keluar</button></form>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
