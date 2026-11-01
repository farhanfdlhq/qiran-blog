"use client";
import { useState } from "react";

export function CopyField({ value }: { value: string }) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  return (
    <div className="feed-box">
      <code className="feed-url">{value}</code>
      <button type="button" className="btn" onClick={async () => {
        try { await navigator.clipboard.writeText(value); setState("ok"); } catch { setState("err"); }
        setTimeout(() => setState("idle"), 2500);
      }}>{state === "ok" ? "Tersalin" : "Salin alamat"}</button>
      <span className="hp" role="status" aria-live="polite">{state === "ok" ? "Alamat disalin" : state === "err" ? "Gagal menyalin, pilih teksnya lalu salin manual" : ""}</span>
      {state === "err" ? <p className="form-note" style={{ width: "100%" }}>Gagal menyalin otomatis. Pilih alamat di atas lalu salin manual.</p> : null}
    </div>
  );
}
