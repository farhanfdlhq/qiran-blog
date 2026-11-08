"use client";
import { useEffect, useState } from "react";

/** Halaman dibuka sebelum situs diperbarui, lalu formnya dikirim setelahnya: kodenya sudah tidak cocok. */
function isStaleDeploy(error?: Error): boolean {
  return !!error && (error.name === "UnrecognizedActionError" || /Server Action .* was not found|Failed to find Server Action/i.test(error.message));
}

/** Tampilan saat terjadi kesalahan, dipakai oleh error.tsx di situs dan panel. */
export function ErrorView({ reset, digest, error, inPanel = false }: { reset: () => void; digest?: string; error?: Error; inPanel?: boolean }) {
  const stale = isStaleDeploy(error);
  const [reloading, setReloading] = useState(false);

  // Muat ulang otomatis sekali; kalau dalam 30 detik terjadi lagi, biarkan penulis memilih sendiri
  useEffect(() => {
    if (!stale) return;
    let last = 0;
    try { last = Number(sessionStorage.getItem("qiran-stale-reload") || 0); } catch {}
    if (Date.now() - last < 30_000) return;
    try { sessionStorage.setItem("qiran-stale-reload", String(Date.now())); } catch {}
    setReloading(true);
    location.reload();
  }, [stale]);

  if (stale) {
    return (
      <div className={inPanel ? "state-view" : "error"} role="alert">
        <h1 className={inPanel ? "admin-title" : "error-title"}>Situs baru saja diperbarui.</h1>
        <p className={inPanel ? "admin-sub" : "hero-text"}>
          {reloading ? "Memuat ulang halaman…" : "Halaman ini dibuka sebelum pembaruan. Muat ulang, lalu ulangi langkah terakhirmu."}
        </p>
        <div className="btn-row">
          <button className="btn" type="button" onClick={() => location.reload()} disabled={reloading}>Muat ulang</button>
        </div>
      </div>
    );
  }

  return (
    <div className={inPanel ? "state-view" : "error"} role="alert">
      <h1 className={inPanel ? "admin-title" : "error-title"}>Ada yang tidak beres.</h1>
      <p className={inPanel ? "admin-sub" : "hero-text"}>
        Halaman ini gagal dimuat. Biasanya hanya sebentar: coba lagi, atau kembali ke halaman sebelumnya.
        {digest ? <> Kalau terus terjadi, sebutkan kode <code>{digest}</code> ke admin.</> : null}
      </p>
      <div className="btn-row">
        <button className="btn" type="button" onClick={() => reset()}>Coba lagi</button>
        <a className={inPanel ? "btn btn-quiet" : "textlink"} href={inPanel ? "/admin/" : "/"}>{inPanel ? "Ke daftar tulisan" : "Kembali ke beranda"}</a>
      </div>
    </div>
  );
}
