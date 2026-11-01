"use client";
import { useId, useMemo, useRef, useState } from "react";

const MAX_TAGS = 8;
const MAX_LEN = 40;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, MAX_LEN);
const same = (a: string, b: string) => a.toLocaleLowerCase("id") === b.toLocaleLowerCase("id");

/**
 * Kolom tag berbentuk chip dengan saran (pola combobox).
 * Ketik lalu Enter atau koma untuk menambah, Backspace di kolom kosong untuk menghapus chip terakhir,
 * panah atas/bawah untuk memilih saran. Tag pertama adalah tag utama.
 */
export function TagInput({ id, value, onChange, suggestions, describedBy }: {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: { name: string; count: number }[];
  describedBy?: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const full = value.length >= MAX_TAGS;

  const options = useMemo(() => {
    const q = norm(text).toLocaleLowerCase("id");
    const pool = suggestions.filter((s) => !value.some((v) => same(v, s.name)));
    const matched = q ? pool.filter((s) => s.name.toLocaleLowerCase("id").includes(q)) : pool;
    const list = matched.sort((a, b) => b.count - a.count).slice(0, 6).map((s) => ({ label: s.name, value: s.name, isNew: false, count: s.count }));
    const exact = norm(text) && (suggestions.some((s) => same(s.name, norm(text))) || value.some((v) => same(v, norm(text))));
    if (norm(text) && !exact) list.push({ label: `Buat tag baru “${norm(text)}”`, value: norm(text), isNew: true, count: 0 });
    return list;
  }, [text, suggestions, value]);

  const add = (raw: string) => {
    const t = norm(raw);
    if (!t || full) return;
    if (value.some((v) => same(v, t))) {
      setText("");
      return;
    }
    // Pakai ejaan tag yang sudah ada supaya tidak muncul "Opini" dan "opini"
    const existing = suggestions.find((s) => same(s.name, t));
    onChange([...value, existing ? existing.name : t]);
    setText("");
    setActive(0);
  };

  const remove = (i: number) => {
    onChange(value.filter((_, j) => j !== i));
    inputRef.current?.focus();
  };

  const makePrimary = (i: number) => {
    if (i === 0) return;
    const next = [...value];
    const [t] = next.splice(i, 1);
    onChange([t, ...next]);
  };

  const showList = open && !full && options.length > 0;

  return (
    <div className={`tag-input${full ? " is-full" : ""}`} onClick={() => inputRef.current?.focus()}>
      {value.length ? (
        <ul className="tag-chips" aria-label="Tag terpilih">
          {value.map((t, i) => (
            <li key={t} className={`tag-chip${i === 0 ? " is-primary" : ""}`}>
              <button type="button" className="tag-chip-label" onClick={(e) => { e.stopPropagation(); makePrimary(i); }}
                title={i === 0 ? "Tag utama" : "Jadikan tag utama"} aria-label={i === 0 ? `${t}, tag utama` : `${t}, jadikan tag utama`}>
                {t}
              </button>
              <button type="button" className="tag-chip-x" onClick={(e) => { e.stopPropagation(); remove(i); }} aria-label={`Hapus tag ${t}`}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="tag-combo">
        <input
          ref={inputRef}
          id={id}
          value={text}
          disabled={full}
          maxLength={MAX_LEN + 1}
          autoComplete="off"
          spellCheck={false}
          placeholder={full ? `Maksimal ${MAX_TAGS} tag` : value.length ? "Tambah tag lain" : "Ketik tag, lalu Enter"}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-describedby={describedBy}
          onFocus={() => setOpen(true)}
          onBlur={() => { if (norm(text)) add(text); setTimeout(() => setOpen(false), 120); }}
          onChange={(e) => {
            const v = e.target.value;
            // Koma (juga dari keyboard HP) langsung memecah jadi tag
            if (v.includes(",")) {
              const parts = v.split(",");
              const rest = parts.pop() ?? "";
              let next = [...value];
              for (const p of parts) {
                const t = norm(p);
                if (t && next.length < MAX_TAGS && !next.some((x) => same(x, t))) next.push(suggestions.find((s) => same(s.name, t))?.name ?? t);
              }
              if (next.length !== value.length) onChange(next);
              setText(rest);
            } else setText(v);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && showList) { e.preventDefault(); setActive((a) => (a + 1) % options.length); }
            else if (e.key === "ArrowUp" && showList) { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); }
            else if (e.key === "Enter") {
              if (showList && options[active]) { e.preventDefault(); add(options[active].value); }
              else if (norm(text)) { e.preventDefault(); add(text); }
            } else if (e.key === "Escape") setOpen(false);
            else if (e.key === "Backspace" && !text && value.length) remove(value.length - 1);
          }}
        />
        {showList ? (
          <ul className="tag-options" id={listId} role="listbox" aria-label="Saran tag">
            {options.map((o, i) => (
              <li key={o.value + o.isNew} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                className={`tag-option${i === active ? " is-active" : ""}${o.isNew ? " is-new" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); add(o.value); }} onMouseEnter={() => setActive(i)}>
                <span>{o.label}</span>
                {!o.isNew ? <span className="tag-option-count">{o.count} tulisan</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
