"use client";
import { useRef, useState } from "react";

export function AvatarField({ initial }: { initial: string }) {
  const [url, setUrl] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload/", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    setBusy(false);
    if (data.url) setUrl(data.url);
    else setError(data.error || "Gagal mengunggah.");
  };
  return (
    <div className="field">
      <span className="hint">Foto profil (opsional)</span>
      <input type="hidden" name="avatar" value={url} />
      <div className="btn-row">
        {url ? <img src={url} alt="" width={56} height={56} style={{ borderRadius: "50%", objectFit: "cover", width: 56, height: 56 }} /> : null}
        <button className="btn btn-quiet btn-small" type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Mengunggah…" : url ? "Ganti foto" : "Pilih foto"}</button>
        {url ? <button className="btn btn-quiet btn-small" type="button" onClick={() => setUrl("")}>Hapus foto</button> : null}
      </div>
      {error ? <p className="form-msg err">{error}</p> : null}
      <p className="hint">Foto tampil sebagai bulatan kecil di daftar tulisan. Hindari foto wajah yang jelas kalau tidak ingin dikenali.</p>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
