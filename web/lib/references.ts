/** Daftar Pustaka: teks polos (satu sumber per baris) menjadi HTML aman. */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Bagian teks biasa: di-escape, lalu *x* jadi huruf miring. */
function inline(s: string): string {
  return esc(s).replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}

const URL_RE = /https?:\/\/[^\s<>"]+/g;

function line(text: string): string {
  let out = "", last = 0;
  for (const m of text.matchAll(URL_RE)) {
    // Tanda baca di ujung kalimat bukan bagian dari alamat
    const url = m[0].replace(/[.,;:)\]]+$/, "");
    out += inline(text.slice(last, m.index)) + `<a href="${esc(url)}" rel="noopener noreferrer" target="_blank">${esc(url)}</a>`;
    last = m.index! + url.length;
  }
  return out + inline(text.slice(last));
}

/** Kunci urut: tanpa tanda bintang, tanda baca di awal, dan aksen. */
function sortKey(line: string): string {
  return line.replace(/\*/g, "").replace(/^[^A-Za-z0-9\u00C0-\u024F]+/, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Sumber per baris, diurutkan sesuai abjad nama penulis seperti aturan APA. */
export function referenceLines(text: string): string[] {
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.sort((a, b) => sortKey(a).localeCompare(sortKey(b), "id"));
}

/** Isi <li> untuk setiap sumber. Kosong kalau tidak ada sumber. */
export function referencesHtml(text: string): string {
  return referenceLines(text).map((l) => `<li>${line(l)}</li>`).join("");
}

/* =========================================================
   Sumber terstruktur (seperti "Add New Source" di Microsoft Word), diformat APA 7 versi Indonesia
   ========================================================= */

export type SourceType = "berita" | "web" | "buku" | "jurnal" | "foto" | "video" | "manual";

export type Source = {
  id: string;
  type: SourceType;
  authors?: string; // satu nama per baris
  corporate?: boolean; // penulis berupa lembaga
  year?: string;
  month?: string; // "1".."12"
  day?: string;
  title?: string;
  container?: string; // nama media, situs, penerbit, jurnal, atau platform
  edition?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  accessed?: string; // YYYY-MM-DD, untuk halaman tanpa tanggal
  text?: string; // jenis "manual"
};

export const SOURCE_TYPES: { value: SourceType; label: string; hint: string }[] = [
  { value: "berita", label: "Berita daring", hint: "detikNews, RMOL" },
  { value: "web", label: "Halaman web", hint: "WHO, CDC, blog" },
  { value: "buku", label: "Buku", hint: "" },
  { value: "jurnal", label: "Artikel jurnal", hint: "" },
  { value: "foto", label: "Foto atau gambar", hint: "" },
  { value: "video", label: "Video", hint: "YouTube" },
  { value: "manual", label: "Tulis sendiri", hint: "format bebas" },
];

export const BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const clean = (v?: string) => String(v ?? "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
/** Tambah titik di akhir kecuali sudah diakhiri tanda baca. */
const end = (v: string) => (/[.?!]$/.test(v) ? v : `${v}.`);

/** "Agus Nugroho" → "Nugroho, A."; yang sudah berbentuk "Nugroho, A." dibiarkan. */
export function apaName(name: string): string {
  const n = clean(name);
  if (!n || n.includes(",")) return n;
  const parts = n.split(" ");
  if (parts.length === 1) return parts[0];
  const last = parts.pop()!;
  const initials = parts.map((p) => p.split("-").map((x) => `${x[0].toUpperCase()}.`).join("-")).join(" ");
  return `${last}, ${initials}`;
}

function authorPart(s: Source): string {
  const names = String(s.authors ?? "").split(/\n|;/).map(clean).filter(Boolean);
  if (!names.length) return "";
  const list = s.corporate ? names : names.map(apaName);
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]}, & ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, & ${list[list.length - 1]}`;
}

function datePart(s: Source, yearOnly = false): string {
  const y = clean(s.year);
  if (!y) return "(t.t.)";
  const m = Number(s.month);
  const d = Number(s.day);
  if (yearOnly || !m) return `(${y})`;
  return `(${y}, ${d ? `${d} ` : ""}${BULAN_ID[m - 1]})`;
}

function accessedPart(s: Source): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.accessed ?? "");
  return m ? `Diakses ${Number(m[3])} ${BULAN_ID[Number(m[2]) - 1]} ${m[1]}, dari ` : "";
}

/** Satu baris Daftar Pustaka dengan penanda *miring*. */
export function formatSource(s: Source): string {
  if (s.type === "manual") return clean(s.text);
  const author = authorPart(s);
  const title = clean(s.title);
  const container = clean(s.container);
  const url = clean(s.url);
  const date = datePart(s, s.type === "buku" || s.type === "jurnal");
  // Setiap jenis menghasilkan bagian judul (t) dan bagian sesudahnya (r)
  let t = "", r = "";
  switch (s.type) {
    case "buku": {
      const ed = clean(s.edition);
      t = title ? end(`*${title}*${ed ? ` (edisi ke-${ed})` : ""}`) : "";
      r = container ? end(container) : "";
      break;
    }
    case "jurnal": {
      const vol = clean(s.volume), iss = clean(s.issue), pages = clean(s.pages);
      let j = container ? `*${container}*` : "";
      if (vol) j += `, *${vol}*${iss ? `(${iss})` : ""}`;
      if (pages) j += `, ${pages}`;
      t = title ? end(title) : "";
      r = j ? end(j) : "";
      break;
    }
    case "foto":
    case "video": {
      const kind = s.type === "foto" ? "[Foto]" : "[Video]";
      t = title ? `*${title}* ${kind}.` : `${kind}.`;
      r = container ? end(container) : "";
      break;
    }
    default: {
      // Berita daring dan halaman web; nama situs tidak diulang kalau sama dengan penulis
      t = title ? end(`*${title}*`) : "";
      r = container && container.toLowerCase() !== author.toLowerCase() ? end(container) : "";
    }
  }
  const access = !clean(s.year) && url ? accessedPart(s) : "";
  // Tanpa penulis, judul pindah ke depan lalu tanggal (aturan APA)
  const parts = author ? [end(author), `${date}.`, t, r] : [t, `${date}.`, r];
  const line = parts.filter(Boolean).join(" ");
  return `${line}${url ? ` ${access}${url}` : ""}`.replace(/\s+/g, " ").trim();
}

export function newSourceId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const FIELDS: (keyof Source)[] = ["authors", "year", "month", "day", "title", "container", "edition", "volume", "issue", "pages", "url", "accessed", "text"];

/** Membaca dan merapikan daftar sumber dari JSON (data dari pengguna, jadi dibatasi). */
export function parseSources(json: string): Source[] {
  let raw: unknown;
  try { raw = JSON.parse(json || "[]"); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  const types = new Set(SOURCE_TYPES.map((t) => t.value));
  return raw.slice(0, 100).flatMap((r): Source[] => {
    if (!r || typeof r !== "object") return [];
    const o = r as Record<string, unknown>;
    const type = types.has(o.type as SourceType) ? (o.type as SourceType) : "manual";
    const s: Source = { id: String(o.id ?? newSourceId()).slice(0, 20), type, corporate: o.corporate === true };
    for (const f of FIELDS) if (typeof o[f] === "string") (s as Record<string, unknown>)[f] = (o[f] as string).slice(0, f === "text" || f === "authors" ? 1000 : 400);
    return formatSource(s) ? [s] : [];
  });
}

/** Teks Daftar Pustaka (satu sumber per baris) yang dipakai situs dan PDF. */
export function sourcesToText(sources: Source[]): string {
  return sources.map(formatSource).filter(Boolean).join("\n");
}

/** Daftar Pustaka lama (teks per baris) jadi sumber "Tulis sendiri". */
export function textToSources(text: string): Source[] {
  return referenceLines(text).map((t) => ({ id: newSourceId(), type: "manual" as const, text: t }));
}
