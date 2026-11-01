import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { siteSettings } from "@/lib/settings";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSessionUserFromCookie()) redirect("/admin/");
  const s = siteSettings();
  const next = (await searchParams).next ?? "";
  return (
    <main className="login">
      <div className="login-card">
        <p className="admin-sub"><a className="textlink" href="/">{s.site_title}</a></p>
        <h1 className="login-title">Masuk ke panel</h1>
        <p className="admin-sub" style={{ marginBottom: 28 }}>Untuk penulis {s.site_title}.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
