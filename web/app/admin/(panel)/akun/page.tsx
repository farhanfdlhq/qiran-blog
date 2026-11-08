import { requireUser } from "@/lib/auth";
import { saveProfile, saveIdentity, changePassword } from "@/app/actions/admin";
import { getIdentity } from "@/lib/users";
import { ActionForm } from "@/components/admin/ActionForm";
import { AvatarField } from "@/components/admin/AvatarField";
import { PasswordInput } from "@/components/admin/PasswordInput";

export default async function AccountPage() {
  const user = await requireUser();
  const id = getIdentity(user.id);
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
        <h2>Identitas untuk tugas dan lomba</h2>
        <p className="hint" style={{ marginBottom: 16 }}>Hanya dicetak di PDF yang kamu unduh dari editor. Tidak tampil di situs.</p>
        <ActionForm action={saveIdentity}>
          <div className="field">
            <label htmlFor="full_name">Nama lengkap</label>
            <input id="full_name" name="full_name" defaultValue={id.full_name} maxLength={80} autoComplete="name" placeholder="Misalnya: Qirani Azzahra" />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="school">Sekolah</label>
              <input id="school" name="school" defaultValue={id.school} maxLength={80} placeholder="Misalnya: SMAN 2 Bogor" />
            </div>
            <div className="field">
              <label htmlFor="region">Provinsi atau kota</label>
              <input id="region" name="region" defaultValue={id.region} maxLength={60} placeholder="Misalnya: Provinsi Jawa Barat" />
            </div>
          </div>
          <div><button className="btn" type="submit">Simpan identitas</button></div>
        </ActionForm>
      </section>
      <section className="admin-section">
        <h2>Ganti password</h2>
        <ActionForm action={changePassword} resetOnOk>
          <div className="field">
            <label htmlFor="current">Password sekarang</label>
            <PasswordInput id="current" name="current" required autoComplete="current-password" />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="next">Password baru</label>
              <PasswordInput id="next" name="next" required minLength={10} autoComplete="new-password" aria-describedby="pw-hint" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Ulangi password baru</label>
              <PasswordInput id="confirm" name="confirm" required minLength={10} autoComplete="new-password" />
            </div>
          </div>
          <p className="hint" id="pw-hint">Minimal 10 karakter. Perangkat lain akan otomatis keluar.</p>
          <div><button className="btn" type="submit">Ganti password</button></div>
        </ActionForm>
      </section>
    </>
  );
}
