"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* =========================================================
   Notifikasi (toast) dan dialog konfirmasi bergaya qiran,
   pengganti alert/confirm bawaan browser.
   ========================================================= */

type Tone = "ok" | "err" | "info";
type Toast = { id: number; tone: Tone; text: string };
type ConfirmOptions = { title: string; body?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; altLabel?: string };
type ConfirmResult = "confirm" | "alt" | "cancel";

type Ctx = {
  toast: (text: string, tone?: Tone) => void;
  confirm: (opts: ConfirmOptions) => Promise<ConfirmResult>;
};

const FeedbackContext = createContext<Ctx | null>(null);

export function useFeedback(): Ctx {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback harus di dalam <FeedbackProvider>");
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (r: ConfirmResult) => void }) | null>(null);
  const seq = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((text: string, tone: Tone = "ok") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => dismiss(id), tone === "err" ? 7000 : 3500);
  }, [dismiss]);

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<ConfirmResult>((resolve) => setPending({ ...opts, resolve })), []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (pending && !d.open) d.showModal();
    if (!pending && d.open) d.close();
  }, [pending]);

  const finish = (r: ConfirmResult) => {
    pending?.resolve(r);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} role={t.tone === "err" ? "alert" : "status"}>
            <span className="toast-mark" aria-hidden="true" />
            <p className="toast-text">{t.text}</p>
            <button type="button" className="toast-close" aria-label="Tutup pemberitahuan" onClick={() => dismiss(t.id)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        ))}
      </div>
      <dialog ref={dialogRef} className="dialog confirm" aria-labelledby="confirm-title" aria-describedby="confirm-body"
        onCancel={(e) => { e.preventDefault(); finish("cancel"); }}>
        {pending ? (
          <>
            <h2 className="dialog-title" id="confirm-title">{pending.title}</h2>
            {pending.body ? <p className="confirm-body" id="confirm-body">{pending.body}</p> : null}
            <div className="btn-row">
              <button type="button" autoFocus className={`btn btn-small${pending.danger ? " btn-danger-solid" : ""}`} onClick={() => finish("confirm")}>{pending.confirmLabel ?? "Lanjutkan"}</button>
              {pending.altLabel ? <button type="button" className="btn btn-quiet btn-small" onClick={() => finish("alt")}>{pending.altLabel}</button> : null}
              <button type="button" className="btn btn-quiet btn-small" onClick={() => finish("cancel")}>{pending.cancelLabel ?? "Batal"}</button>
            </div>
          </>
        ) : null}
      </dialog>
    </FeedbackContext.Provider>
  );
}
