import { listPublished, getPublishedBySlug, excerptOf } from "@/lib/posts";
import { siteSettings } from "@/lib/settings";
import { formatTanggal } from "@/lib/time";
import { readingMinutes, jsonLd as toJsonLd } from "@/lib/text";
import { imgSrcSet, postPath, siteUrl } from "@/lib/site";
import { ArchiveList } from "@/components/PostList";

export default function Home() {
  const s = siteSettings();
  const { items, page, pages } = listPublished({ page: 1 });
  const latest = s.show_latest === "1" ? items[0] : undefined;
  const about = getPublishedBySlug("tentang", "page");
  const jsonLd = { "@context": "https://schema.org", "@type": "WebSite", name: s.site_title, url: siteUrl("/"), description: s.site_description, inLanguage: "id-ID" };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <section className="hero" aria-labelledby="hero-title">
        <h1 className="hero-title js-lines" id="hero-title">{s.hero_heading || s.site_title}</h1>
        <div className="hero-foot">
          <p className="hero-text">{s.hero_text || s.site_description}</p>
          {items.length ? <a className="btn hero-btn" href="#tulisan">Baca tulisan</a> : null}
        </div>
      </section>

      {latest ? (
        <>
          <section className="latest" aria-labelledby="latest-title">
            <div className="latest-inner">
              <h2 className="latest-title reveal" id="latest-title"><a href={postPath(latest.slug)}>{latest.title}</a></h2>
              <p className="latest-text reveal">{excerptOf(latest, 220)}</p>
              <div className="latest-foot reveal">
                <a className="btn btn-ink" href={postPath(latest.slug)}>Baca sampai habis</a>
                <p className="latest-meta">{latest.author?.name}, {formatTanggal(latest.published_at)}, {readingMinutes(latest.plain_text)} menit baca</p>
              </div>
            </div>
          </section>
          {latest.feature_image ? (
            <figure className="relief">
              <img className="relief-img" src={latest.feature_image} srcSet={imgSrcSet(latest.feature_image)} sizes="100vw"
                alt={latest.feature_image_alt || latest.title} width={2000} height={1125} loading="lazy" />
              {latest.feature_image_caption ? <figcaption dangerouslySetInnerHTML={{ __html: latest.feature_image_caption }} /> : null}
            </figure>
          ) : null}
        </>
      ) : null}

      {items.length ? (
        <ArchiveList posts={items} withFilter title="Semua tulisan" page={page} pages={pages} base="/" />
      ) : (
        <section className="archive" id="tulisan" aria-labelledby="archive-title">
          <div className="archive-col">
            <h2 className="archive-title" id="archive-title">Belum ada tulisan</h2>
            <p className="lead-soft">Tulisan pertama sedang disiapkan. Kalau kamu penulisnya, <a className="textlink" href="/admin/">masuk ke panel</a> untuk mulai.</p>
          </div>
        </section>
      )}

      {about ? (
        <section className="about" aria-labelledby="about-title">
          <h2 className="about-title reveal" id="about-title">Tentang {s.site_title}</h2>
          <div className="about-body reveal" dangerouslySetInnerHTML={{ __html: about.content_html }} />
        </section>
      ) : null}
    </>
  );
}
