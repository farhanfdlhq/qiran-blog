import { requireUser } from "@/lib/auth";
import { saveProfile, changePassword } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { AvatarField } from "@/components/admin/AvatarField";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Akun saya</h1>
          <p className="admin-sub">{user.email} · {user.role === "admin" ? "Admin" : "Penulis"}</p>
        </div>
      </div>
      <section className="admin-section">
        <h2>Profil penulis</h2>
        <ActionForm action={saveProfile}>
          <div className="field">
            <label htmlFor="name">Nama yang tampil</label>
            <input id="name" name="name" defaultValue={user.name} required maxLength={60} aria-describedby="name-hint" />
            <p className="hint" id="name-hint">Cukup nama depan.</p>
          </div>
          <div className="field">
            <label htmlFor="bio">Bio singkat</label>
            <textarea id="bio" name="bio" defaultValue={user.bio} maxLength={300} style={{ minHeight: 90 }} />
          </div>
          <AvatarField initial={user.avatar} />
          <div><button className="btn" type="submit">Simpan profil</button></div>
        </ActionForm>
      </section>
      <section className="admin-section">
        <h2>Ganti password</h2>
        <ActionForm action={changePassword} resetOnOk>
          <div className="field">
            <label htmlFor="current">Password sekarang</label>
            <input id="current" name="current" type="password" required autoComplete="current-password" />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="next">Password baru</label>
              <input id="next" name="next" type="password" required minLength={10} autoComplete="new-password" aria-describedby="pw-hint" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Ulangi password baru</label>
              <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
            </div>
          </div>
          <p className="hint" id="pw-hint">Minimal 10 karakter. Perangkat lain akan otomatis keluar.</p>
          <div><button className="btn" type="submit">Ganti password</button></div>
        </ActionForm>
      </section>
    </>
  );
}
