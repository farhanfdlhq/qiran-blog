/**
 * Mengubah HTML jadi PDF dengan Chromium tanpa layar (playwright-core).
 * - Satu render dalam satu waktu untuk seluruh aplikasi; paling banyak 3 permintaan menunggu.
 * - JavaScript dimatikan dan semua permintaan jaringan diblokir: gambar sudah disisipkan sebagai data URI.
 *   Karena itu Chromium aman dijalankan dengan --no-sandbox (sandbox sering tidak tersedia untuk user www).
 * - Browser ditutup setiap selesai, supaya RAM kembali.
 */
import { chromium, type Browser } from "playwright-core";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export class PdfUnavailableError extends Error {}
export class PdfBusyError extends Error {}

const TIMEOUT_MS = 45_000;
const MAX_PENDING = 4; // 1 berjalan + 3 menunggu

let queue: Promise<unknown> = Promise.resolve();
let pending = 0;

async function render(html: string, coverHtml: string | null): Promise<Buffer> {
  let browser: Browser | undefined;
  const timer = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Waktu membuat PDF habis.")), TIMEOUT_MS));
  try {
    const work = (async () => {
      try {
        browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"] });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/Executable doesn't exist|executable|browserType\.launch/i.test(msg)) throw new PdfUnavailableError(msg);
        throw e;
      }
      const context = await browser.newContext({ javaScriptEnabled: false, offline: true });
      await context.route("**/*", (route) => route.abort());
      const page = await context.newPage();
      const toPdf = async (doc: string) => {
        await page.setContent(doc, { waitUntil: "load", timeout: TIMEOUT_MS });
        await page.emulateMedia({ media: "print" });
        return page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, tagged: true });
      };
      const body = await toPdf(html);
      const cover = coverHtml ? await toPdf(coverHtml) : null;
      return finish(body, cover);
    })();
    return await Promise.race([work, timer]);
  } finally {
    await (browser as Browser | undefined)?.close().catch(() => {});
  }
}

/**
 * Menggabungkan sampul (opsional, satu halaman tanpa bingkai dan nomor) dengan isi.
 * Halaman isi diberi bingkai tipis 0,8 cm dari tepi kertas (#161c1a) dan nomor halaman
 * mulai dari 1 di tengah bawah, di dalam bingkai (#4d5550).
 */
async function finish(body: Uint8Array, cover: Uint8Array | null): Promise<Buffer> {
  const doc = await PDFDocument.load(body);
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const cm = 72 / 2.54;
  const inset = 0.8 * cm;
  doc.getPages().forEach((page, i) => {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: inset, y: inset, width: width - inset * 2, height: height - inset * 2,
      borderWidth: 0.5, borderColor: rgb(0x16 / 255, 0x1c / 255, 0x1a / 255),
    });
    const label = String(i + 1);
    const size = 10;
    page.drawText(label, { x: (width - font.widthOfTextAtSize(label, size)) / 2, y: 1.6 * cm, size, font, color: rgb(0x4d / 255, 0x55 / 255, 0x50 / 255) });
  });
  if (cover) {
    const coverDoc = await PDFDocument.load(cover);
    const [first] = await doc.copyPages(coverDoc, [0]);
    doc.insertPage(0, first);
  }
  return Buffer.from(await doc.save());
}

export async function renderPdf(html: string, coverHtml: string | null = null): Promise<Buffer> {
  if (pending >= MAX_PENDING) throw new PdfBusyError("Sedang banyak permintaan PDF. Coba lagi sebentar lagi.");
  pending++;
  const run = queue.then(() => render(html, coverHtml));
  queue = run.catch(() => undefined);
  try {
    return await run;
  } finally {
    pending--;
  }
}
