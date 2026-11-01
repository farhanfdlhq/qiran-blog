/** Pengaturan situs yang bisa diubah admin. */
import { getDb } from "./db";

export const DEFAULTS = {
  site_title: "qiran",
  site_description: "Tulisan Qirana dan Qirani: opini, cerita, puisi, dan catatan belajar.",
  hero_heading: "Tulisan dari tengah nama.",
  hero_text: "qiran adalah bagian tengah dari Qirana dan Qirani. Di sini kami belajar menulis opini, esai, cerita, dan apa saja yang sedang dipikirkan.",
  show_latest: "1",
  comments_enabled: "1",
};
export type SettingKey = keyof typeof DEFAULTS;

export function getSetting(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  getDb().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export function siteSettings(): Record<SettingKey, string> {
  const out = { ...DEFAULTS };
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}
