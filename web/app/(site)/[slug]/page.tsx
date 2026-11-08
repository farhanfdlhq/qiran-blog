import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedBySlug, getAnyBySlug, canEdit, listPublished, excerptOf, type PostFull } from "@/lib/posts";
import { listApproved } from "@/lib/comments";
import { siteSettings } from "@/lib/settings";
import { getSessionUserFromCookie } from "@/lib/auth";
import { formatTanggal } from "@/lib/time";
import { readingMinutes, jsonLd as toJsonLd } from "@/lib/text";
import { imgSrcSet, postPath, siteUrl } from "@/lib/site";
import { Row } from "@/components/PostList";
import { CommentForm } from "@/components/CommentForm";
import { ShareButtons } from "@/components/ShareButtons";
import { numberFigures } from "@/lib/figures";
import { referencesHtml } from "@/lib/references";
import { shareMeta } from "@/lib/meta";
import { ogImagePath } from "@/lib/og";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<{ post: PostFull; preview: boolean } | null> {
  const post = getPublishedBySlug(slug);
  if (post) return { post, preview: false };
  // Penulis yang login boleh melihat draf atau tulisan terjadwal miliknya
  const user = await getSessionUserFromCookie();
  const any = user ? getAnyBySlug(slug) : null;
  if (any && user && canEdit(user, any)) return { post: any, preview: true };
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load((await params).slug);
  if (!found) return {};
  const { post, preview } = found;
  const description = excerptOf(post, 200);
  const s = siteSettings();
  const isPost = post.type === "post";
  // Draf dan pratinjau tidak dapat gambar khusus: rute /og/ hanya melayani tulisan terbit
  const image = preview ? undefined : { url: ogImagePath(post, s.site_title), alt: post.title };
  return {
    title: post.title,
    description,
    alternates: { canonical: postPath(post.slug) },
    robots: preview ? { index: false, follow: false } : undefined,
    ...shareMeta({
      title: post.title,
      description,
      path: postPath(post.slug),
      image,
      article: isPost
        ? {
            publishedTime: post.published_at ?? undefined,
            modifiedTime: post.updated_at,
            authors: post.author ? [siteUrl(`/author/${post.author.slug}/`)] : undefined,
            tags: post.tags.map((t) => t.name),
          }
        : undefined,
    }),
  };
}

export default async function PostPage({ params }: Props) {
  const found = await load((await params).slug);
  if (!found) notFound();
  const { post, preview } = found;
  const s = siteSettings();
  const isPost = post.type === "post";
  const comments = isPost ? listApproved(post.id) : [];
  const commentsOpen = isPost && !preview && post.allow_comments === 1 && s.comments_enabled === "1";
  const refs = isPost ? referencesHtml(post.references_text) : "";
  const more = isPost ? listPublished({ page: 1, perPage: 5, excludeId: post.id }).items : [];

  const jsonLd = isPost
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: excerptOf(post, 200),
        image: [post.feature_image ? siteUrl(post.feature_image) : siteUrl(ogImagePath(post, s.site_title))],
        datePublished: post.published_at,
        dateModified: post.updated_at,
        author: post.author ? { "@type": "Person", name: post.author.name, url: siteUrl(`/author/${post.author.slug}/`) } : undefined,
        publisher: { "@type": "Organization", name: s.site_title, url: siteUrl("/") },
        mainEntityOfPage: siteUrl(postPath(post.slug)),
        inLanguage: "id-ID",
        keywords: post.tags.map((t) => t.name).join(", ") || undefined,
      }
    : null;

  return (
    <>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} /> : null}
      {preview ? (
        <p className="form-msg" style={{ margin: "16px var(--margin) 0" }} role="status">
          Pratinjau: tulisan ini belum tampil untuk pembaca. <a className="textlink" href={`/admin/tulisan/${post.id}/`}>Kembali ke editor</a>
        </p>
      ) : null}
      <article className="article" data-post-id={isPost && !preview ? post.id : undefined}>
        <header className="article-head">
          <h1 className="article-title js-lines js-fit-title">{post.title}</h1>
          {isPost ? (
            <div className="article-meta reveal">
              {post.author ? <a className="article-author" href={`/author/${post.author.slug}/`}>{post.author.name}</a> : null}
              <span><time dateTime={post.published_at ?? ""}>{formatTanggal(post.published_at) || "Belum terbit"}</time></span>
              <span>{readingMinutes(post.plain_text)} menit baca</span>
              {post.tags[0] ? <a className="article-tag" href={`/tag/${post.tags[0].slug}/`}>{post.tags[0].name}</a> : null}
            </div>
          ) : null}
          {post.excerpt ? <p className="article-lede reveal">{post.excerpt}</p> : null}
        </header>

        {post.feature_image ? (
          <figure className="article-figure">
            <img src={post.feature_image} srcSet={imgSrcSet(post.feature_image)} sizes="(min-width: 1100px) 1100px, 100vw"
              alt={post.feature_image_alt || post.title} width={2000} height={1250} fetchPriority="high" />
            {post.feature_image_caption ? <figcaption>{post.feature_image_caption}</figcaption> : null}
          </figure>
        ) : null}

        <div className="gh-content article-body" dangerouslySetInnerHTML={{ __html: numberFigures(post.content_html) }} />

        {refs ? (
          <section className="references" aria-labelledby="ref-title">
            <h2 className="references-title" id="ref-title">Daftar Pustaka</h2>
            <ol className="ref-list" dangerouslySetInnerHTML={{ __html: refs }} />
          </section>
        ) : null}

        {isPost && post.tags.length ? (
          <footer className="article-end reveal">
            <p className="article-tags">
              Tag:{" "}
              {post.tags.map((t, i) => (
                <span key={t.id}>
                  <a className="textlink" href={`/tag/${t.slug}/`}>{t.name}</a>
                  {i < post.tags.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          </footer>
        ) : null}

        {isPost && !preview ? (
          <div className="article-end">
            <ShareButtons title={post.title} url={siteUrl(postPath(post.slug))} />
          </div>
        ) : null}

        {isPost && (commentsOpen || comments.length) ? (
          <section className="comments" aria-labelledby="comments-title">
            <h2 className="comments-title" id="comments-title">Komentar{comments.length ? ` (${comments.length})` : ""}</h2>
            {comments.length ? (
              comments.map((c) => (
                <div className="comment" key={c.id}>
                  <p className="comment-head"><strong>{c.name}</strong>{formatTanggal(c.created_at)}</p>
                  <p className="comment-body">{c.body}</p>
                </div>
              ))
            ) : (
              <p className="comment-empty">Belum ada komentar. Jadilah yang pertama.</p>
            )}
            {commentsOpen ? <CommentForm postId={post.id} /> : <p className="form-note">Komentar untuk tulisan ini sudah ditutup.</p>}
          </section>
        ) : null}
      </article>

      {more.length ? (
        <section className="archive archive-more" aria-labelledby="more-title">
          <div className="archive-col">
            <h2 className="archive-title reveal" id="more-title">Tulisan lainnya</h2>
            <ol className="rows">{more.map((p) => <Row key={p.id} post={p} />)}</ol>
          </div>
        </section>
      ) : null}
    </>
  );
}
