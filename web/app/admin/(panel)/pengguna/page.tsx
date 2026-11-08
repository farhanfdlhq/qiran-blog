import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { addUser, manageUser } from "@/app/actions/admin";
import { Select } from "@/components/admin/Select";
import { EmailButton } from "@/components/admin/EmailButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = listUsers();
  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Pengguna</h1>
          <p className="admin-sub">Penulis bisa menulis, menerbitkan, dan mengelola komentar di tulisannya sendiri. Admin bisa mengatur semuanya.</p>
        </div>
      </div>
      <section className="admin-section">
        <ul className="list">
          {users.map((u) => (
            <li className="list-item" key={u.id} style={{ gridTemplateColumns: "1fr" }}>
              <span className="list-title">{u.name}{u.id === me.id ? " (kamu)" : ""}</span>
              <div className="list-meta"><span>{u.email}</span><span>{u.role === "admin" ? "Admin" : "Penulis"}</span><span>{u.post_count} tulisan</span></div>
              <ActionForm action={manageUser} className="btn-row">
                <input type="hidden" name="id" value={u.id} />
                <EmailButton id={u.id} name={u.name} email={u.email} />
                <ConfirmButton name="action" value="reset" title={`Buat password baru untuk ${u.name}?`} message="Password lama langsung tidak berlaku dan semua perangkat yang sedang masuk akan keluar." confirmLabel="Buat password baru">Buat password baru</ConfirmButton>
                {u.id !== me.id ? (
                  <>
                    {u.role === "author"
                      ? <ConfirmButton name="action" value="make-admin" title={`Jadikan ${u.name} admin?`} message="Admin bisa mengubah semua tulisan, pengguna, dan pengaturan situs." confirmLabel="Jadikan admin">Jadikan admin</ConfirmButton>
                      : <ConfirmButton name="action" value="make-author" title={`Jadikan ${u.name} penulis biasa?`} message="Penulis hanya bisa mengelola tulisan dan komentar miliknya sendiri." confirmLabel="Jadikan penulis">Jadikan penulis</ConfirmButton>}
                    <ConfirmButton name="action" value="delete" danger title={`Hapus akun ${u.name}?`} message="Tulisannya tetap ada, tapi tanpa nama penulis. Tidak bisa dibatalkan." confirmLabel="Hapus akun">Hapus akun</ConfirmButton>
                  </>
                ) : null}
              </ActionForm>
            </li>
          ))}
        </ul>
      </section>
      <section className="admin-section">
        <h2>Tambah penulis</h2>
        <ActionForm action={addUser} resetOnOk>
          <div className="form-row">
            <div className="field">
              <label htmlFor="new-name">Nama</label>
              <input id="new-name" name="name" required maxLength={60} />
            </div>
            <div className="field">
              <label htmlFor="new-email">Email</label>
              <input id="new-email" name="email" type="email" required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="new-role">Peran</label>
            <Select id="new-role" name="role" defaultValue="author" options={[
              { value: "author", label: "Penulis", hint: "menulis dan menerbitkan" },
              { value: "admin", label: "Admin", hint: "mengatur semuanya" },
            ]} />
          </div>
          <p className="hint">Password sementara akan muncul setelah akun dibuat. Sampaikan langsung ke orangnya, lalu minta diganti di menu Akun saya.</p>
          <div><button className="btn" type="submit">Tambah</button></div>
        </ActionForm>
      </section>
    </>
  );
}
