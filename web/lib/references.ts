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

export function referenceLines(text: string): string[] {
  return String(text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** Isi <li> untuk setiap sumber. Kosong kalau tidak ada sumber. */
export function referencesHtml(text: string): string {
  return referenceLines(text).map((l) => `<li>${line(l)}</li>`).join("");
}
