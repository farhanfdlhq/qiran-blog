/** Waktu: disimpan sebagai ISO UTC, ditampilkan dan diinput dalam WIB (UTC+7). */

const WIB_OFFSET_MS = 7 * 3600_000;
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "2026-11-02T07:30" (WIB, dari input datetime-local) → ISO UTC */
export function wibInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const utc = Date.UTC(y, mo - 1, d, h, mi) - WIB_OFFSET_MS;
  return Number.isNaN(utc) ? null : new Date(utc).toISOString();
}

function wibParts(iso: string) {
  const t = new Date(new Date(iso).getTime() + WIB_OFFSET_MS);
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes() };
}

/** ISO UTC → "2026-11-02T07:30" untuk input datetime-local */
export function isoToWibInput(iso: string): string {
  const { y, mo, d, h, mi } = wibParts(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo + 1)}-${pad(d)}T${pad(h)}:${pad(mi)}`;
}

export function formatTanggal(iso: string | null | undefined, short = false): string {
  if (!iso) return "";
  const { y, mo, d } = wibParts(iso);
  return `${d} ${short ? BULAN_PENDEK[mo] : BULAN[mo]} ${y}`;
}

export function formatWaktu(iso: string): string {
  const { h, mi } = wibParts(iso);
  return `${String(h).padStart(2, "0")}.${String(mi).padStart(2, "0")} WIB`;
}

export function wibYear(iso: string): number {
  return wibParts(iso).y;
}

export function nowIso(): string {
  return new Date().toISOString();
}
