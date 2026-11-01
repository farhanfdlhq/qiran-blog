import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTagBySlug, listPublished } from "@/lib/posts";
import { siteSettings } from "@/lib/settings";
import { ArchiveList } from "@/components/PostList";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tag = getTagBySlug((await params).slug);
  if (!tag) return {};
  return { title: `Topik ${tag.name}`, description: tag.description || undefined, alternates: { canonical: `/tag/${tag.slug}/` } };
}

export default async function TagPage({ params }: Props) {
  const tag = getTagBySlug((await params).slug);
  if (!tag) notFound();
  const { items, total } = listPublished({ page: 1, tagSlug: tag.slug, perPage: 200 });
  const s = siteSettings();
  return (
    <ArchiveList posts={items} title={`Tulisan bertopik ${tag.name}`} titleTag="h1" top
      lead={<p className="lead-soft">{tag.description || `Semua tulisan di ${s.site_title} dengan topik ${tag.name}.`} {total ? `Ada ${total} tulisan.` : "Belum ada tulisan."}</p>} />
  );
}
