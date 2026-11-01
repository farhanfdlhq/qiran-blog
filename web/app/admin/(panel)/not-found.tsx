export default function PanelNotFound() {
  return (
    <div className="state-view">
      <h1 className="admin-title">Tidak ditemukan.</h1>
      <p className="admin-sub">Tulisan atau halaman ini tidak ada. Mungkin sudah dihapus.</p>
      <div className="btn-row"><a className="btn" href="/admin/">Ke daftar tulisan</a></div>
    </div>
  );
}
