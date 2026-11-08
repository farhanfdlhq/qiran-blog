"use client";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Pemilih tanggal dan jam (WIB) bergaya qiran, pengganti input datetime-local bawaan browser.
 * Nilai memakai format yang sama dengan datetime-local: "YYYY-MM-DDTHH:mm", atau "" kalau kosong.
 */
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const pad = (n: number) => String(n).padStart(2, "0");

function nowWib() {
  const d = new Date(Date.now() + 7 * 3600_000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

function parse(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3], h: +m[4], min: +m[5] } : null;
}

const toValue = (p: { y: number; m: number; d: number; h: number; min: number }) => `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;

export function formatWib(v: string): string {
  const p = parse(v);
  if (!p) return "";
  const day = HARI[(new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay() + 6) % 7];
  return `${day}, ${p.d} ${BULAN[p.m]} ${p.y} · ${pad(p.h)}.${pad(p.min)} WIB`;
}

export function DateTimeField({ id, value, onChange, describedBy, placeholder = "Pilih tanggal dan jam", dateOnly = false }: {
  id?: string;
  /** "YYYY-MM-DDTHH:mm", atau "YYYY-MM-DD" kalau dateOnly */
  value: string;
  onChange: (v: string) => void;
  describedBy?: string;
  placeholder?: string;
  dateOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sel = parse(dateOnly && value ? `${value}T00:00` : value);
  const today = nowWib();
  const [view, setView] = useState({ y: sel?.y ?? today.y, m: sel?.m ?? today.m });
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const hourList = useRef<HTMLDivElement>(null);
  const minList = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const s = parse(dateOnly && value ? `${value}T00:00` : value);
    setView({ y: s?.y ?? today.y, m: s?.m ?? today.m });
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    // Jam dan menit yang terpilih langsung terlihat di daftarnya
    requestAnimationFrame(() => {
      hourList.current?.querySelector(".is-selected")?.scrollIntoView({ block: "center" });
      minList.current?.querySelector(".is-selected")?.scrollIntoView({ block: "center" });
    });
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch: Partial<{ y: number; m: number; d: number; h: number; min: number }>) => {
    const base = sel ?? { ...today, h: 8, min: 0 };
    const next = toValue({ ...base, ...patch });
    onChange(dateOnly ? next.slice(0, 10) : next);
  };

  // Kalender mulai Senin
  const first = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const move = (delta: number) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  if (sel && sel.min % 5) minutes.push(sel.min), minutes.sort((a, b) => a - b);

  return (
    <div className="dtf" ref={wrap}>
      <button ref={button} id={id} type="button" className={`dtf-button${value ? "" : " is-empty"}`} aria-haspopup="dialog" aria-expanded={open}
        aria-controls={panelId} aria-describedby={describedBy} onClick={() => setOpen((o) => !o)}>
        <span>{value ? (dateOnly ? formatWib(`${value}T00:00`).replace(/ · .*$/, "") : formatWib(value)) : placeholder}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      {open ? (
        <div className={`dtf-panel${dateOnly ? " is-date-only" : ""}`} id={panelId} role="dialog" aria-label={dateOnly ? "Pilih tanggal" : "Pilih tanggal dan jam"}>
          <div className="dtf-cal">
            <div className="dtf-head">
              <button type="button" className="dtf-nav" onClick={() => move(-1)} aria-label="Bulan sebelumnya">‹</button>
              <span className="dtf-month" aria-live="polite">{BULAN[view.m]} {view.y}</span>
              <button type="button" className="dtf-nav" onClick={() => move(1)} aria-label="Bulan berikutnya">›</button>
            </div>
            <div className="dtf-grid" role="grid">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => <span key={d} className="dtf-dow" aria-hidden="true">{d}</span>)}
              {cells.map((d, i) => d === null ? <span key={i} /> : (
                <button key={i} type="button"
                  className={`dtf-day${sel && sel.y === view.y && sel.m === view.m && sel.d === d ? " is-selected" : ""}${today.y === view.y && today.m === view.m && today.d === d ? " is-today" : ""}`}
                  aria-label={`${d} ${BULAN[view.m]} ${view.y}`} aria-pressed={!!sel && sel.y === view.y && sel.m === view.m && sel.d === d}
                  onClick={() => set({ y: view.y, m: view.m, d })}>{d}</button>
              ))}
            </div>
          </div>
          {dateOnly ? null : <div className="dtf-time" aria-label="Jam (WIB)">
            <div className="dtf-col" ref={hourList} role="listbox" aria-label="Jam">
              {Array.from({ length: 24 }, (_, h) => (
                <button key={h} type="button" role="option" aria-selected={sel?.h === h} className={`dtf-t${sel?.h === h ? " is-selected" : ""}`} onClick={() => set({ h })}>{pad(h)}</button>
              ))}
            </div>
            <div className="dtf-col" ref={minList} role="listbox" aria-label="Menit">
              {minutes.map((m) => (
                <button key={m} type="button" role="option" aria-selected={sel?.min === m} className={`dtf-t${sel?.min === m ? " is-selected" : ""}`} onClick={() => set({ min: m })}>{pad(m)}</button>
              ))}
            </div>
          </div>}
          <div className="dtf-foot">
            <button type="button" className="textbtn" onClick={() => { onChange(""); setOpen(false); }}>Kosongkan</button>
            <button type="button" className="textbtn" onClick={() => { const n = nowWib(); const v = toValue({ ...n, min: Math.ceil(n.min / 5) * 5 >= 60 ? 55 : Math.ceil(n.min / 5) * 5 }); onChange(dateOnly ? v.slice(0, 10) : v); setView({ y: n.y, m: n.m }); }}>{dateOnly ? "Hari ini" : "Sekarang"}</button>
            <button type="button" className="btn btn-small" onClick={() => { setOpen(false); button.current?.focus(); }}>Selesai</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
