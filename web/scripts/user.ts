/**
 * Kelola akun dari terminal.
 *   npm run user -- add --email kakak@contoh.id --name "Farhan" --role admin
 *   npm run user -- reset --email qirana@contoh.id
 *   npm run user -- list
 * Password dibuat acak dan ditampilkan sekali.
 */
// Baca pengaturan produksi (DATA_DIR) kalau ada
try { process.loadEnvFile(".env.production"); } catch {}
import { randomBytes } from "node:crypto";
import { createUser, listUsers, setPassword } from "../lib/users";
import { getDb } from "../lib/db";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const cmd = process.argv[2];
  const pw = randomBytes(12).toString("base64url");
  if (cmd === "add") {
    const email = arg("email"), name = arg("name");
    const role = arg("role") === "admin" ? "admin" : "author";
    if (!email || !name) throw new Error('Pakai: npm run user -- add --email x@y.id --name "Nama" [--role admin]');
    const u = await createUser({ email, name, role, password: pw });
    console.log(`Akun dibuat: ${u.name} <${u.email}> (${u.role})\nPassword: ${pw}\nSegera ganti di /admin/akun/ setelah masuk.`);
  } else if (cmd === "reset") {
    const email = arg("email");
    const row = getDb().prepare("SELECT id, name FROM users WHERE email = ?").get(email?.toLowerCase()) as { id: number; name: string } | undefined;
    if (!row) throw new Error("Email tidak ditemukan.");
    await setPassword(row.id, pw);
    console.log(`Password baru untuk ${row.name}: ${pw}`);
  } else if (cmd === "list") {
    for (const u of listUsers()) console.log(`${u.role.padEnd(6)} ${u.email}  ${u.name}  (${u.post_count} tulisan)`);
  } else {
    console.log("Perintah: add | reset | list");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
