import type { PostFull } from "@/lib/posts";
import { excerptOf } from "@/lib/posts";
import { formatTanggal, wibYear } from "@/lib/time";
import { imgVariant, postPath } from "@/lib/site";
import { readingMinutes } from "@/lib/text";

export function Row({ post }: { post: PostFull }) {
  const tag = post.tags[0];
  return (
    <li className="row reveal" data-slug={post.slug} data-year={post.published_at ? wibYear(post.published_at) : ""} data-author={post.author?.slug ?? ""}>
      <a className="row-link" href={postPath(post.slug)}>
        <span className="row-dot" aria-hidden="true">
          {post.author?.avatar ? <img src={imgVariant(post.author.avatar, 720)} alt="" width={16} height={16} loading="lazy" /> : null}
        </span>
        <span className="row-main">
          <span className="row-title">{post.title}</span>
          <span className="row-sub">{tag ? `${tag.name} · ` : ""}{post.author?.name}</span>
        </span>
        <time className="row-date" dateTime={post.published_at ?? ""}>{formatTanggal(post.published_at, true)}</time>
      </a>
    </li>
  );
}

export function Peek({ post, first }: { post: PostFull; first: boolean }) {
  return (
    <div className={`peek${first ? " is-on" : ""}`} data-peek={post.slug}>
      {post.feature_image ? (
        <img className="peek-img" src={imgVariant(post.feature_image, 720)} alt={post.feature_image_alt || post.title} width={720} height={540} loading="lazy" />
      ) : null}
      <p className="peek-text">{excerptOf(post, 200)}</p>
      <p className="peek-meta">{post.author?.name} · {readingMinutes(post.plain_text)} menit baca</p>
    </div>
  );
}

export function Pagination({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (n: number) => (n === 1 ? base : `${base}page/${n}/`);
  return (
    <nav className="pager" aria-label="Halaman">
      {page > 1 ? <a className="textlink" href={href(page - 1)}>Lebih baru</a> : <span />}
      <span className="pager-info">Halaman {page} dari {pages}</span>
      {page < pages ? <a className="textlink" href={href(page + 1)}>Lebih lama</a> : <span />}
    </nav>
  );
}

export function ArchiveList({ posts, withFilter, title, titleTag = "h2", lead, page, pages, base, top }: {
  posts: PostFull[];
  withFilter?: boolean;
  title: string;
  titleTag?: "h1" | "h2";
  lead?: React.ReactNode;
  page?: number;
  pages?: number;
  base?: string;
  top?: boolean;
}) {
  const authors = withFilter ? [...new Map(posts.filter((p) => p.author).map((p) => [p.author!.slug, p.author!])).values()] : [];
  const Title = titleTag;
  return (
    <section className={`archive has-peek${top ? " archive-top" : ""}`} id={top ? undefined : "tulisan"} aria-labelledby="archive-title">
      <div className="archive-col">
        <Title className={`archive-title${top ? " js-lines js-fit-title" : " reveal"}`} id="archive-title">{title}</Title>
        {lead}
        {authors.length > 1 ? (
          <div className="filter js-filter" role="group" aria-label="Saring menurut penulis" hidden>
            <button type="button" className="chip is-on" data-filter="semua" aria-pressed="true">Semua</button>
            {authors.map((a) => (
              <button key={a.slug} type="button" className="chip" data-filter={a.slug} aria-pressed="false">{a.name}</button>
            ))}
          </div>
        ) : null}
        <ol className="rows js-rows">
          {posts.map((p) => <Row key={p.id} post={p} />)}
        </ol>
        <p className="rows-empty js-empty" hidden>Belum ada tulisan dari penulis ini.</p>
        {page && pages && base ? <Pagination page={page} pages={pages} base={base} /> : null}
      </div>
      <aside className="peeks" aria-label="Pratinjau tulisan">
        {posts.map((p, i) => <Peek key={p.id} post={p} first={i === 0} />)}
      </aside>
    </section>
  );
}
