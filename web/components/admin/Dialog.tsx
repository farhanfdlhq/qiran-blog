"use client";
import { useEffect, useRef } from "react";
import { validateForm } from "@/lib/validate";

type Field = { name: string; label: string; type?: "text" | "url"; value?: string; placeholder?: string; hint?: string; required?: boolean };

/** Kotak dialog kecil berisi formulir, pengganti window.prompt. Escape atau klik Batal untuk menutup. */
export function FormDialog({ open, title, fields, submitLabel, extraAction, onSubmit, onClose }: {
  open: boolean;
  title: string;
  fields: Field[];
  submitLabel: string;
  extraAction?: { label: string; onClick: () => void };
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="dialog-title">
      {open ? (
        <form
          className="form"
          method="dialog"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!validateForm(e.currentTarget)) return;
            const data = new FormData(e.currentTarget);
            onSubmit(Object.fromEntries(fields.map((f) => [f.name, String(data.get(f.name) ?? "").trim()])));
          }}
        >
          <h2 className="dialog-title" id="dialog-title">{title}</h2>
          {fields.map((f, i) => (
            <div className="field" key={f.name}>
              <label htmlFor={`dlg-${f.name}`}>{f.label}</label>
              <input id={`dlg-${f.name}`} name={f.name} type={f.type ?? "text"} defaultValue={f.value} placeholder={f.placeholder}
                required={f.required} autoFocus={i === 0} aria-describedby={f.hint ? `dlg-${f.name}-hint` : undefined} />
              {f.hint ? <p className="hint" id={`dlg-${f.name}-hint`}>{f.hint}</p> : null}
            </div>
          ))}
          <div className="btn-row">
            <button className="btn btn-small" type="submit">{submitLabel}</button>
            <button className="btn btn-quiet btn-small" type="button" onClick={onClose}>Batal</button>
            {extraAction ? <button className="btn btn-danger btn-small" type="button" onClick={extraAction.onClick}>{extraAction.label}</button> : null}
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
