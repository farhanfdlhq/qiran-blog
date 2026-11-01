"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/actions/admin";
import { useFeedback } from "@/components/Feedback";
import { validateForm } from "@/lib/validate";

/** Form untuk server action: validasi bergaya situs, hasil sebagai notifikasi, dan kartu rahasia (password baru) yang bisa disalin. */
export function ActionForm({ action, children, className = "form", resetOnOk = false }: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, {});
  const { toast } = useFeedback();
  const ref = useRef<HTMLFormElement>(null);
  const [secret, setSecret] = useState<{ label: string; value: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state.message && !state.secret) return;
    if (state.message) toast(state.message, state.ok ? "ok" : "err");
    if (state.secret) setSecret({ label: state.secretLabel ?? "Password sementara", value: state.secret });
    if (state.ok && resetOnOk) ref.current?.reset();
  }, [state, toast, resetOnOk]);

  return (
    <>
      <form ref={ref} className={className} action={run} noValidate onSubmit={(e) => { if (!validateForm(e.currentTarget)) e.preventDefault(); }}>
        <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>{children}</fieldset>
      </form>
      {secret ? (
        <div className="secret" role="status">
          <p className="secret-label">{secret.label}</p>
          <p className="secret-value"><code>{secret.value}</code></p>
          <p className="hint">Hanya tampil sekali. Sampaikan langsung ke orangnya, lalu minta diganti di menu Akun saya.</p>
          <div className="btn-row">
            <button type="button" className="btn btn-small" onClick={async () => {
              try { await navigator.clipboard.writeText(secret.value); setCopied(true); toast("Password disalin."); } catch { toast("Gagal menyalin. Pilih teksnya lalu salin manual.", "err"); }
            }}>{copied ? "Tersalin" : "Salin password"}</button>
            <button type="button" className="btn btn-quiet btn-small" onClick={() => { setSecret(null); setCopied(false); }}>Tutup</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
