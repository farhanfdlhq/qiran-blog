// Uji alur utama di browser sungguhan. Jalankan: BASE=http://localhost:3100 node e2e/flow.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // playwright terpasang global
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3100";
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PW };
const AUTHOR = { email: process.env.AUTHOR_EMAIL, password: process.env.AUTHOR_PW };
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`); };

async function login(page, who) {
  await page.goto(BASE + "/admin/masuk/");
  await page.fill("#email", who.email);
  await page.fill("#password", who.password);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin\/$/);
}

const browser = await chromium.launch();
const errors = [];
try {
  // 1. Login salah ditolak
  let ctx = await browser.newContext();
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) errors.push("CSP: " + m.text()); });

  // 0. Validasi form bergaya qiran (bukan balon bawaan browser)
  await page.goto(BASE + "/admin/masuk/");
  await page.click("button[type=submit]");
  check("validasi kosong memakai pesan qiran", await page.locator(".field-error").first().isVisible() && page.url().includes("/admin/masuk/"));
  await page.fill("#email", "bukan-email");
  await page.click("button[type=submit]");
  check("validasi format email", (await page.locator(".field-error").first().textContent()).includes("Format email"));
  await page.goto(BASE + "/admin/masuk/");
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", "salah-sekali-123");
  await page.click("button[type=submit]");
  check("login salah ditolak", await page.getByText("Email atau password salah").waitFor({ timeout: 8000 }).then(() => true, () => false));

  // 2. Penulis membuat tulisan dengan editor visual + gambar, lalu terbit
  await login(page, AUTHOR);
  await page.click("text=Tulis baru");
  await page.waitForURL(/\/admin\/tulisan\/\d+\/$/);
  const editUrl = page.url();
  await page.fill(".editor-title", "Uji coba dari editor baru");
  await page.click(".prose");
  await page.keyboard.type("Paragraf pertama yang ditulis lewat editor visual. ");
  await page.keyboard.press("Control+B");
  await page.keyboard.type("tebal");
  await page.keyboard.press("Control+B");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Kata ");
  await page.keyboard.type("penting");
  await page.keyboard.press("Shift+Home");
  await page.click('button[title="Tandai dengan stabilo"]');
  await page.fill("#tags", "Uji, Opini");
  // unggah gambar sampul
  const imgPath = path.join(os.tmpdir(), "qiran-e2e.png");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  fs.writeFileSync(imgPath, png);
  await page.setInputFiles('.cover input[type=file]', imgPath);
  await page.waitForSelector(".cover img", { timeout: 15000 });
  check("unggah gambar sampul", (await page.getAttribute(".cover img", "src")).startsWith("/uploads/"));
  await page.click("text=Terbitkan");
  await page.waitForSelector(".toast-ok:has-text('Tulisan diterbitkan!')", { timeout: 10000 });
  check("terbitkan tulisan (notifikasi qiran)", true);

  // Penjaga perubahan belum tersimpan: dialog qiran, bukan dialog browser
  await page.click(".prose");
  await page.keyboard.press("End");
  await page.keyboard.type(" tambahan");
  await page.click("text=← Kembali");
  const leave = page.locator(".dialog.confirm[open]");
  check("dialog 'belum tersimpan' muncul", await leave.isVisible({ timeout: 3000 }).catch(() => false));
  await leave.locator("text=Simpan lalu pindah").click();
  await page.waitForURL(/\/admin\/$/, { timeout: 10000 });
  await page.goto(editUrl);
  await page.waitForSelector(".prose");
  check("simpan lalu pindah menyimpan perubahan", (await page.textContent(".prose")).includes("tambahan"));

  // Dialog konfirmasi hapus bisa dibatalkan
  await page.click("button:has-text('Hapus tulisan')");
  const del = page.locator(".dialog.confirm[open]");
  check("konfirmasi hapus memakai dialog qiran", await del.isVisible({ timeout: 3000 }).catch(() => false));
  await del.locator("button:has-text('Batal')").click();
  check("batal hapus tetap di editor", page.url() === editUrl);

  // 3. Tampil di situs publik dengan stabilo dan tebal
  const pub = await ctx.newPage();
  await pub.goto(BASE + "/uji-coba-dari-editor-baru/");
  const body = await pub.innerHTML(".article-body");
  check("tulisan tampil di situs", (await pub.textContent("h1")).includes("Uji coba dari editor baru"));
  check("format tebal dan stabilo tersimpan", body.includes("<strong>tebal</strong>") && body.includes("<mark>"));
  await pub.goto(BASE + "/");
  check("muncul di beranda sebagai tulisan terbaru", (await pub.textContent("#latest-title")).includes("Uji coba dari editor baru"));
  await pub.goto(BASE + "/tag/uji/");
  check("halaman topik baru", (await pub.textContent("h1")).includes("Uji"));

  // 4. Jadwal terbit: tulisan masa depan tidak tampil
  await page.goto(BASE + "/admin/");
  await page.click("text=Tulis baru");
  await page.waitForURL(/\/admin\/tulisan\/\d+\/$/);
  await page.fill(".editor-title", "Tulisan untuk minggu depan");
  await page.click(".prose");
  await page.keyboard.type("Isi terjadwal.");
  const future = new Date(Date.now() + 7 * 86400_000 + 7 * 3600_000).toISOString().slice(0, 16);
  await page.fill("#publishAt", future);
  await page.click("text=Jadwalkan");
  await page.waitForSelector(".toast:has-text('Tulisan dijadwalkan.')", { timeout: 10000 });
  const anon = await browser.newContext({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" });
  const ap = await anon.newPage();
  const r = await ap.goto(BASE + "/tulisan-untuk-minggu-depan/");
  check("tulisan terjadwal belum tampil untuk pembaca", r.status() === 404);
  const r2 = await pub.goto(BASE + "/tulisan-untuk-minggu-depan/");
  check("penulis bisa pratinjau tulisan terjadwal", r2.status() === 200 && (await pub.textContent("body")).includes("Pratinjau"));

  // 5. Komentar: kirim sebagai pembaca, menunggu moderasi
  await ap.goto(BASE + "/uji-coba-dari-editor-baru/");
  await ap.fill("#c-name", "Budi");
  await ap.fill("#c-body", "Tulisannya bagus <script>alert(1)</script>");
  await ap.waitForTimeout(3200); // lewati batas anti-bot 3 detik
  await ap.click("text=Kirim komentar");
  await ap.waitForSelector("text=akan tampil setelah disetujui", { timeout: 10000 });
  await ap.reload();
  check("komentar belum tampil sebelum disetujui", !(await ap.textContent("body")).includes("Tulisannya bagus"));

  // 6. Penulis menyetujui komentar
  await page.goto(BASE + "/admin/komentar/");
  check("komentar muncul di antrean moderasi", (await page.textContent("body")).includes("Tulisannya bagus"));
  await page.click("button:has-text('Setujui')");
  await page.waitForTimeout(800);
  await ap.reload();
  const shown = await ap.textContent(".comments");
  const commentHtml = await ap.innerHTML(".comments");
  check("komentar tampil setelah disetujui", shown.includes("Tulisannya bagus"));
  check("isi komentar di-escape (tidak jadi script)", !commentHtml.includes("<script>") && commentHtml.includes("&lt;script&gt;"));

  // 7. Hak akses: penulis tidak bisa membuka tulisan admin
  const peek = await browser.newContext();
  const pk = await peek.newPage();
  await login(pk, ADMIN);
  const otherHref = await pk.getAttribute("a.list-title:has-text('Jam pelajaran terakhir')", "href");
  await peek.close();
  await page.goto(BASE + otherHref);
  check("penulis tidak bisa mengedit tulisan orang lain", page.url().endsWith("/admin/"));
  const pg = await page.goto(BASE + "/admin/pengguna/");
  check("penulis tidak bisa membuka menu Pengguna", page.url().endsWith("/admin/"));

  // 8. Pencarian
  await ap.goto(BASE + "/cari/?q=klorofil");
  check("pencarian menemukan tulisan", (await ap.textContent(".archive")).includes("Fotosintesis"));

  // 9. Statistik: kunjungan tercatat
  await ap.goto(BASE + "/hujan-di-halte/");
  await ap.waitForTimeout(2500);
  await page.goto(BASE + "/admin/statistik/");
  check("halaman statistik terbuka", (await page.textContent("h1")).includes("Statistik"));

  // 10. Admin: semua menu, ubah pengaturan
  const actx = await browser.newContext();
  const adm = await actx.newPage();
  await login(adm, ADMIN);
  await adm.goto(BASE + "/admin/pengaturan/");
  await adm.fill("#hero_heading", "Tulisan dari tengah nama.");
  await adm.click("text=Simpan pengaturan");
  await adm.waitForSelector(".toast:has-text('Pengaturan disimpan.')", { timeout: 10000 });
  check("admin menyimpan pengaturan", true);
  await adm.goto(BASE + "/admin/statistik/");
  check("statistik admin mencatat pembaca", Number(await adm.textContent(".stat-num")) >= 1);

  // 11. Upload ditolak tanpa login dan dari situs lain
  const up1 = await ap.request.post(BASE + "/api/upload/", { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: png } } });
  check("upload ditolak tanpa login", up1.status() === 401);
  const up2 = await adm.request.post(BASE + "/api/upload/", { headers: { origin: "https://jahat.example" }, multipart: { file: { name: "a.png", mimeType: "image/png", buffer: png } } });
  check("upload ditolak dari situs lain", up2.status() === 403);
  const up3 = await adm.request.post(BASE + "/api/upload/", { multipart: { file: { name: "a.php", mimeType: "image/png", buffer: Buffer.from("<?php echo 1;") } } });
  check("file bukan gambar ditolak", up3.status() === 422);

  // 11b. Hapus tulisan uji lewat dialog konfirmasi
  await page.goto(editUrl);
  await page.waitForSelector(".prose");
  await page.click("button:has-text('Hapus tulisan')");
  await page.locator(".dialog.confirm[open] button:has-text('Hapus tulisan')").click();
  await page.waitForURL(/\/admin\/$/, { timeout: 10000 });
  const gone = await ap.goto(BASE + "/uji-coba-dari-editor-baru/");
  check("tulisan terhapus setelah dikonfirmasi", gone.status() === 404);

  // 12. Keluar
  await page.goto(BASE + "/admin/");
  await page.click("text=Keluar");
  await page.waitForURL(/\/admin\/masuk\/$/);
  check("keluar dari panel", true);
} catch (e) {
  check("tanpa error tak terduga", false, String(e));
} finally {
  await browser.close();
}
check("tanpa error JavaScript di browser", errors.length === 0, errors.join(" | "));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} lolos`);
process.exit(failed ? 1 : 0);
