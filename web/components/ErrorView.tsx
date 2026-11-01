"use client";

/** Tampilan saat terjadi kesalahan, dipakai oleh error.tsx di situs dan panel. */
export function ErrorView({ reset, digest, inPanel = false }: { reset: () => void; digest?: string; inPanel?: boolean }) {
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

