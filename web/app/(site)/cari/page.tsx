import type { Metadata } from "next";
import { search } from "@/lib/posts";
import { Row } from "@/components/PostList";

export const metadata: Metadata = { title: "Cari tulisan", robots: { index: false } };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").slice(0, 100);
  const results = q ? search(q) : [];
  return (
    <section className="archive archive-top" aria-labelledby="archive-title">
      <div className="archive-col">
        <h1 className="archive-title" id="archive-title">Cari tulisan</h1>
        <form className="search-form" action="/cari/" method="get" role="search">
          <label className="hp" htmlFor="q">Kata kunci</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Misalnya: hujan, debat, fotosintesis" autoFocus={!q} />
          <button className="btn" type="submit">Cari</button>
        </form>
        {q ? (
          results.length ? (
            <>
              <p className="lead-soft">{results.length} tulisan cocok dengan “{q}”.</p>
              <ol className="rows">{results.map((p) => <Row key={p.id} post={p} />)}</ol>
            </>
          ) : (
            <p className="lead-soft">Tidak ada tulisan yang cocok dengan “{q}”. Coba kata lain, atau lihat <a className="textlink" href="/#tulisan">semua tulisan</a>.</p>
          )
        ) : null}
      </div>
    </section>
  );
}
