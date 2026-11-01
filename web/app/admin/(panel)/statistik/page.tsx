import { requireUser } from "@/lib/auth";
import { dailyViews, topPosts } from "@/lib/stats";
import { formatTanggal } from "@/lib/time";

export default async function StatsPage() {
  const user = await requireUser();
  const authorId = user.role === "admin" ? undefined : user.id;
  const days = 30;
  const daily = dailyViews(days, authorId);
  const map = new Map(daily.map((d) => [d.day, d.n]));
  const series: { day: string; n: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() + 7 * 3600_000 - i * 86400_000).toISOString().slice(0, 10);
    series.push({ day, n: map.get(day) ?? 0 });
  }
  const total = series.reduce((a, b) => a + b.n, 0);
  const max = Math.max(1, ...series.map((s) => s.n));
  const top = topPosts(10, authorId);
  const fmt = (d: string) => formatTanggal(`${d}T05:00:00.000Z`, true);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Statistik</h1>
          <p className="admin-sub">{user.role === "admin" ? "Semua tulisan." : "Tulisan milikmu."} Satu pembaca dihitung sekali per hari per tulisan. Tanpa cookie, tanpa layanan luar.</p>
        </div>
      </div>
      <section className="admin-section">
        <div className="stat-row">
          <div><p className="stat-num">{total}</p><p className="stat-label">pembaca dalam 30 hari</p></div>
          <div><p className="stat-num">{series.slice(-7).reduce((a, b) => a + b.n, 0)}</p><p className="stat-label">7 hari terakhir</p></div>
          <div><p className="stat-num">{series[series.length - 1].n}</p><p className="stat-label">hari ini</p></div>
        </div>
        <h2>Pembaca per hari, 30 hari terakhir</h2>
        <div className="bars" role="img" aria-label={`Grafik pembaca per hari. Total ${total} dalam 30 hari.`}>
          {series.map((s) => (
            <div key={s.day} className="bar" style={{ height: `${Math.max(2, (s.n / max) * 100)}%`, opacity: s.n ? 1 : 0.35 }} title={`${fmt(s.day)}: ${s.n} pembaca`} />
          ))}
        </div>
        <div className="bars-axis"><span>{fmt(series[0].day)}</span><span>{fmt(series[series.length - 1].day)}</span></div>
      </section>
      <section className="admin-section">
        <h2>Tulisan paling banyak dibaca</h2>
        {top.length ? (
          <ul className="list">
            {top.map((p) => (
              <li className="list-item" key={p.id}>
                <a className="list-title" href={`/${p.slug}/`} target="_blank" rel="noopener">{p.title}</a>
                <div className="list-side">{p.n} pembaca</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Belum ada data. Angka muncul setelah ada yang membaca tulisan.</p>
        )}
      </section>
    </>
  );
}
