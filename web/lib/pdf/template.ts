/**
 * Templat HTML untuk PDF tugas dan lomba: A4, Times New Roman 12 pt, spasi 1,5, dua kolom.
 * Patokannya karya asli penulis (label di tengah, judul tebal, isi dua kolom rata kiri-kanan,
 * gambar bernomor, Daftar Pustaka menjorok, "Disusun oleh" rata kanan). Warna dari palet qiran mode terang.
 * Tidak ada nama atau logo qiran: berkas ini atas nama penulis.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { PostFull } from "../posts";
import type { Identity } from "../users";
import { numberFigures } from "../figures";
import { referencesHtml } from "../references";

/** Naikkan kalau tampilan templat berubah, supaya PDF lama di cache dibuat ulang. */
export const TEMPLATE_VERSION = "8";

const C = { ink: "#161c1a", muted: "#4d5550", accent: "#9fc7b8", surface: "#d6d5cc" };

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

/** Gambar unggahan dibaca dari disk sebagai data URI (varian 1400px kalau ada). Selain itu: null. */
function localImage(src: string, uploadsDir: string, preferSmall = true): string | null {
  if (!src.startsWith("/uploads/")) return null;
  const rel = decodeURIComponent(src.slice("/uploads/".length).split("?")[0]);
  const original = path.resolve(/*turbopackIgnore: true*/ uploadsDir, rel);
  if (!original.startsWith(path.resolve(uploadsDir) + path.sep)) return null;
  const variant = original.replace(/\.(jpe?g|png|webp)$/i, "-w1400.$1");
  const file = preferSmall && fs.existsSync(variant) ? variant : original;
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type || !fs.existsSync(file)) return null;
  return `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
}

const MISSING = `<span class="img-missing">Gambar tidak tersedia di PDF</span>`;

/** Ganti setiap <img> di isi tulisan: unggahan jadi data URI, gambar dari luar jadi kotak keterangan. */
function inlineImages(html: string, uploadsDir: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = /\ssrc="([^"]*)"/i.exec(tag)?.[1] ?? "";
    const alt = /\salt="([^"]*)"/i.exec(tag)?.[1] ?? "";
    const data = localImage(src.replace(/&amp;/g, "&"), uploadsDir);
    return data ? `<img src="${data}" alt="${alt}">` : MISSING;
  });
}

export function pdfHtml(post: PostFull, identity: Identity, authorName: string, opts: { uploadsDir: string }): string {
  const label = post.pdf_label || post.tags[0]?.name || "";
  const title = post.pdf_subtitle ? `${post.title}: ${post.pdf_subtitle}` : post.title;
  const name = identity.full_name || authorName;
  const byline = [name, identity.school, identity.region].map((s) => s.trim()).filter(Boolean).join(", ");
  // Kalau halaman sampul berfoto dipakai, foto yang sama tidak diulang di halaman isi
  const cover = post.feature_image && !post.pdf_cover ? localImage(post.feature_image, opts.uploadsDir) : null;
  const full = inlineImages(numberFigures(post.content_html), opts.uploadsDir);
  // Kutipan di awal tulisan (beserta paragraf sesudahnya) jadi pembuka selebar halaman, seperti versi revisi
  const open = /^\s*(<blockquote>[\s\S]*?<\/blockquote>)\s*(<p>[\s\S]*?<\/p>)?/.exec(full);
  const opener = open ? `<div class="opener">${open[1]}${open[2] ? open[2].replace(/^<p>/, '<p class="lead">') : ""}</div>` : "";
  const body = open ? full.slice(open[0].length) : full;
  const refs = referencesHtml(post.references_text);

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
@page { size: A4; margin: 4cm 3cm 3cm 4cm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0; color: ${C.ink}; background: #fff;
  font-family: "Times New Roman", "Liberation Serif", Tinos, serif;
  font-size: 12pt; line-height: 1.725; /* spasi 1,5 seperti Word */
  font-kerning: normal;
}
.label { margin: 0 0 4pt; text-align: center; font-weight: bold; text-transform: uppercase; letter-spacing: .02em; }
h1 { margin: 0 0 16pt; text-align: center; font-size: 14pt; line-height: 1.4; font-weight: bold; }
.cover { margin: 0 0 14pt; text-align: center; break-inside: avoid; }
.cover img { max-width: 100%; max-height: 7cm; object-fit: contain; }
.cover figcaption { margin-top: 3pt; font-size: 10pt; line-height: 1.2; font-style: italic; color: ${C.muted}; }
.cols { column-count: 2; column-gap: 1.27cm; column-fill: balance; }
.cols p { margin: 0 0 6pt; text-indent: 1.27cm; text-align: justify; hyphens: auto; orphans: 2; widows: 2; }
.cols h2, .cols h3, .cols h4 { margin: 10pt 0 4pt; font-size: 12pt; line-height: 1.4; break-after: avoid; }
.cols h3, .cols h4 { font-style: italic; }
/* Pembuka: kutipan besar dengan garis aksen di tepi kiri tulisan, lalu pengantar */
.opener { margin: 0 0 14pt; break-inside: avoid; }
.opener blockquote { margin: 0; padding: 1pt 0 1pt 10pt; border-left: 3pt solid ${C.accent}; font-style: italic; font-size: 13pt; line-height: 1.5; }
.opener blockquote p { margin: 0; text-indent: 0; text-align: left; }
.opener .lead { margin: 6pt 0 0; padding-left: 13pt; text-indent: 0; text-align: justify; color: ${C.muted}; }
/* Kutipan di dalam kolom: rata dengan tepi kolom, garis aksen di atas dan garis tipis di bawah */
.cols blockquote { margin: 8pt 0 10pt; padding: 6pt 0 7pt; border-top: 2pt solid ${C.accent}; border-bottom: 0.5pt solid ${C.surface}; font-style: italic; font-weight: bold; line-height: 1.5; break-inside: avoid; }
.cols blockquote p { margin: 0; text-indent: 0; text-align: left; }
.cols ul, .cols ol { margin: 0 0 6pt; padding-left: 1.27cm; }
.cols li { text-align: justify; }
.cols mark { background: ${C.accent}; color: inherit; }
.cols a { color: inherit; text-decoration: underline; text-decoration-color: ${C.accent}; text-decoration-thickness: 1.5pt; }
.cols hr { border: 0; text-align: center; margin: 8pt 0; }
.cols hr::after { content: "* * *"; letter-spacing: .5em; color: ${C.muted}; }
.cols figure { margin: 8pt 0 10pt; break-inside: avoid; }
.cols figure img, .cols > img { display: block; max-width: 100%; max-height: 9cm; margin: 0 auto; }
.cols figcaption { margin-top: 4pt; font-size: 11pt; line-height: 1.25; color: ${C.muted}; text-align: left; }
.fig-num { font-weight: bold; color: ${C.ink}; font-style: normal; }
.fig-caption, .fig-source { font-style: italic; }
.img-missing { display: block; padding: 10pt; border: 0.5pt dashed ${C.surface}; color: ${C.muted}; font-size: 10pt; text-align: center; font-style: italic; }
/* Daftar Pustaka di lembar sendiri, satu kolom penuh, seperti dokumen akademis */
.refs-page { break-before: page; }
.refs-title { margin: 0 0 12pt; text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; break-after: avoid; }
.refs { margin: 0; padding: 0; list-style: none; }
.refs li { margin: 0 0 6pt; padding-left: 1.27cm; text-indent: -1.27cm; text-align: left; overflow-wrap: anywhere; }
.refs a { color: inherit; text-decoration: underline; text-decoration-color: ${C.accent}; text-decoration-thickness: 1.5pt; }
.byline { margin: 18pt 0 0; text-align: right !important; text-indent: 0 !important; break-inside: avoid; }
</style>
</head>
<body>
${label ? `<p class="label">${esc(label)}</p>` : ""}
<h1>${esc(title)}</h1>
${cover ? `<figure class="cover"><img src="${cover}" alt="">${post.feature_image_caption ? `<figcaption>${esc(post.feature_image_caption)}</figcaption>` : ""}</figure>` : ""}
${opener}
<div class="cols">
${body}
${!refs && byline ? `<p class="byline">Disusun oleh: ${esc(byline)}</p>` : ""}
</div>
${refs ? `<section class="refs-page">
<h2 class="refs-title">Daftar Pustaka</h2>
<ol class="refs">${refs}</ol>
${byline ? `<p class="byline">Disusun oleh: ${esc(byline)}</p>` : ""}
</section>` : ""}
</body>
</html>`;
}

/**
 * Halaman sampul berfoto (opsional): foto sampul memenuhi halaman, judul dan identitas di atasnya.
 * Tetap Times New Roman, warna dari palet qiran mode terang. Null kalau tidak dipakai atau foto tidak ada.
 */
export function pdfCoverHtml(post: PostFull, identity: Identity, authorName: string, opts: { uploadsDir: string }): string | null {
  if (!post.pdf_cover || !post.feature_image) return null;
  const photo = localImage(post.feature_image, opts.uploadsDir, false);
  if (!photo) return null;
  const label = post.pdf_label || post.tags[0]?.name || "";
  const year = (post.published_at ? new Date(post.published_at) : new Date()).getFullYear();
  const name = identity.full_name || authorName;
  const place = [identity.school, identity.region].map((x) => x.trim()).filter(Boolean).join(" · ");
  const corner = [identity.school.trim(), String(year)].filter(Boolean).join(" · ");
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 210mm; height: 297mm; }
body {
  position: relative; overflow: hidden; color: #fff; background: ${C.ink};
  font-family: "Times New Roman", "Liberation Serif", Tinos, serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 55%; }
.shade { position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(22,28,26,.86) 0%, rgba(22,28,26,.55) 30%, rgba(22,28,26,0) 52%),
    linear-gradient(0deg, rgba(22,28,26,.92) 0%, rgba(22,28,26,.6) 16%, rgba(22,28,26,0) 34%); }
.top { position: absolute; top: 2cm; left: 2cm; right: 2cm; display: flex; justify-content: space-between; align-items: center; }
.pill { display: inline-block; padding: 4pt 12pt; border-radius: 999px; background: ${C.accent}; color: ${C.ink}; font-weight: bold; font-size: 10pt; letter-spacing: .06em; text-transform: uppercase; }
.corner { font-size: 10pt; letter-spacing: .08em; text-transform: uppercase; color: #e3e2da; }
.heading { position: absolute; top: 4.2cm; left: 2cm; right: 2cm; }
.bar { width: 1.6cm; height: 3pt; background: ${C.accent}; margin-bottom: 14pt; }
h1 { margin: 0; font-size: ${post.title.length > 28 ? 34 : 44}pt; line-height: 1.05; font-weight: bold; text-shadow: 0 1pt 8pt rgba(0,0,0,.35); }
.sub { margin: 12pt 0 0; max-width: 12cm; font-size: 15pt; line-height: 1.35; font-style: italic; color: #e3e2da; }
.foot { position: absolute; left: 2cm; right: 2cm; bottom: 1.8cm; padding-top: 10pt; border-top: 0.75pt solid rgba(227,226,218,.45);
  display: flex; justify-content: space-between; align-items: flex-end; gap: 1cm; }
.name { margin: 0; font-size: 14pt; font-weight: bold; }
.place { margin: 2pt 0 0; font-size: 11pt; color: #e3e2da; }
.credit { margin: 0; max-width: 7cm; text-align: right; font-size: 8pt; font-style: italic; color: rgba(227,226,218,.8); }
</style>
</head>
<body>
<img class="photo" src="${photo}" alt="">
<div class="shade"></div>
<div class="top">${label ? `<span class="pill">${esc(label)}</span>` : "<span></span>"}<span class="corner">${esc(corner)}</span></div>
<div class="heading"><div class="bar"></div><h1>${esc(post.title)}</h1>${post.pdf_subtitle ? `<p class="sub">${esc(post.pdf_subtitle)}</p>` : ""}</div>
<div class="foot"><div><p class="name">${esc(name)}</p>${place ? `<p class="place">${esc(place)}</p>` : ""}</div>${post.feature_image_caption ? `<p class="credit">${esc(post.feature_image_caption)}</p>` : ""}</div>
</body>
</html>`;
}

export function pdfFileName(title: string, name: string): string {
  // Huruf besar-kecil dipertahankan; aksen dan tanda baca jadi garis bawah
  const part = (v: string) =>
    String(v ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return `${[part(title), part(name)].filter(Boolean).join("_") || "Tulisan"}.pdf`;
}

export function pdfCacheKey(post: PostFull, identity: Identity, authorName: string): string {
  const parts = [
    TEMPLATE_VERSION, post.title, post.pdf_label, post.pdf_subtitle, post.tags[0]?.name ?? "", post.content_html,
    post.references_text, post.feature_image, post.feature_image_caption, post.pdf_cover, identity, authorName,
  ];
  return crypto.createHash("sha1").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}
