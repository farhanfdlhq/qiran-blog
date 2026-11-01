"use client";
import { useEffect, useState } from "react";

/** Tombol bagikan: WhatsApp, salin tautan, dan menu bagikan bawaan HP (kalau tersedia). */
export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState<"idle" | "ok" | "err">("idle");
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const wa = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
  return (
    <section className="share" aria-labelledby="share-title">
      <h2 className="share-title" id="share-title">Bagikan tulisan ini</h2>
      <div className="share-row">
        <a className="share-btn" href={wa} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.2-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" /></svg>
          WhatsApp
        </a>
        <button type="button" className="share-btn" onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopied("ok"); } catch { setCopied("err"); }
          setTimeout(() => setCopied("idle"), 2500);
        }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
          {copied === "ok" ? "Tautan tersalin" : "Salin tautan"}
        </button>
        {canShare ? (
          <button type="button" className="share-btn" onClick={() => navigator.share({ title, url }).catch(() => {})}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
            Lainnya
          </button>
        ) : null}
      </div>
      <p className="hp" role="status" aria-live="polite">{copied === "ok" ? "Tautan disalin" : copied === "err" ? "Gagal menyalin tautan" : ""}</p>
      {copied === "err" ? <p className="form-note">Gagal menyalin otomatis. Salin dari kolom alamat browser.</p> : null}
    </section>
  );
}
