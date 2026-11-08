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
  const imgPath = path.join(os.tmpdir(), "qiran-e2e.png");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  fs.writeFileSync(imgPath, png);
  await page.click(".prose");
  // gambar di dalam tulisan dengan keterangan dan sumber
  await page.setInputFiles('input[type=file]:not(.cover input)', imgPath);
  await page.waitForSelector(".dialog[open] #dlg-caption", { timeout: 15000 });
  await page.fill("#dlg-caption", "Halte depan sekolah saat hujan");
  await page.fill("#dlg-source", "Dokumentasi pribadi, 2026");
  await page.click(".dialog[open] button[type=submit]");
  check("gambar berketerangan masuk ke editor", await page.locator(".prose figure.qiran-fig figcaption:has-text('Sumber: Dokumentasi pribadi')").isVisible({ timeout: 5000 }).catch(() => false));
  await page.keyboard.type("Paragraf pertama yang ditulis lewat editor visual. ");
  await page.keyboard.press("Control+B");
  await page.keyboard.type("tebal");
  await page.keyboard.press("Control+B");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Kata ");
  await page.keyboard.type("penting");
  await page.keyboard.press("Shift+Home");
  await page.click('button[title="Tandai dengan stabilo"]');
  await page.click("#tags");
  await page.keyboard.type("Uji");
  await page.keyboard.press("Enter");
  await page.keyboard.type("opi");
  check("saran tag muncul dari tag yang sudah ada", await page.locator(".tag-option:has-text('Opini')").isVisible({ timeout: 3000 }).catch(() => false));
  await page.keyboard.press("Enter");
  check("tag jadi chip, ejaan mengikuti tag yang ada", (await page.locator(".tag-chip").allTextContents()).join("|") === "Uji|Opini");
  // unggah gambar sampul
  await page.setInputFiles('.cover input[type=file]', imgPath);
  await page.waitForSelector(".cover img", { timeout: 15000 });
  check("unggah gambar sampul", (await page.getAttribute(".cover img", "src")).startsWith("/uploads/"));
  // Daftar Pustaka lewat dialog sumber (seperti Word)
  await page.click("button:has-text('+ Tambah sumber')");
  await page.waitForSelector(".dialog[open] #src-dialog-title");
  await page.fill("#src-authors", "Agus Nugroho");
  await page.fill("#src-year", "2026");
  await page.click("#src-month");
  await page.click(".select-list .select-option:has-text('Januari')");
  await page.fill("#src-title", "Judul berita");
  await page.fill("#src-container", "RMOL");
  await page.fill("#src-url", "https://rmol.id/contoh");
  check("pratinjau sumber berformat APA", (await page.textContent(".source-preview-text")).includes("Nugroho, A. (2026, Januari). Judul berita. RMOL. https://rmol.id/contoh"));
  await page.click(".dialog[open] button:has-text('Tambahkan')");
  check("sumber masuk ke Daftar Pustaka", await page.locator(".refs-item em:has-text('Judul berita')").isVisible({ timeout: 3000 }).catch(() => false));
  await page.fill("#pdfLabel", "Artikel Opini");
  await page.click("text=Terbitkan");
  await page.waitForSelector(".toast-ok:has-text('Tulisan diterbitkan!')", { timeout: 10000 });
  check("terbitkan tulisan (notifikasi qiran)", true);

  // Penjaga perubahan belum tersimpan: dialog qiran, bukan dialog browser
  await page.click(".prose");
  await page.keyboard.press("End");
  await page.keyboard.type(" tambahan");
  await page.click("a.editor-back");
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
  check("nomor gambar dan Daftar Pustaka tampil di situs", (await pub.textContent(".gh-content")).includes("Gambar 1. Halte depan sekolah saat hujan (Sumber: Dokumentasi pribadi, 2026)") && (await pub.locator(".references em:has-text('Judul berita')").count()) === 1);
  const body = await pub.innerHTML(".article-body");
  check("tulisan tampil di situs", (await pub.textContent("h1")).includes("Uji coba dari editor baru"));
  check("format tebal dan stabilo tersimpan", body.includes("<strong>tebal</strong>") && body.includes("<mark>"), body.slice(0, 500));
  await pub.goto(BASE + "/");
  check("muncul di beranda sebagai tulisan terbaru", (await pub.textContent("#latest-title")).includes("Uji coba dari editor baru"));
  await pub.goto(BASE + "/tag/uji/");
  check("halaman tag baru", (await pub.textContent("h1")).includes("Uji"));

  // 4. Jadwal terbit: tulisan masa depan tidak tampil
  await page.goto(BASE + "/admin/");
  await page.click("text=Tulis baru");
  await page.waitForURL(/\/admin\/tulisan\/\d+\/$/);
  await page.fill(".editor-title", "Tulisan untuk minggu depan");
  await page.click(".prose");
  await page.keyboard.type("Isi terjadwal.");
  // Urungkan: Ctrl+Z saat kursor di luar tulisan, dan tombol ikon di awal toolbar
  await page.waitForTimeout(700);
  await page.keyboard.type(" salah ketik");
  await page.click(".editor-side h3");
  await page.keyboard.press("Control+z");
  check("Ctrl+Z mengurungkan walau kursor di luar tulisan", !(await page.textContent(".prose")).includes("salah ketik") && (await page.textContent(".prose")).includes("Isi terjadwal."));
  await page.click(".prose");
  await page.keyboard.press("End");
  await page.waitForTimeout(700);
  await page.keyboard.type(" kedua");
  await page.click(".toolbar button[title^='Urungkan']");
  check("tombol Urungkan di awal toolbar", !(await page.textContent(".prose")).includes("kedua"));
  // Pemilih tanggal qiran: bulan depan, tanggal 15, jam 09.00
  await page.click("#publishAt");
  await page.click(".dtf-panel button[aria-label='Bulan berikutnya']");
  await page.click(".dtf-day:text-is('15')");
  await page.click(".dtf-col[aria-label='Jam'] .dtf-t:text-is('09')");
  await page.click(".dtf-panel button:has-text('Selesai')");
  check("pemilih tanggal qiran mengisi jadwal", (await page.textContent("#publishAt")).includes("09.00 WIB"));
  await page.click("text=Jadwalkan");
  await page.waitForSelector(".toast:has-text('Tulisan dijadwalkan.')", { timeout: 10000 });
  const anon = await browser.newContext({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" });
  const ap = await anon.newPage();
  const r = await ap.goto(BASE + "/tulisan-untuk-minggu-depan/");
  check("tulisan terjadwal belum tampil untuk pembaca", r.status() === 404);
  const ogDraft = await ap.request.get(BASE + "/og/tulisan-untuk-minggu-depan.jpg");
  check("gambar pratinjau tulisan terjadwal tidak tersedia", ogDraft.status() === 404);
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
  const ogUrl = await ap.getAttribute('meta[property="og:image"]', "content");
  const ogRes = ogUrl ? await ap.request.get(BASE + new URL(ogUrl).pathname + new URL(ogUrl).search) : null;
  const ogBody = ogRes ? await ogRes.body() : Buffer.alloc(0);
  check("gambar pratinjau tulisan berupa JPEG kecil", !!ogRes && ogRes.headers()["content-type"] === "image/jpeg" && ogBody.length > 5000 && ogBody.length < 300_000, `${ogUrl} ${ogBody.length}`);
  check("tag Open Graph lengkap", (await ap.locator('meta[property="og:site_name"], meta[property="og:url"], meta[property="og:image:width"], meta[name="twitter:card"]').count()) === 4);
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
  // Admin mengganti email penulis, penulis bisa masuk dengan email baru
  const newEmail = "baru-" + AUTHOR.email;
  const changeEmail = async (from, to) => {
    await adm.goto(BASE + "/admin/pengguna/");
    await adm.click(`li.list-item:has-text('${from}') button:has-text('Ubah email')`);
    await adm.fill(".dialog[open] #dlg-email", to);
    await adm.click(".dialog[open] button:has-text('Simpan email')");
    await adm.waitForSelector(`.list-meta:has-text('${to}')`, { timeout: 10000 });
  };
  await changeEmail(AUTHOR.email, newEmail);
  const ec = await browser.newContext();
  const ep = await ec.newPage();
  await login(ep, { email: newEmail, password: AUTHOR.password });
  check("admin mengganti email penulis, penulis masuk dengan email baru", ep.url().endsWith("/admin/"));
  await ec.close();
  await changeEmail(newEmail, AUTHOR.email);
  await adm.goto(BASE + "/admin/statistik/");
  check("statistik admin mencatat pembaca", Number(await adm.textContent(".stat-num")) >= 1);

  // 10b. Pilih banyak dan aksi massal di daftar tulisan
  await adm.goto(BASE + "/admin/");
  await adm.click(".list-tools input[type=checkbox]");
  const total = await adm.locator(".row-check").count();
  check("pilih semua mencentang semua baris", (await adm.locator(".row-check:checked").count()) === total && (await adm.locator(".bulk-bar").isVisible()));
  await adm.click(".bulk-cancel");
  check("batal pilih menutup bilah aksi", !(await adm.locator(".bulk-bar").isVisible()));
  const row = adm.locator(".list-item", { hasText: "Tulisan untuk minggu depan" }).first();
  await row.locator(".row-check").click();
  await adm.click(".bulk-bar button:has-text('Jadikan draf')");
  await adm.waitForSelector(".toast:has-text('1 tulisan dijadikan draf')", { timeout: 10000 });
  await adm.waitForTimeout(800);
  check("aksi massal: jadikan draf", (await row.locator(".status").textContent()) === "Draf");
  await row.locator(".row-check").click();
  await adm.click(".bulk-bar button:has-text('Hapus')");
  await adm.locator(".dialog.confirm[open] button:has-text('Hapus tulisan')").click();
  await adm.waitForSelector(".toast:has-text('1 tulisan dihapus')", { timeout: 10000 });
  await adm.waitForTimeout(800);
  check("aksi massal: hapus dengan konfirmasi", (await adm.locator(".list-item", { hasText: "Tulisan untuk minggu depan" }).count()) === 0);

  // 11. Upload ditolak tanpa login dan dari situs lain
  const up1 = await ap.request.post(BASE + "/api/upload/", { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: png } } });
  check("upload ditolak tanpa login", up1.status() === 401);
  const up2 = await adm.request.post(BASE + "/api/upload/", { headers: { origin: "https://jahat.example" }, multipart: { file: { name: "a.png", mimeType: "image/png", buffer: png } } });
  check("upload ditolak dari situs lain", up2.status() === 403);
  const up3 = await adm.request.post(BASE + "/api/upload/", { multipart: { file: { name: "a.php", mimeType: "image/png", buffer: Buffer.from("<?php echo 1;") } } });
  check("file bukan gambar ditolak", up3.status() === 422);

  // 11d. PDF tugas dan lomba
  await page.goto(BASE + "/admin/akun/");
  await page.fill("#full_name", "Qirani Nama Lengkap Uji");
  await page.fill("#school", "SMA Uji Coba");
  await page.fill("#region", "Provinsi Uji");
  await page.click("button:has-text('Simpan identitas')");
  await page.waitForSelector(".toast:has-text('Identitas tersimpan.')", { timeout: 10000 });
  const fetchIn = (pg, url) => pg.evaluate(async (u) => {
    const r = await fetch(u);
    const b = new Uint8Array(await r.arrayBuffer());
    return { status: r.status, type: r.headers.get("content-type"), size: b.length, head: String.fromCharCode(...b.slice(0, 5)), disp: r.headers.get("content-disposition") };
  }, url);
  const postId = editUrl.match(/tulisan\/(\d+)\//)[1];
  await page.goto(editUrl);
  await page.waitForSelector(".prose");
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click("button:has-text('Unduh PDF')")]);
  check("tombol Unduh PDF mengunduh berkas", dl.suggestedFilename() === "Uji_coba_dari_editor_baru_Qirani_Nama_Lengkap_Uji.pdf", dl.suggestedFilename());
  const own = await fetchIn(page, `/admin/pdf/${postId}/`);
  check("PDF A4 dari panel", own.status === 200 && own.type === "application/pdf" && own.head === "%PDF-" && own.size > 5000 && own.size < 5_000_000, JSON.stringify(own));
  const otherId = otherHref.match(/tulisan\/(\d+)\//)[1];
  check("penulis tidak bisa mengunduh PDF tulisan orang lain", (await fetchIn(page, `/admin/pdf/${otherId}/`)).status === 404);
  check("pengunjung tidak bisa mengunduh PDF", (await fetchIn(ap, `/admin/pdf/${postId}/`)).status === 404);
  let leaked = false;
  for (const u of ["/uji-coba-dari-editor-baru/", "/author/qirani/", "/rss.xml", "/sitemap.xml", "/"]) {
    const r = await ap.request.get(BASE + u);
    if ((await r.text()).includes("Nama Lengkap Uji") || (await r.text()).includes("SMA Uji Coba")) leaked = true;
  }
  check("identitas lengkap tidak tampil di situs", !leaked);

  // 11c. Tampilan HP: tidak ada halaman admin yang melebihi lebar layar
  await page.setViewportSize({ width: 375, height: 740 });
  const wide = [];
  for (const url of ["/admin/", editUrl, "/admin/komentar/", "/admin/statistik/", "/admin/akun/", "/admin/tentang/"]) {
    await page.goto(url.startsWith("http") ? url : BASE + url);
    await page.waitForTimeout(400);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    if (w > 375) wide.push(`${url} ${w}px`);
  }
  check("panel admin muat di layar HP", wide.length === 0, wide.join(", "));
  await page.setViewportSize({ width: 1280, height: 800 });

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
