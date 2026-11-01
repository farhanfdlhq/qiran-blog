import { getAnyBySlug } from "@/lib/posts";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { openAboutPage } from "@/app/actions/admin";

export default async function AboutAdmin() {
  await requireUser();
  const page = getAnyBySlug("tentang");
  if (page) redirect(`/admin/tulisan/${page.id}/`);
  return (
    <>
      <div className="admin-head"><h1 className="admin-title">Halaman Tentang</h1></div>
      <p className="admin-sub" style={{ marginBottom: 20 }}>Halaman Tentang belum ada. Isinya tampil di /tentang/ dan di bagian bawah beranda.</p>
      <form action={openAboutPage}><button className="btn" type="submit">Buat halaman Tentang</button></form>
    </>
  );
}
